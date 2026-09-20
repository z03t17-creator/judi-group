"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { revalidateDebtsDirectory } from "@/lib/reports/debts-load";
import { createStoreSchema, updateStoreSchema } from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function storesPath(query?: string) {
  const locale = await getLocale();
  return query ? `/${locale}/dashboard/stores?${query}` : `/${locale}/dashboard/stores`;
}

function toStoreData(input: {
  storeName: string;
  ownerName?: string;
  phone: string;
  email?: string;
  address?: string;
  tier: "WHOLESALE" | "SUPERMARKET" | "MINIMARKET";
  status: "ACTIVE" | "INACTIVE" | "PROSPECT";
  creditLimit: number;
  creditLimitUsd: number;
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
    creditLimit: input.creditLimit,
    creditLimitUsd: input.creditLimitUsd,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}

export async function createStoreAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);

  const parsed = createStoreSchema.safeParse({
    storeName: formData.get("storeName"),
    ownerName: formData.get("ownerName") || "",
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    tier: formData.get("tier"),
    status: formData.get("status"),
    creditLimit: formData.get("creditLimit"),
    creditLimitUsd: formData.get("creditLimitUsd"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    redirect(await storesPath("error=invalid"));
  }

  const created = await prisma.store.create({ data: toStoreData(parsed.data) });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/stores`);
  revalidatePath(`/${locale}/dashboard/debts`);
  revalidateDebtsDirectory();
  revalidatePath(`/${locale}/field/customers`);
  redirect(await storesPath(`ok=created&focus=${created.id}`));
}

export async function updateStoreAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);

  const parsed = updateStoreSchema.safeParse({
    id: formData.get("id"),
    storeName: formData.get("storeName"),
    ownerName: formData.get("ownerName") || "",
    phone: formData.get("phone"),
    email: formData.get("email") || "",
    address: formData.get("address") || "",
    tier: formData.get("tier"),
    status: formData.get("status"),
    creditLimit: formData.get("creditLimit"),
    creditLimitUsd: formData.get("creditLimitUsd"),
    latitude: formData.get("latitude"),
    longitude: formData.get("longitude"),
  });

  if (!parsed.success) {
    redirect(await storesPath("error=invalid"));
  }

  const { id, ...data } = parsed.data;
  await prisma.store.update({ where: { id }, data: toStoreData(data) });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/stores`);
  revalidatePath(`/${locale}/dashboard/debts`);
  revalidateDebtsDirectory();
  revalidatePath(`/${locale}/field/customers`);
  redirect(await storesPath("ok=updated"));
}

export async function deleteStoreAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await storesPath("error=invalid"));

  const store = await prisma.store.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          invoices: true,
          transactions: true,
          storePlacements: true,
        },
      },
      storeInventories: {
        where: { baseQty: { gt: 0 } },
        take: 1,
        select: { id: true },
      },
    },
  });
  if (!store) redirect(await storesPath("error=invalid"));
  if (
    store._count.invoices > 0 ||
    store._count.transactions > 0 ||
    store._count.storePlacements > 0 ||
    store.storeInventories.length > 0
  ) {
    redirect(await storesPath("error=inUse"));
  }

  await prisma.store.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/stores`);
  revalidatePath(`/${locale}/dashboard/debts`);
  revalidateDebtsDirectory();
  revalidatePath(`/${locale}/field/customers`);
  redirect(await storesPath("ok=deleted"));
}
