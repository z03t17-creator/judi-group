"use client";

import {
  Banknote,
  CalendarDays,
  Landmark,
  NotebookPen,
  ScrollText,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { JudiLogo } from "@/components/judi-logo";
import { Thumb } from "@/components/thumb";
import { isPaymentMethod, type PaymentMethod } from "@/lib/collection";

export type CollectionReceiptData = {
  receiptNumber: string;
  paymentMethod: string;
  currency: string;
  dateYmd: string;
  amountLabel: string;
  storeName: string;
  storeThumbUrl: string | null;
  storePhone: string | null;
  storeAddress: string | null;
  collectorName: string;
  collectorThumbUrl: string | null;
  notes: string | null;
  outstandingIqdLabel: string;
  outstandingUsdLabel: string;
};

const METHOD_BADGE: Record<PaymentMethod, string> = {
  CASH: "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100",
  BANK_TRANSFER: "bg-sky-100 text-sky-950 dark:bg-sky-950/50 dark:text-sky-100",
  CHECK: "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100",
};

const METHOD_ICON: Record<PaymentMethod, typeof Banknote> = {
  CASH: Banknote,
  BANK_TRANSFER: Landmark,
  CHECK: ScrollText,
};

export function CollectionMethodBadge({ method }: { method: string }) {
  const t = useTranslations("collection");
  const known = isPaymentMethod(method) ? method : null;
  const className = known
    ? METHOD_BADGE[known]
    : "bg-muted text-fg";
  const Icon = known ? METHOD_ICON[known] : Banknote;

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold ${className}`}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {known ? t(`methods.${known}`) : method}
    </span>
  );
}

export function CollectionReceipt({ receipt }: { receipt: CollectionReceiptData }) {
  const t = useTranslations("collection");

  return (
    <section className="invoice-print space-y-5 rounded-2xl border border-line bg-surface p-4 shadow-sm sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4 text-start">
        <JudiLogo href={null} size="md" tone="surface" />
        <div className="min-w-0 text-start sm:text-end">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            {t("detailTitle")}
          </p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-fg sm:text-2xl">
            {receipt.receiptNumber}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 sm:justify-end">
            <CollectionMethodBadge method={receipt.paymentMethod} />
            <span className="inline-flex min-h-8 items-center rounded-lg bg-muted px-2 text-xs font-semibold tabular-nums text-fg">
              {receipt.currency}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        <article className="flex items-start gap-3 rounded-xl border border-line bg-muted/40 p-3 text-start">
          <Thumb kind="store" size="md" src={receipt.storeThumbUrl} alt="" />
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
              {t("store")}
            </p>
            <p className="font-semibold text-fg break-words">{receipt.storeName}</p>
            {receipt.storePhone ? (
              <p className="mt-0.5 text-sm tabular-nums text-fg-muted">
                {receipt.storePhone}
              </p>
            ) : null}
            {receipt.storeAddress ? (
              <p className="mt-0.5 text-sm text-fg-muted">{receipt.storeAddress}</p>
            ) : null}
          </div>
        </article>

        <article className="space-y-2 rounded-xl border border-line bg-muted/40 p-3 text-start">
          <div className="flex items-center gap-2">
            <Thumb
              kind="person"
              size="sm"
              src={receipt.collectorThumbUrl}
              alt=""
              icon={UserRound}
            />
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
                {t("collector")}
              </p>
              <p className="truncate font-semibold text-fg">{receipt.collectorName}</p>
            </div>
          </div>
          <p className="flex items-center gap-2 text-sm tabular-nums text-fg-muted">
            <CalendarDays
              className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
              aria-hidden
            />
            <span>{receipt.dateYmd}</span>
          </p>
        </article>
      </div>

      <div className="rounded-2xl border border-judi-200 bg-judi-50 p-4 text-start dark:border-judi-800 dark:bg-judi-950/40">
        <p className="text-xs font-medium uppercase tracking-wider text-judi-800 dark:text-judi-200">
          {t("amount")}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-fg" dir="ltr">
          {receipt.amountLabel}
        </p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-line bg-muted/40 p-3 text-start">
          <dt className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            {t("remaining")}
          </dt>
          <dd className="mt-1 text-sm font-semibold tabular-nums text-fg">
            {receipt.outstandingIqdLabel}
          </dd>
          <dd className="mt-0.5 text-sm tabular-nums text-fg-muted">
            {receipt.outstandingUsdLabel}
          </dd>
        </div>
        {receipt.notes ? (
          <div className="rounded-xl border border-line bg-muted/40 p-3 text-start">
            <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-fg-subtle">
              <NotebookPen className="size-3.5 shrink-0" aria-hidden />
              {t("notes")}
            </dt>
            <dd className="mt-1 text-sm text-fg break-words">{receipt.notes}</dd>
          </div>
        ) : null}
      </dl>
    </section>
  );
}
