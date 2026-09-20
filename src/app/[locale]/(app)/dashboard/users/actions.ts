"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createUserSchema, updateUserSchema } from "@/lib/validators";

function emptyToNull(value?: string) {
  return value ? value : null;
}

async function usersPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/users?${query}`
    : `/${locale}/dashboard/users`;
}

export async function createUserAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const parsed = createUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role"),
    maxDiscountAllowed: formData.get("maxDiscountAllowed"),
    assignedWarehouseId: formData.get("assignedWarehouseId") || "",
  });

  if (!parsed.success) {
    redirect(await usersPath("error=invalid"));
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase().trim() },
  });
  if (existing) {
    redirect(await usersPath("error=emailTaken"));
  }

  const created = await prisma.user.create({
    data: {
      email: parsed.data.email.toLowerCase().trim(),
      passwordHash: await hash(parsed.data.password, 12),
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      maxDiscountAllowed: parsed.data.maxDiscountAllowed,
      assignedWarehouseId: emptyToNull(parsed.data.assignedWarehouseId),
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/users`);
  redirect(await usersPath(`ok=created&focus=${created.id}`));
}

export async function updateUserAction(formData: FormData): Promise<void> {
  await requireRole(["ADMIN"]);

  const parsed = updateUserSchema.safeParse({
    id: formData.get("id"),
    fullName: formData.get("fullName"),
    phone: formData.get("phone") || undefined,
    role: formData.get("role"),
    maxDiscountAllowed: formData.get("maxDiscountAllowed"),
    assignedWarehouseId: formData.get("assignedWarehouseId") || "",
    password: formData.get("password") || "",
  });

  if (!parsed.success) {
    redirect(await usersPath("error=invalid"));
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      fullName: parsed.data.fullName,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      maxDiscountAllowed: parsed.data.maxDiscountAllowed,
      assignedWarehouseId: emptyToNull(parsed.data.assignedWarehouseId),
      ...(parsed.data.password
        ? { passwordHash: await hash(parsed.data.password, 12) }
        : {}),
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/users`);
  redirect(await usersPath("ok=updated"));
}

export async function deleteUserAction(formData: FormData): Promise<void> {
  const session = await requireRole(["ADMIN"]);
  const id = String(formData.get("id") ?? "");

  if (!id) redirect(await usersPath("error=invalid"));
  if (id === session.user.id) redirect(await usersPath("error=cannotDeleteSelf"));

  await prisma.user.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/users`);
  redirect(await usersPath("ok=deleted"));
}
