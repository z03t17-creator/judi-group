"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidateDebtsDirectory } from "@/lib/reports/debts-load";
import { updateStoreContactSchema, storeContactSchema } from "@/lib/validators";
import { z } from "zod";

type FieldReturnTo = "customers" | "prospects" | "settings" | "new";

function parseReturnTo(value: FormDataEntryValue | null): FieldReturnTo {
  if (value === "prospects" || value === "settings" || value === "new") return value;
  return "customers";
}

async function fieldPath(to: FieldReturnTo, query?: string) {
  const locale = await getLocale();
  const base =
    to === "prospects"
      ? `/${locale}/field/prospects`
      : to === "settings"
        ? `/${locale}/field/settings`
        : to === "new"
          ? `/${locale}/field/customers/new`
          : `/${locale}/field/customers`;
  return query ? `${base}?${query}` : base;
}

function contactData(input: {
  storeName: string;
  ownerName?: string;
  phone: string;
  email?: string;
  address?: string;
  tier: "WHOLESALE" | "SUPERMARKET" | "MINIMARKET";
  status: "ACTIVE" | "INACTIVE" | "PROSPECT";
  latitude?: number;
  longitude?: number;
}) {
  return {
    storeName: input.storeName.trim(),
    ownerName: input.ownerName?.trim() ? input.ownerName.trim() : null,
    phone: input.phone.trim(),
    email: input.email?.trim() ? input.email.trim().toLowerCase() : null,
    address: input.address?.trim() ? input.address.trim() : null,
    tier: input.tier,
    status: input.status,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}

function revalidateStorePaths(locale: string) {
  revalidatePath(`/${locale}/field/customers`);
  revalidatePath(`/${locale}/field/customers/new`);
  revalidatePath(`/${locale}/field/prospects`);
  revalidatePath(`/${locale}/field/settings`);
  revalidatePath(`/${locale}/field`);
  revalidatePath(`/${locale}/dashboard/stores`);
  revalidatePath(`/${locale}/dashboard/debts`);
  revalidateDebtsDirectory();
}

export async function createFieldStoreAction(formData: FormData): Promise<void> {
  await requireRole(["FIELD_DELEGATE"]);
  const returnTo = parseReturnTo(formData.get("returnTo"));

  const parsed = storeContactSchema.safeParse({
    storeName: formData.get("storeName"),
    ownerName: formData.get("ownerName") || "",
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    tier: formData.get("tier"),
    status: formData.get("status") || "ACTIVE",
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    redirect(await fieldPath(returnTo === "new" ? "new" : returnTo, "error=invalid"));
  }

  const created = await prisma.store.create({
    data: {
      ...contactData(parsed.data),
      creditLimit: 0,
      currentDebt: 0,
      creditLimitUsd: 0,
      currentDebtUsd: 0,
    },
  });

  const locale = await getLocale();
  revalidateStorePaths(locale);

  const dest: FieldReturnTo =
    parsed.data.status === "PROSPECT" ? "prospects" : "customers";
  redirect(await fieldPath(dest, `ok=created&focus=${created.id}`));
}

export async function updateFieldStoreAction(formData: FormData): Promise<void> {
  await requireRole(["FIELD_DELEGATE"]);
  const returnTo = parseReturnTo(formData.get("returnTo"));

  const parsed = updateStoreContactSchema.safeParse({
    id: formData.get("id"),
    storeName: formData.get("storeName"),
    ownerName: formData.get("ownerName") || "",
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    tier: formData.get("tier"),
    status: formData.get("status") || "ACTIVE",
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    redirect(await fieldPath(returnTo, "error=invalid"));
  }

  const { id, ...data } = parsed.data;
  await prisma.store.update({
    where: { id },
    data: contactData(data),
  });

  const locale = await getLocale();
  revalidateStorePaths(locale);
  redirect(await fieldPath(returnTo, "ok=updated"));
}

const gpsSchema = z.object({
  id: z.string().uuid(),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
});

export async function captureStoreGpsAction(formData: FormData): Promise<void> {
  await requireRole(["FIELD_DELEGATE"]);
  const returnTo = parseReturnTo(formData.get("returnTo"));

  const parsed = gpsSchema.safeParse({
    id: formData.get("id"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    redirect(await fieldPath(returnTo, "error=gps"));
  }

  await prisma.store.update({
    where: { id: parsed.data.id },
    data: {
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
    },
  });

  const locale = await getLocale();
  revalidateStorePaths(locale);
  redirect(await fieldPath(returnTo, "ok=gps"));
}

export async function convertProspectAction(formData: FormData): Promise<void> {
  await requireRole(["FIELD_DELEGATE"]);

  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) {
    redirect(await fieldPath("prospects", "error=invalid"));
  }

  await prisma.store.update({
    where: { id: id.data },
    data: { status: "ACTIVE" },
  });

  const locale = await getLocale();
  revalidateStorePaths(locale);
  redirect(await fieldPath("customers", `ok=converted&focus=${id.data}`));
}
