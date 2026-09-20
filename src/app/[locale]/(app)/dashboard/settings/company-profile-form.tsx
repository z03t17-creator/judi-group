"use client";

import { useActionState, useState } from "react";
import { Building2, ImagePlus, Save } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CompanyProfileDto } from "@/lib/company-profile";
import {
  clearCompanyLogoAction,
  updateCompanyProfileAction,
  type CompanyProfileActionState,
} from "./company-actions";

type CompanyProfileFormProps = {
  profile: CompanyProfileDto;
  canEdit: boolean;
};

const initialState: CompanyProfileActionState = { ok: false };

export function CompanyProfileForm({ profile, canEdit }: CompanyProfileFormProps) {
  const t = useTranslations("settings");
  const [logoPreview, setLogoPreview] = useState(profile.logoUrl);
  const [state, formAction, pending] = useActionState(
    updateCompanyProfileAction,
    initialState,
  );
  const [clearState, clearAction, clearPending] = useActionState(
    clearCompanyLogoAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-fg-muted text-start">{t("companyHint")}</p>

      {(state.message || clearState.message) && (
        <p
          className={`rounded-xl px-3 py-2 text-sm text-start ${
            state.ok || clearState.ok
              ? "bg-judi-100 text-judi-950 dark:bg-judi-950/40 dark:text-judi-100"
              : "bg-rose-100 text-rose-950 dark:bg-rose-950/40 dark:text-rose-100"
          }`}
          role="status"
        >
          {state.message || clearState.message}
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <fieldset disabled={!canEdit || pending} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyNameEn")}</span>
              <input
                name="nameEn"
                required
                defaultValue={profile.nameEn}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyNameAr")}</span>
              <input
                name="nameAr"
                required
                defaultValue={profile.nameAr}
                dir="rtl"
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyNameCkb")}</span>
              <input
                name="nameCkb"
                required
                defaultValue={profile.nameCkb}
                dir="rtl"
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyTaglineEn")}</span>
              <input
                name="taglineEn"
                defaultValue={profile.taglineEn}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyTaglineAr")}</span>
              <input
                name="taglineAr"
                defaultValue={profile.taglineAr}
                dir="rtl"
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyTaglineCkb")}</span>
              <input
                name="taglineCkb"
                defaultValue={profile.taglineCkb}
                dir="rtl"
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5 text-start sm:col-span-2">
              <span className="text-sm font-medium text-fg">{t("companyAddress")}</span>
              <input
                name="address"
                defaultValue={profile.address ?? ""}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyPhone")}</span>
              <input
                name="phone"
                defaultValue={profile.phone ?? ""}
                inputMode="tel"
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg tabular-nums"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyEmail")}</span>
              <input
                name="email"
                type="email"
                defaultValue={profile.email ?? ""}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyTaxId")}</span>
              <input
                name="taxId"
                defaultValue={profile.taxId ?? ""}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg"
              />
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyInvoicePrefix")}</span>
              <input
                name="invoicePrefix"
                required
                defaultValue={profile.invoicePrefix}
                maxLength={12}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg uppercase tabular-nums"
              />
              <span className="text-xs text-fg-muted">{t("companyInvoicePrefixHint")}</span>
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("companyInvoicePad")}</span>
              <input
                name="invoicePadWidth"
                type="number"
                min={3}
                max={10}
                required
                defaultValue={profile.invoicePadWidth}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas px-3 text-fg tabular-nums"
              />
              <span className="text-xs text-fg-muted">{t("companyInvoicePadHint")}</span>
            </label>
          </div>

          <div className="flex flex-wrap items-end gap-4 text-start">
            <div className="flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-line bg-muted">
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoPreview}
                  alt=""
                  className="size-full object-contain"
                />
              ) : (
                <Building2 className="size-8 text-fg-subtle" aria-hidden />
              )}
            </div>
            <label className="block min-w-[12rem] flex-1 space-y-1.5">
              <span className="flex items-center gap-2 text-sm font-medium text-fg">
                <ImagePlus className="size-4" aria-hidden />
                {t("companyLogo")}
              </span>
              <input
                name="logo"
                type="file"
                accept="image/jpeg"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) setLogoPreview(URL.createObjectURL(file));
                }}
                className="block w-full text-sm text-fg file:me-3 file:min-h-touch file:rounded-xl file:border-0 file:bg-judi-800 file:px-3 file:text-sm file:font-medium file:text-white"
              />
              <span className="text-xs text-fg-muted">{t("companyLogoHint")}</span>
            </label>
          </div>

          {canEdit ? (
            <button
              type="submit"
              className="btn btn-important"
              disabled={pending}
            >
              <Save className="size-4" aria-hidden />
              {pending ? t("companySaving") : t("companySave")}
            </button>
          ) : (
            <p className="text-sm text-fg-muted">{t("companyAdminOnly")}</p>
          )}
        </fieldset>
      </form>

      {canEdit && profile.logoUrl ? (
        <form action={clearAction}>
          <button
            type="submit"
            disabled={clearPending}
            className="inline-flex min-h-touch items-center rounded-xl border border-line px-3 text-sm font-medium text-fg hover:bg-muted disabled:opacity-60"
          >
            {t("companyLogoClear")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
