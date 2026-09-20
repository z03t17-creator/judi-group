"use server";

import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import {
  COMPANY_PROFILE_ID,
  clampInvoicePadWidth,
  sanitizeInvoicePrefix,
} from "@/lib/company-profile";
import { MEDIA_UPLOAD_DIR, ensureUploadDir } from "@/lib/media";
import { mediaFileUrl } from "@/lib/media-shared";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";

export type CompanyProfileActionState = {
  ok: boolean;
  message?: string;
};

const profileSchema = z.object({
  nameEn: z.string().trim().min(1).max(120),
  nameAr: z.string().trim().min(1).max(120),
  nameCkb: z.string().trim().min(1).max(120),
  taglineEn: z.string().trim().max(200).optional(),
  taglineAr: z.string().trim().max(200).optional(),
  taglineCkb: z.string().trim().max(200).optional(),
  address: z.string().trim().max(300).optional(),
  phone: z.string().trim().max(40).optional(),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "email"),
  taxId: z.string().trim().max(80).optional(),
  invoicePrefix: z.string().trim().min(1).max(12),
  invoicePadWidth: z.coerce.number().int().min(3).max(10),
});

async function requireAdmin() {
  const session = await requireOfficeSession();
  if (session.user.role !== "ADMIN") {
    return null;
  }
  return session;
}

export async function updateCompanyProfileAction(
  _prev: CompanyProfileActionState,
  formData: FormData,
): Promise<CompanyProfileActionState> {
  const session = await requireAdmin();
  const t = await getTranslations("settings");
  const locale = await getLocale();

  if (!session) {
    return { ok: false, message: t("companyErrorForbidden") };
  }

  const parsed = profileSchema.safeParse({
    nameEn: formData.get("nameEn"),
    nameAr: formData.get("nameAr"),
    nameCkb: formData.get("nameCkb"),
    taglineEn: formData.get("taglineEn") || undefined,
    taglineAr: formData.get("taglineAr") || undefined,
    taglineCkb: formData.get("taglineCkb") || undefined,
    address: formData.get("address") || undefined,
    phone: formData.get("phone") || undefined,
    email: formData.get("email") || undefined,
    taxId: formData.get("taxId") || undefined,
    invoicePrefix: formData.get("invoicePrefix"),
    invoicePadWidth: formData.get("invoicePadWidth"),
  });

  if (!parsed.success) {
    return { ok: false, message: t("companyErrorInvalid") };
  }

  let logoUrl: string | undefined;
  const logo = formData.get("logo");
  if (logo instanceof File && logo.size > 0) {
    if (logo.size > 2_000_000) {
      return { ok: false, message: t("companyErrorLogoLarge") };
    }
    const type = logo.type.toLowerCase();
    if (type !== "image/jpeg" && type !== "image/jpg") {
      return { ok: false, message: t("companyErrorLogoType") };
    }
    await ensureUploadDir();
    const fileName = `${randomUUID()}.jpg`;
    const bytes = Buffer.from(await logo.arrayBuffer());
    await writeFile(path.join(MEDIA_UPLOAD_DIR, fileName), bytes);
    logoUrl = mediaFileUrl(fileName);
  }

  const data = parsed.data;
  await prisma.companyProfile.upsert({
    where: { id: COMPANY_PROFILE_ID },
    create: {
      id: COMPANY_PROFILE_ID,
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      nameCkb: data.nameCkb,
      taglineEn: data.taglineEn || "",
      taglineAr: data.taglineAr || "",
      taglineCkb: data.taglineCkb || "",
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      taxId: data.taxId || null,
      logoUrl: logoUrl ?? null,
      invoicePrefix: sanitizeInvoicePrefix(data.invoicePrefix),
      invoicePadWidth: clampInvoicePadWidth(data.invoicePadWidth),
    },
    update: {
      nameEn: data.nameEn,
      nameAr: data.nameAr,
      nameCkb: data.nameCkb,
      taglineEn: data.taglineEn || "",
      taglineAr: data.taglineAr || "",
      taglineCkb: data.taglineCkb || "",
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      taxId: data.taxId || null,
      ...(logoUrl ? { logoUrl } : {}),
      invoicePrefix: sanitizeInvoicePrefix(data.invoicePrefix),
      invoicePadWidth: clampInvoicePadWidth(data.invoicePadWidth),
    },
  });

  revalidatePath(`/${locale}/dashboard/settings`);
  revalidatePath(`/${locale}/dashboard/invoices`);
  return { ok: true, message: t("companySaved") };
}

export async function clearCompanyLogoAction(
  _prev: CompanyProfileActionState,
  _formData: FormData,
): Promise<CompanyProfileActionState> {
  const session = await requireAdmin();
  const t = await getTranslations("settings");
  const locale = await getLocale();

  if (!session) {
    return { ok: false, message: t("companyErrorForbidden") };
  }

  await prisma.companyProfile.update({
    where: { id: COMPANY_PROFILE_ID },
    data: { logoUrl: null },
  });

  revalidatePath(`/${locale}/dashboard/settings`);
  return { ok: true, message: t("companyLogoCleared") };
}
