"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  CalendarRange,
  ChevronRight,
  Search,
  Store,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { CollectionMethodBadge } from "@/components/collection-receipt";
import { DataExportButtons } from "@/components/data-export-buttons";
import { Thumb } from "@/components/thumb";
import { Link } from "@/i18n/navigation";
import { PAYMENT_METHODS } from "@/lib/constants";
import { isPaymentMethod } from "@/lib/collection";

const CURRENCIES = ["IQD", "USD"] as const;

export type CollectionListItem = {
  id: string;
  receiptNumber: string;
  storeId: string;
  storeName: string;
  storeThumbUrl: string | null;
  collectorId: string;
  collectorName: string;
  collectorThumbUrl: string | null;
  amountLabel: string;
  currency: string;
  paymentMethod: string;
  dateYmd: string;
  proofThumbUrl: string | null;
};

type MethodFilter = "all" | (typeof PAYMENT_METHODS)[number];
type CurrencyFilter = "all" | (typeof CURRENCIES)[number];

export function CollectionsDirectory({
  collections,
}: {
  collections: CollectionListItem[];
}) {
  const t = useTranslations("collection");
  const [query, setQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<MethodFilter>("all");
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyFilter>("all");
  const [storeId, setStoreId] = useState("all");
  const [collectorId, setCollectorId] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const stores = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of collections) {
      if (!seen.has(row.storeId)) seen.set(row.storeId, row.storeName);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections]);

  const collectors = useMemo(() => {
    const seen = new Map<string, string>();
    for (const row of collections) {
      if (!seen.has(row.collectorId)) seen.set(row.collectorId, row.collectorName);
    }
    return [...seen.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [collections]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collections.filter((row) => {
      if (methodFilter !== "all" && row.paymentMethod !== methodFilter) return false;
      if (currencyFilter !== "all" && row.currency !== currencyFilter) return false;
      if (storeId !== "all" && row.storeId !== storeId) return false;
      if (collectorId !== "all" && row.collectorId !== collectorId) return false;
      if (from && row.dateYmd < from) return false;
      if (to && row.dateYmd > to) return false;
      if (!q) return true;
      return (
        row.receiptNumber.toLowerCase().includes(q) ||
        row.storeName.toLowerCase().includes(q) ||
        row.collectorName.toLowerCase().includes(q)
      );
    });
  }, [
    collections,
    collectorId,
    currencyFilter,
    from,
    methodFilter,
    query,
    storeId,
    to,
  ]);

  function clearFilters() {
    setQuery("");
    setMethodFilter("all");
    setCurrencyFilter("all");
    setStoreId("all");
    setCollectorId("all");
    setFrom("");
    setTo("");
  }

  const exportHeaders = [
    t("receiptNumber"),
    t("date"),
    t("store"),
    t("collector"),
    t("amount"),
    t("filterCurrency"),
    t("paymentMethod"),
  ];

  const exportRows = filtered.map((row) => [
    row.receiptNumber,
    row.dateYmd,
    row.storeName,
    row.collectorName,
    row.amountLabel,
    row.currency,
    isPaymentMethod(row.paymentMethod)
      ? t(`methods.${row.paymentMethod}`)
      : row.paymentMethod,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-start text-sm text-fg-muted">
          {filtered.length === collections.length
            ? t("listHint", { count: collections.length })
            : t("matchedHint", {
                matched: filtered.length,
                total: collections.length,
              })}
        </p>
        <DataExportButtons
          title={t("officeTitle")}
          fileBase="judi-collections"
          headers={exportHeaders}
          rows={exportRows}
        />
      </div>

      <section
        aria-labelledby="collections-filters-heading"
        className="surface-panel space-y-3 p-3 sm:p-4"
      >
        <div className="flex items-center gap-2 text-start">
          <CalendarRange
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <h2 id="collections-filters-heading" className="text-sm font-semibold text-fg">
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
          <label className="block space-y-1.5 text-start">
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
          <label className="block space-y-1.5 text-start">
            <span className="text-sm font-medium text-fg">{t("collector")}</span>
            <select
              value={collectorId}
              onChange={(event) => setCollectorId(event.target.value)}
              className="min-h-touch w-full appearance-none rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
            >
              <option value="all">{t("allCollectors")}</option>
              {collectors.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div role="group" aria-label={t("filterMethod")} className="chip-scroll">
          <FilterChip
            pressed={methodFilter === "all"}
            onClick={() => setMethodFilter("all")}
            label={t("allMethods")}
          />
          {PAYMENT_METHODS.map((method) => (
            <FilterChip
              key={method}
              pressed={methodFilter === method}
              onClick={() => setMethodFilter(method)}
              label={t(`methods.${method}`)}
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
              label={currency}
            />
          ))}
        </div>
      </section>

      {collections.length === 0 ? (
        <EmptyState title={t("empty")} hint={t("emptyHint")} />
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
          <ul className="money-cards-mobile" role="list">
            {filtered.map((row) => (
              <li key={row.id}>
                <CollectionCard row={row} />
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:block">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("receiptNumber")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("store")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("amount")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("paymentMethod")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell" scope="col">
                    {t("collector")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("date")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("openReceipt")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((row) => (
                  <CollectionTableRow key={row.id} row={row} />
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
      className={`inline-flex min-h-touch shrink-0 items-center rounded-xl px-3 text-sm font-medium transition-colors ${
        pressed
          ? "seg-on"
          : "border border-line-strong bg-muted text-fg hover:bg-surface"
      }`}
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
        <Wallet className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function CollectionCard({ row }: { row: CollectionListItem }) {
  const t = useTranslations("collection");

  return (
    <Link
      href={`/dashboard/collections/${row.id}`}
      className="flex min-h-touch items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-sm transition-colors hover:bg-muted/40"
    >
      <Thumb kind="store" size="md" src={row.storeThumbUrl} alt="" />
      <span className="min-w-0 flex-1 text-start">
        <span className="flex items-start justify-between gap-2">
          <span className="truncate text-sm font-semibold tabular-nums text-fg">
            {row.receiptNumber}
          </span>
          <span className="shrink-0 text-base font-bold tabular-nums text-fg" dir="ltr">
            {row.amountLabel}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-fg-muted">
          {row.storeName}
        </span>
        <span className="mt-1.5 flex flex-wrap items-center gap-2">
          <CollectionMethodBadge method={row.paymentMethod} />
          <span className="text-xs tabular-nums text-fg-subtle">{row.dateYmd}</span>
        </span>
      </span>
      {row.proofThumbUrl ? (
        <Thumb kind="stock" size="sm" src={row.proofThumbUrl} alt="" />
      ) : null}
      <ChevronRight className="size-5 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />
      <span className="sr-only">{t("openReceipt")}</span>
    </Link>
  );
}

function CollectionTableRow({ row }: { row: CollectionListItem }) {
  const t = useTranslations("collection");

  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        <Link
          href={`/dashboard/collections/${row.id}`}
          className="inline-flex min-h-touch items-center gap-2 font-semibold tabular-nums text-fg hover:text-judi-800 dark:hover:text-judi-200"
        >
          {row.proofThumbUrl ? (
            <Thumb kind="stock" size="xs" src={row.proofThumbUrl} alt="" desktopOnly />
          ) : null}
          {row.receiptNumber}
        </Link>
      </td>
      <td className="px-4 py-2">
        <div className="flex min-h-touch items-center gap-2.5">
          <Thumb
            kind="store"
            size="xs"
            src={row.storeThumbUrl}
            alt=""
            desktopOnly
          />
          <span className="min-w-0 truncate font-medium text-fg">{row.storeName}</span>
        </div>
      </td>
      <td className="px-4 py-2 font-semibold tabular-nums text-fg whitespace-nowrap" dir="ltr">
        {row.amountLabel}
      </td>
      <td className="px-4 py-2">
        <div className="flex min-h-touch items-center">
          <CollectionMethodBadge
            method={isPaymentMethod(row.paymentMethod) ? row.paymentMethod : row.paymentMethod}
          />
        </div>
      </td>
      <td className="hidden px-4 py-2 xl:table-cell">
        <div className="flex min-h-touch items-center gap-2">
          <Thumb
            kind="person"
            size="xs"
            src={row.collectorThumbUrl}
            alt=""
            desktopOnly
          />
          <span className="truncate text-fg-muted">{row.collectorName}</span>
        </div>
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted whitespace-nowrap">
        {row.dateYmd}
      </td>
      <td className="px-4 py-2">
        <Link
          href={`/dashboard/collections/${row.id}`}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
          aria-label={t("openReceipt")}
        >
          <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
      </td>
    </tr>
  );
}
