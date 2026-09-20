import { prisma } from "@/lib/prisma";
import type { AppLocale } from "@/lib/constants";

export const COMPANY_PROFILE_ID = "default";

export type CompanyProfileDto = {
  id: string;
  nameEn: string;
  nameAr: string;
  nameCkb: string;
  taglineEn: string;
  taglineAr: string;
  taglineCkb: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
  invoicePadWidth: number;
};

const DEFAULTS: Omit<CompanyProfileDto, "id"> = {
  nameEn: "Judi",
  nameAr: "جودي",
  nameCkb: "جودی",
  taglineEn: "Distribution & Inventory ERP",
  taglineAr: "نظام التوزيع والمخزون",
  taglineCkb: "سیستەمی دابەشکردن و کۆگا",
  address: null,
  phone: null,
  email: null,
  taxId: null,
  logoUrl: null,
  invoicePrefix: "INV",
  invoicePadWidth: 6,
};

function toDto(row: {
  id: string;
  nameEn: string;
  nameAr: string;
  nameCkb: string;
  taglineEn: string;
  taglineAr: string;
  taglineCkb: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  taxId: string | null;
  logoUrl: string | null;
  invoicePrefix: string;
  invoicePadWidth: number;
}): CompanyProfileDto {
  return {
    id: row.id,
    nameEn: row.nameEn,
    nameAr: row.nameAr,
    nameCkb: row.nameCkb,
    taglineEn: row.taglineEn,
    taglineAr: row.taglineAr,
    taglineCkb: row.taglineCkb,
    address: row.address,
    phone: row.phone,
    email: row.email,
    taxId: row.taxId,
    logoUrl: row.logoUrl,
    invoicePrefix: row.invoicePrefix,
    invoicePadWidth: row.invoicePadWidth,
  };
}

/** Ensure the singleton row exists, then return it. */
export async function getCompanyProfile(): Promise<CompanyProfileDto> {
  const existing = await prisma.companyProfile.findUnique({
    where: { id: COMPANY_PROFILE_ID },
  });
  if (existing) return toDto(existing);

  const created = await prisma.companyProfile.create({
    data: { id: COMPANY_PROFILE_ID },
  });
  return toDto(created);
}

export function companyDisplayName(
  profile: Pick<CompanyProfileDto, "nameEn" | "nameAr" | "nameCkb">,
  locale: string,
): string {
  const key = (locale as AppLocale) in { en: 1, ar: 1, ckb: 1 } ? (locale as AppLocale) : "en";
  const pick =
    key === "ar"
      ? profile.nameAr
      : key === "ckb"
        ? profile.nameCkb
        : profile.nameEn;
  return pick.trim() || profile.nameEn.trim() || DEFAULTS.nameEn;
}

export function companyTagline(
  profile: Pick<CompanyProfileDto, "taglineEn" | "taglineAr" | "taglineCkb">,
  locale: string,
): string {
  const key = (locale as AppLocale) in { en: 1, ar: 1, ckb: 1 } ? (locale as AppLocale) : "en";
  const pick =
    key === "ar"
      ? profile.taglineAr
      : key === "ckb"
        ? profile.taglineCkb
        : profile.taglineEn;
  return pick.trim() || profile.taglineEn.trim() || "";
}

export function sanitizeInvoicePrefix(raw: string): string {
  const cleaned = raw.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 12) || "INV";
}

export function clampInvoicePadWidth(raw: number): number {
  if (!Number.isFinite(raw)) return 6;
  return Math.min(10, Math.max(3, Math.round(raw)));
}
