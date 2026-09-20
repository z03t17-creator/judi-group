"use client";

import type { InvoiceStatus, InvoiceType } from "@prisma/client";
import { Banknote, CalendarDays, Gift, UserRound, Warehouse } from "lucide-react";
import { useTranslations } from "next-intl";
import { JudiLogo } from "@/components/judi-logo";
import { Thumb } from "@/components/thumb";
import { formatNumber } from "@/lib/money";

export type InvoiceDocumentLine = {
  id: string;
  productName: string;
  sku: string;
  unitName: string;
  soldQty: string;
  giftQty: string;
  unitPriceLabel: string;
  lineTotalLabel: string;
  productThumbUrl: string | null;
};

export type InvoiceDocumentData = {
  invoiceNumber: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  dateYmd: string;
  warehouseName: string;
  storeName: string;
  storeThumbUrl: string | null;
  storePhone: string | null;
  storeAddress: string | null;
  delegateName: string;
  delegateThumbUrl: string | null;
  lines: InvoiceDocumentLine[];
  subTotalLabel: string;
  discountPercent: string;
  discountAmountLabel: string;
  totalAmountLabel: string;
  paidAmountLabel: string;
  debtAmountLabel: string;
  giftQtyTotal: string;
  /** Optional company branding from settings. */
  companyName?: string | null;
  companyTagline?: string | null;
  companyAddress?: string | null;
  companyPhone?: string | null;
  companyTaxId?: string | null;
  companyLogoUrl?: string | null;
};

const TYPE_BADGE: Record<InvoiceType, string> = {
  CASH: "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100",
  DEBT: "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
  GIFT_PROMOTION: "bg-violet-100 text-violet-950 dark:bg-violet-950/50 dark:text-violet-100",
  RETURN: "bg-rose-100 text-rose-950 dark:bg-rose-950/50 dark:text-rose-100",
};

const STATUS_BADGE: Record<InvoiceStatus, string> = {
  COMPLETED: "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100",
  PENDING_APPROVAL: "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
  CANCELLED: "bg-rose-100 text-rose-950 dark:bg-rose-950/50 dark:text-rose-100",
};

