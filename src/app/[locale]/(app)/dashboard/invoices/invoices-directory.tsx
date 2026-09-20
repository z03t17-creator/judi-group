"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { InvoiceStatus, InvoiceType } from "@prisma/client";
import {
  CalendarRange,
  ChevronRight,
  FilePlus2,
  FileText,
  Search,
  Store,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { DataExportButtons } from "@/components/data-export-buttons";
import { InvoiceShareIconButton } from "@/components/invoice-share";
import {
  InvoiceStatusBadge,
  InvoiceTypeBadge,
} from "@/components/invoice-document";
import { Thumb } from "@/components/thumb";

const INVOICE_TYPES: InvoiceType[] = ["CASH", "DEBT", "GIFT_PROMOTION", "RETURN"];
const INVOICE_STATUSES: InvoiceStatus[] = [
  "COMPLETED",
  "PENDING_APPROVAL",
  "CANCELLED",
];
const CURRENCIES = ["IQD", "USD"] as const;

export type InvoiceListItem = {
  id: string;
  invoiceNumber: string;
  storeId: string;
  storeName: string;
  storeThumbUrl: string | null;
  storePhone: string | null;
  warehouseName: string;
  delegateName: string;
  invoiceType: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  totalLabel: string;
  paidLabel: string;
  debtLabel: string;
  debtAmount: string;
  dateYmd: string;
};

type TypeFilter = "all" | InvoiceType;
type StatusFilter = "all" | InvoiceStatus;
type CurrencyFilter = "all" | (typeof CURRENCIES)[number];

export function InvoicesDirectory({
  invoices,
  canCreate = false,
}: {
  invoices: InvoiceListItem[];
  canCreate?: boolean;
}) {
  const t = useTranslations("invoices");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [storeId, setStoreId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const createAction = canCreate ? (
    <Link
      href="/dashboard/invoices/new"
      className="btn btn-important"
    >
      <FilePlus2 className="size-4 shrink-0" aria-hidden />
      {t("create")}
    </Link>
  ) : null;

  const stores = useMemo(() => {
    const seen = new Map<string, string>();
    for (const invoice of invoices) {
      if (!seen.has(invoice.storeId)) {
        seen.set(invoice.storeId, invoice.storeName);
      }
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [invoices]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      if (typeFilter !== "all" && invoice.invoiceType !== typeFilter) return false;
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (currencyFilter !== "all" && invoice.currency !== currencyFilter) {
        return false;
      }
      if (storeId !== "all" && invoice.storeId !== storeId) return false;
      if (from && invoice.dateYmd < from) return false;
      if (to && invoice.dateYmd > to) return false;
      if (!q) return true;
      return (
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        invoice.storeName.toLowerCase().includes(q) ||
        invoice.delegateName.toLowerCase().includes(q) ||
        invoice.warehouseName.toLowerCase().includes(q)
      );
    });
  }, [
    currencyFilter,
    from,
    invoices,
    query,
    statusFilter,
    storeId,
    to,
    typeFilter,
  ]);

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCurrencyFilter("all");
    setStoreId("all");
    setFrom("");
    setTo("");
  }

  const exportHeaders = [
    t("number"),
    t("date"),
    t("store"),
    t("type"),
    t("filterStatus"),
    t("currency"),
    t("total"),
    t("paid"),
    t("debt"),
    t("warehouse"),
    t("delegate"),
  ];

  const exportRows = filtered.map((invoice) => [
    invoice.invoiceNumber,
    invoice.dateYmd,
    invoice.storeName,
    t(`types.${invoice.invoiceType}`),
    t(`statuses.${invoice.status}`),
    invoice.currency,
    invoice.totalLabel,
    invoice.paidLabel,
    invoice.debtLabel,
    invoice.warehouseName,
    invoice.delegateName,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-start text-sm text-fg-muted">
          {filtered.length === invoices.length
            ? t("listHint", { count: invoices.length })
            : t("matchedHint", {
                matched: filtered.length,
                total: invoices.length,
              })}
        </p>
        <DataExportButtons
          title={t("title")}
          fileBase="judi-invoices"
          headers={exportHeaders}
          rows={exportRows}
        />
      </div>

      <section
        aria-labelledby="invoices-filters-heading"
        className="surface-panel space-y-3 p-3 sm:p-4"
      >
        <div className="flex items-center gap-2 text-start">
          <CalendarRange
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <h2 id="invoices-filters-heading" className="text-sm font-semibold text-fg">
            {t("filtersTitle")}
          </h2>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block space-y-1.5 text-start">
            <span className="text-sm font-medium text-fg">{t("from")}</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-start">
            <span className="text-sm font-medium text-fg">{t("to")}</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-start sm:col-span-2 lg:col-span-1">
            <span className="text-sm font-medium text-fg">{t("filterStore")}</span>
            <span className="relative block">
              <Store
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <select
                value={storeId}
                onChange={(event) => setStoreId(event.target.value)}
                className="min-h-touch w-full appearance-none rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
              >
                <option value="all">{t("allStores")}</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
        </div>

        <div role="group" aria-label={t("filterType")} className="chip-scroll">
          <FilterChip
            pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
            label={t("allTypes")}
          />
          {INVOICE_TYPES.map((type) => (
            <FilterChip
              key={type}
              pressed={typeFilter === type}
              onClick={() => setTypeFilter(type)}
              label={t(`types.${type}`)}
            />
          ))}
        </div>

        <div role="group" aria-label={t("filterCurrency")} className="chip-scroll">
          <FilterChip
            pressed={currencyFilter === "all"}
            onClick={() => setCurrencyFilter("all")}
            label={t("allCurrencies")}
          />
          {CURRENCIES.map((currency) => (
            <FilterChip
              key={currency}
              pressed={currencyFilter === currency}
              onClick={() => setCurrencyFilter(currency)}
              label={t(`currencies.${currency}`)}
            />
          ))}
        </div>

        <div role="group" aria-label={t("filterStatus")} className="chip-scroll">
          <FilterChip
            pressed={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={t("allStatuses")}
          />
          {INVOICE_STATUSES.map((status) => (
            <FilterChip
              key={status}
              pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              label={t(`statuses.${status}`)}
            />
          ))}
        </div>
      </section>

      {invoices.length === 0 ? (
        <EmptyState title={t("empty")} hint={t("emptyHint")} action={createAction} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("noMatches")}
          hint={t("noMatchesHint")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("clearFilters")}
            </button>
          }
        />
      ) : (
        <>
          <ul
            className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:hidden"
            role="list"
          >
            {filtered.map((invoice) => (
              <li key={invoice.id}>
                <InvoiceCard invoice={invoice} />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("number")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("store")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("type")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell" scope="col">
                    {t("delegate")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("total")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("paid")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("debt")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("date")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("openInvoice")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((invoice) => (
                  <InvoiceTableRow key={invoice.id} invoice={invoice} />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`chip ${pressed ? "chip-on" : "chip-off"}`}
    >
      {label}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-8 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-muted text-judi-800 dark:text-judi-200">
        <FileText className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function sharePayload(invoice: InvoiceListItem) {
  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    storeName: invoice.storeName,
    storePhone: invoice.storePhone,
    invoiceType: invoice.invoiceType,
    dateYmd: invoice.dateYmd,
    totalLabel: invoice.totalLabel,
    paidLabel: invoice.paidLabel,
    debtLabel: invoice.debtLabel,
  };
}

function InvoiceCard({ invoice }: { invoice: InvoiceListItem }) {
  const t = useTranslations("invoices");
  const showDebt = Number(invoice.debtAmount) > 0;

  return (
    <div className="flex items-center gap-1 rounded-2xl border border-line bg-surface pe-1 shadow-sm">
      <Link
        href={`/dashboard/invoices/${invoice.id}`}
        className="flex min-h-touch min-w-0 flex-1 items-center gap-3 px-3 py-3 text-start transition-colors hover:bg-muted/40"
      >
        <Thumb kind="store" size="md" src={invoice.storeThumbUrl} alt="" />
        <span className="min-w-0 flex-1">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate text-sm font-semibold tabular-nums text-fg">
              {invoice.invoiceNumber}
            </span>
            <span className="shrink-0 text-base font-bold tabular-nums text-fg" dir="ltr">
              {invoice.totalLabel}
            </span>
          </span>
          <span className="mt-0.5 block truncate text-sm text-fg-muted">
            {invoice.storeName}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <InvoiceTypeBadge type={invoice.invoiceType} />
            {invoice.status !== "COMPLETED" ? (
              <InvoiceStatusBadge status={invoice.status} />
            ) : null}
            <span className="text-xs tabular-nums text-fg-subtle">{invoice.dateYmd}</span>
            {showDebt ? (
              <span className="text-xs text-amber-800 dark:text-amber-200" dir="ltr">
                {t("debt")}: {invoice.debtLabel}
              </span>
            ) : null}
          </span>
        </span>
        <span className="sr-only">{t("openInvoice")}</span>
      </Link>
      <InvoiceShareIconButton payload={sharePayload(invoice)} />
      <ChevronRight className="me-2 size-5 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />
    </div>
  );
}

function InvoiceTableRow({ invoice }: { invoice: InvoiceListItem }) {
  const t = useTranslations("invoices");

  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        <Link
          href={`/dashboard/invoices/${invoice.id}`}
          className="inline-flex min-h-touch items-center font-semibold tabular-nums text-fg hover:text-judi-800 dark:hover:text-judi-200"
        >
          {invoice.invoiceNumber}
        </Link>
      </td>
      <td className="px-4 py-2">
        <Link
          href={`/dashboard/invoices/${invoice.id}`}
          className="flex min-h-touch items-center gap-2.5 text-fg hover:text-judi-800 dark:hover:text-judi-200"
        >
          <Thumb
            kind="store"
            size="xs"
            src={invoice.storeThumbUrl}
            alt=""
            desktopOnly
          />
          <span className="min-w-0">
            <span className="block truncate font-medium">{invoice.storeName}</span>
            <span className="block truncate text-xs text-fg-subtle">
              {invoice.warehouseName}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-2">
        <div className="flex min-h-touch flex-wrap items-center gap-1.5">
          <InvoiceTypeBadge type={invoice.invoiceType} />
          {invoice.status !== "COMPLETED" ? (
            <InvoiceStatusBadge status={invoice.status} />
          ) : null}
        </div>
      </td>
      <td className="hidden px-4 py-2 text-fg-muted xl:table-cell">
        {invoice.delegateName}
      </td>
      <td className="px-4 py-2 font-semibold tabular-nums text-fg whitespace-nowrap" dir="ltr">
        {invoice.totalLabel}
      </td>
      <td className="hidden px-4 py-2 tabular-nums text-fg-muted lg:table-cell whitespace-nowrap" dir="ltr">
        {invoice.paidLabel}
      </td>
      <td className="hidden px-4 py-2 tabular-nums text-fg-muted lg:table-cell whitespace-nowrap" dir="ltr">
        {invoice.debtLabel}
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted whitespace-nowrap">{invoice.dateYmd}</td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-1">
          <InvoiceShareIconButton payload={sharePayload(invoice)} />
          <Link
            href={`/dashboard/invoices/${invoice.id}`}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
            aria-label={t("openInvoice")}
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      </td>
    </tr>
  );
}
