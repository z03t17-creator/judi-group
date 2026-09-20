"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { createWarehouseSchema, updateWarehouseSchema } from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function warehousesPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/warehouses?${query}`
    : `/${locale}/dashboard/warehouses`;
}

export async function createWarehouseAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);

  const parsed = createWarehouseSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
    type: formData.get("type"),
    licensePlate: formData.get("licensePlate") || undefined,
  });

  if (!parsed.success) {
    redirect(await warehousesPath("error=invalid"));
  }

  await prisma.warehouse.create({
    data: {
      name: {
        en: parsed.data.nameEn,
        ar: parsed.data.nameAr,
        ckb: parsed.data.nameCkb,
      },
      type: parsed.data.type,
      licensePlate: parsed.data.licensePlate || null,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/warehouses`);
  redirect(await warehousesPath("ok=created"));
}

export async function updateWarehouseAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);

  const parsed = updateWarehouseSchema.safeParse({
    id: formData.get("id"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
    type: formData.get("type"),
    licensePlate: formData.get("licensePlate") || undefined,
  });

  if (!parsed.success) {
    redirect(await warehousesPath("error=invalid"));
  }

  await prisma.warehouse.update({
    where: { id: parsed.data.id },
    data: {
      name: {
        en: parsed.data.nameEn,
        ar: parsed.data.nameAr,
        ckb: parsed.data.nameCkb,
      },
      type: parsed.data.type,
      licensePlate: parsed.data.licensePlate || null,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/warehouses`);
  redirect(await warehousesPath("ok=updated"));
}

export async function deleteWarehouseAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await warehousesPath("error=invalid"));

  const warehouse = await prisma.warehouse.findUnique({
    where: { id },
    include: {
      _count: { select: { assignedUsers: true, inventories: true } },
    },
  });

  if (!warehouse) redirect(await warehousesPath("error=invalid"));
  if (warehouse._count.assignedUsers > 0) {
    redirect(await warehousesPath("error=hasUsers"));
  }
  if (warehouse._count.inventories > 0) {
    redirect(await warehousesPath("error=hasStock"));
  }

  await prisma.warehouse.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/warehouses`);
  redirect(await warehousesPath("ok=deleted"));
}