export function InvoiceTypeBadge({ type }: { type: InvoiceType }) {
  const t = useTranslations("invoices");
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-semibold ${TYPE_BADGE[type]}`}
    >
      {t(`types.${type}`)}
    </span>
  );
}

export function InvoiceStatusBadge({ status }: { status: InvoiceStatus }) {
  const t = useTranslations("invoices");
  return (
    <span
      className={`inline-flex min-h-8 items-center rounded-lg px-2 text-xs font-semibold ${STATUS_BADGE[status]}`}
    >
      {t(`statuses.${status}`)}
    </span>
  );
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceDocumentData }) {
  const t = useTranslations("invoices");
  const giftTotal = Number(invoice.giftQtyTotal);
  const hasGifts = Number.isFinite(giftTotal) && giftTotal > 0;
  const discountPct = formatNumber(invoice.discountPercent, { fractionDigits: 2 });

  return (
    <section className="invoice-print space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4 text-start">
        <div className="flex min-w-0 items-start gap-3">
          {invoice.companyLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={invoice.companyLogoUrl}
              alt=""
              className="size-12 shrink-0 rounded-xl border border-line object-contain bg-muted"
            />
          ) : (
            <JudiLogo href={null} size="md" tone="surface" />
          )}
          {invoice.companyName || invoice.companyTagline || invoice.companyTaxId ? (
            <div className="min-w-0">
              {invoice.companyName ? (
                <p className="text-lg font-bold tracking-tight text-fg break-words">
                  {invoice.companyName}
                </p>
              ) : null}
              {invoice.companyTagline ? (
                <p className="text-sm text-fg-muted break-words">{invoice.companyTagline}</p>
              ) : null}
              {invoice.companyAddress ? (
                <p className="mt-1 text-xs text-fg-muted break-words">{invoice.companyAddress}</p>
              ) : null}
              <p className="mt-0.5 text-xs text-fg-muted">
                {[invoice.companyPhone, invoice.companyTaxId ? `${t("taxId")}: ${invoice.companyTaxId}` : null]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}
        </div>
        <div className="min-w-0 text-start sm:text-end">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            {t("detailTitle")}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-fg sm:text-2xl">
            {invoice.invoiceNumber}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:justify-end">
            <InvoiceTypeBadge type={invoice.invoiceType} />
            <InvoiceStatusBadge status={invoice.status} />
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="flex items-start gap-3 rounded-xl border border-line bg-muted/40 p-3 text-start print:bg-white">
          <Thumb
            kind="store"
            size="md"
            src={invoice.storeThumbUrl}
            alt=""
          />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              {t("store")}
            </p>
            <p className="font-semibold text-fg break-words">{invoice.storeName}</p>
            {invoice.storePhone ? (
              <p className="mt-0.5 text-sm tabular-nums text-fg-muted">{invoice.storePhone}</p>
            ) : null}
            {invoice.storeAddress ? (
              <p className="mt-0.5 text-sm text-fg-muted">{invoice.storeAddress}</p>
            ) : null}
          </div>
        </article>

        <article className="space-y-2 rounded-xl border border-line bg-muted/40 p-3 text-start print:bg-white">
          <div className="flex items-center gap-2">
            <Thumb
              kind="person"
              size="sm"
              src={invoice.delegateThumbUrl}
              alt=""
              icon={UserRound}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
                {t("delegate")}
              </p>
              <p className="truncate font-semibold text-fg">{invoice.delegateName}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Warehouse className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            <span>{invoice.warehouseName}</span>
          </p>
          <p className="flex items-center gap-2 text-sm tabular-nums text-fg-muted">
            <CalendarDays className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            <span>{invoice.dateYmd}</span>
          </p>
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Banknote className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            <span>
              {invoice.currency === "USD" || invoice.currency === "IQD"
                ? t(`currencies.${invoice.currency}`)
                : invoice.currency}
            </span>
          </p>
        </article>
      </div>

      <div className="space-y-2">
        <h2 className="text-start text-sm font-semibold text-fg">{t("lines")}</h2>

        <ul className="space-y-2 md:hidden print:hidden" role="list">
          {invoice.lines.map((line) => (
            <li
              key={line.id}
              className="flex items-start gap-3 rounded-xl border border-line bg-muted/30 p-3 text-start print:bg-white"
            >
              <Thumb
                kind="product"
                size="md"
                src={line.productThumbUrl}
                alt=""
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fg">{line.productName}</p>
                <p className="text-sm text-fg-subtle">
                  <span className="tabular-nums">{line.sku}</span>
                  {" · "}
                  {line.unitName}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                  <span className="tabular-nums">
                    {t("quantity")}: {formatNumber(line.soldQty)}
                  </span>
                  {Number(line.giftQty) > 0 ? (
                    <span className="inline-flex min-h-8 items-center gap-1 rounded-lg bg-judi-100 px-2 text-xs font-semibold text-judi-900 dark:bg-judi-950/60 dark:text-judi-100">
                      <Gift className="size-3.5" aria-hidden />
                      {t("giftQty", { qty: formatNumber(line.giftQty) })}
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-sm text-fg-muted" dir="ltr">
                  {t("unitPrice")}: {line.unitPriceLabel}
                </p>
              </div>
              <p className="shrink-0 text-end text-base font-bold tabular-nums text-fg" dir="ltr">
                {line.lineTotalLabel}
              </p>
            </li>
          ))}
        </ul>

        <div className="hidden overflow-x-auto rounded-xl border border-line md:block print:block">
          <table className="w-full min-w-0 text-start text-sm">
            <thead className="border-b border-line bg-muted/50 text-fg-muted">
              <tr>
                <th className="px-3 py-3 font-medium" scope="col">
                  {t("product")}
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  {t("unit")}
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  {t("quantity")}
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  {t("unitPrice")}
                </th>
                <th className="px-3 py-3 font-medium" scope="col">
                  {t("lineTotal")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {invoice.lines.map((line) => (
                <tr key={line.id} className="min-h-touch">
                  <td className="px-3 py-2">
                    <div className="flex min-h-touch items-center gap-2.5">
                      <Thumb
                        kind="product"
                        size="xs"
                        src={line.productThumbUrl}
                        alt=""
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-fg">{line.productName}</span>
                        <span className="block text-xs tabular-nums text-fg-subtle">{line.sku}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-fg-muted">{line.unitName}</td>
                  <td className="px-3 py-2">
                    <span className="tabular-nums text-fg">{formatNumber(line.soldQty)}</span>
                    {Number(line.giftQty) > 0 ? (
                      <span className="ms-2 inline-flex min-h-8 items-center gap-1 rounded-lg bg-judi-100 px-2 text-xs font-semibold text-judi-900 dark:bg-judi-950/60 dark:text-judi-100">
                        <Gift className="size-3.5" aria-hidden />
                        {t("giftQty", { qty: formatNumber(line.giftQty) })}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-fg-muted" dir="ltr">{line.unitPriceLabel}</td>
                  <td className="px-3 py-2 font-semibold tabular-nums text-fg" dir="ltr">
                    {line.lineTotalLabel}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="ms-auto w-full max-w-md space-y-2 rounded-xl border border-line bg-muted/40 p-4 text-start print:bg-white">
        <TotalsRow label={t("subtotal")} value={invoice.subTotalLabel} />
        <TotalsRow
          label={`${t("discountAmount")} (${discountPct}%)`}
          value={invoice.discountAmountLabel}
        />
        {hasGifts ? (
          <p className="flex items-center gap-2 text-sm text-fg-muted">
            <Gift className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            {t("giftsNote", { count: formatNumber(invoice.giftQtyTotal) })}
          </p>
        ) : null}
        <TotalsRow label={t("grandTotal")} value={invoice.totalAmountLabel} emphasize />
        <TotalsRow label={t("paid")} value={invoice.paidAmountLabel} />
        <TotalsRow label={t("debt")} value={invoice.debtAmountLabel} />
      </aside>
    </section>
  );
}

function TotalsRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-sm ${emphasize ? "font-semibold text-fg" : "text-fg-muted"}`}>
        {label}
      </span>
      <span
        dir="ltr"
        className={`tabular-nums ${
          emphasize ? "text-lg font-bold text-fg sm:text-xl" : "text-sm font-medium text-fg"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
