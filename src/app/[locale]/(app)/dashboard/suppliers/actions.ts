"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { supplierInputSchema, updateSupplierSchema } from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function suppliersPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/suppliers?${query}`
    : `/${locale}/dashboard/suppliers`;
}

export async function createSupplierAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = supplierInputSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    notes: formData.get("notes") || "",
    active: formData.has("active") ? "true" : "false",
  });
  if (!parsed.success) redirect(await suppliersPath("error=invalid"));

  await prisma.supplier.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email ?? null,
      address: parsed.data.address?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      active: parsed.data.active,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/suppliers`);
  revalidatePath(`/${locale}/dashboard/purchases`);
  redirect(await suppliersPath("ok=created"));
}

export async function updateSupplierAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = updateSupplierSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    phone: formData.get("phone") || "",
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    notes: formData.get("notes") || "",
    active: formData.has("active") ? "true" : "false",
  });
  if (!parsed.success) redirect(await suppliersPath("error=invalid"));

  await prisma.supplier.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone?.trim() || null,
      email: parsed.data.email ?? null,
      address: parsed.data.address?.trim() || null,
      notes: parsed.data.notes?.trim() || null,
      active: parsed.data.active,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/suppliers`);
  revalidatePath(`/${locale}/dashboard/purchases`);
  redirect(await suppliersPath("ok=updated"));
}

export async function toggleSupplierAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("active") ?? "") === "true";
  if (!id) redirect(await suppliersPath("error=invalid"));

  await prisma.supplier.update({
    where: { id },
    data: { active: next },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/suppliers`);
  revalidatePath(`/${locale}/dashboard/purchases`);
  redirect(await suppliersPath(next ? "ok=activated" : "ok=paused"));
}

export async function deleteSupplierAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await suppliersPath("error=invalid"));

  const count = await prisma.purchaseOrder.count({ where: { supplierId: id } });
  if (count > 0) redirect(await suppliersPath("error=inUse"));

  await prisma.supplier.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/suppliers`);
  revalidatePath(`/${locale}/dashboard/purchases`);
  redirect(await suppliersPath("ok=deleted"));
}
