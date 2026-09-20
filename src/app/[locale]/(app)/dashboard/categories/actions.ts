"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import {
  categoryInputSchema,
  subcategoryInputSchema,
  updateCategorySchema,
  updateSubcategorySchema,
} from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function categoriesPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/categories?${query}`
    : `/${locale}/dashboard/categories`;
}

function localizedName(en: string, ar: string, ckb: string) {
  return { en: en.trim(), ar: ar.trim(), ckb: ckb.trim() };
}

export async function createCategoryAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = categoryInputSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
  });
  if (!parsed.success) redirect(await categoriesPath("error=invalid"));

  await prisma.productCategory.create({
    data: { name: localizedName(parsed.data.nameEn, parsed.data.nameAr, parsed.data.nameCkb) },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/categories`);
  revalidatePath(`/${locale}/dashboard/products`);
  redirect(await categoriesPath("ok=created"));
}

export async function updateCategoryAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = updateCategorySchema.safeParse({
    id: formData.get("id"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
  });
  if (!parsed.success) redirect(await categoriesPath("error=invalid"));

  await prisma.productCategory.update({
    where: { id: parsed.data.id },
    data: { name: localizedName(parsed.data.nameEn, parsed.data.nameAr, parsed.data.nameCkb) },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/categories`);
  revalidatePath(`/${locale}/dashboard/products`);
  redirect(await categoriesPath("ok=updated"));
}

export async function deleteCategoryAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await categoriesPath("error=invalid"));

  const count = await prisma.product.count({ where: { categoryId: id } });
  if (count > 0) redirect(await categoriesPath("error=inUse"));

  await prisma.productCategory.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/categories`);
  revalidatePath(`/${locale}/dashboard/products`);
  redirect(await categoriesPath("ok=deleted"));
}

export async function createSubcategoryAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = subcategoryInputSchema.safeParse({
    categoryId: formData.get("categoryId"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
  });
  if (!parsed.success) redirect(await categoriesPath("error=invalid"));

  await prisma.productSubcategory.create({
    data: {
      categoryId: parsed.data.categoryId,
      name: localizedName(parsed.data.nameEn, parsed.data.nameAr, parsed.data.nameCkb),
    },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/categories`);
  revalidatePath(`/${locale}/dashboard/products`);
  redirect(await categoriesPath("ok=subCreated"));
}

export async function updateSubcategoryAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = updateSubcategorySchema.safeParse({
    id: formData.get("id"),
    categoryId: formData.get("categoryId"),
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
  });
  if (!parsed.success) redirect(await categoriesPath("error=invalid"));

  await prisma.productSubcategory.update({
    where: { id: parsed.data.id },
    data: {
      categoryId: parsed.data.categoryId,
      name: localizedName(parsed.data.nameEn, parsed.data.nameAr, parsed.data.nameCkb),
    },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/categories`);
  revalidatePath(`/${locale}/dashboard/products`);
  redirect(await categoriesPath("ok=subUpdated"));
}

export async function deleteSubcategoryAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await categoriesPath("error=invalid"));

  const count = await prisma.product.count({ where: { subcategoryId: id } });
  if (count > 0) redirect(await categoriesPath("error=subInUse"));

  await prisma.productSubcategory.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/categories`);
  revalidatePath(`/${locale}/dashboard/products`);
  redirect(await categoriesPath("ok=subDeleted"));
}
