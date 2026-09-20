"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Receipt,
  Search,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DataExportButtons } from "@/components/data-export-buttons";
import { Thumb } from "@/components/thumb";
import { Link } from "@/i18n/navigation";
import { formatMoney, type CurrencyCode } from "@/lib/money";

export type StatementLedgerEntry = {
  date: string;
  type: "INVOICE" | "PAYMENT";
  reference: string;
  debit: string;
  credit: string;
  runningBalance: string;
  id?: string;
};

type ViewMode = "grid" | "list";
type TypeFilter = "all" | "INVOICE" | "PAYMENT";

function entryHref(
  entry: StatementLedgerEntry,
  surface: "office" | "field",
): string | null {
  if (!entry.id) return null;
  if (entry.type === "INVOICE") {
    return surface === "field"
      ? `/field/invoice/${entry.id}`
      : `/dashboard/invoices/${entry.id}`;
  }
  if (surface === "field") {
    return `/field/collection?ok=${entry.id}`;
  }
  return `/dashboard/collections/${entry.id}`;
}

export function StatementLedger({
  entries,
  currency,
  surface = "office",
}: {
  entries: StatementLedgerEntry[];
  currency: CurrencyCode;
  surface?: "office" | "field";
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (typeFilter !== "all" && entry.type !== typeFilter) return false;
      if (!q) return true;
      return (
        entry.reference.toLowerCase().includes(q) ||
        entry.date.toLowerCase().includes(q) ||
        (entry.type === "INVOICE"
          ? t("reports.typeInvoice")
          : t("reports.typePayment")
        )
          .toLowerCase()
          .includes(q)
      );
    });
  }, [entries, query, t, typeFilter]);

  function clearFilters() {
    setQuery("");
    setTypeFilter("all");
  }

  const exportHeaders = [
    t("reports.date"),
    t("reports.type"),
    t("reports.reference"),
    t("reports.debit"),
    t("reports.credit"),
    t("reports.balance"),
  ];

  const exportRows = filtered.map((entry) => [
    entry.date,
    entry.type === "INVOICE" ? t("reports.typeInvoice") : t("reports.typePayment"),
    entry.reference,
    formatMoney(entry.debit, currency),
    formatMoney(entry.credit, currency),
    formatMoney(entry.runningBalance, currency),
  ]);

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === entries.length
            ? t("reports.ledgerHint", { count: entries.length })
            : t("reports.ledgerMatched", {
                matched: filtered.length,
                total: entries.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DataExportButtons
            title={t("reports.ledgerTitle")}
            fileBase="judi-statement"
            headers={exportHeaders}
            rows={exportRows}
            metaLines={[currency]}
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <section
        aria-labelledby="statement-filters-heading"
        className="no-print surface-panel space-y-3 p-3 sm:p-4"
      >
        <div className="flex items-start gap-2 text-start">
          <Filter
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div className="min-w-0">
            <h2
              id="statement-filters-heading"
              className="text-sm font-semibold text-fg"
            >
              {t("reports.ledgerFilters")}
            </h2>
            <p className="text-xs text-fg-muted">{t("reports.ledgerFiltersHint")}</p>
          </div>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("reports.searchLedger")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("reports.searchLedgerPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>
        <div
          role="group"
          aria-label={t("reports.filterEntryType")}
          className="chip-scroll"
        >
          <TypeChip
            pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
            label={t("reports.allEntryTypes")}
          />
          <TypeChip
            pressed={typeFilter === "INVOICE"}
            onClick={() => setTypeFilter("INVOICE")}
            label={t("reports.typeInvoice")}
            icon={FileText}
          />
          <TypeChip
            pressed={typeFilter === "PAYMENT"}
            onClick={() => setTypeFilter("PAYMENT")}
            label={t("reports.typePayment")}
            icon={Wallet}
          />
        </div>
      </section>

      {entries.length === 0 ? (
        <EmptyState title={t("reports.noEntries")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("reports.noLedgerMatches")}
          hint={t("reports.noLedgerMatchesHint")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("reports.clearLedgerFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
          role="list"
        >
          {filtered.map((entry) => (
            <li key={`${entry.reference}-${entry.date}-${entry.id ?? ""}`}>
              <LedgerGridCard entry={entry} currency={currency} surface={surface} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards space-y-2" role="list">
            {filtered.map((entry) => (
              <li key={`${entry.reference}-${entry.date}-${entry.id ?? ""}`}>
                <LedgerListCard entry={entry} currency={currency} surface={surface} />
              </li>
            ))}
          </ul>
          <div className="directory-table overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.type")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("invoices.date")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reference")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.debit")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.credit")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.balance")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("reports.openEntry")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((entry) => {
                  const href = entryHref(entry, surface);
                  return (
                    <tr
                      key={`${entry.reference}-${entry.date}-row`}
                      className="hover:bg-muted/40"
                    >
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2">
                          <Thumb
                            kind="stock"
                            size="xs"
                            icon={entry.type === "INVOICE" ? FileText : Wallet}
                            alt=""
                            desktopOnly
                          />
                          <TypeBadge type={entry.type} />
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg-muted">
                        {entry.date.slice(0, 10)}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-fg">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex min-h-touch items-center text-judi-800 hover:underline dark:text-judi-200"
                          >
                            {entry.reference}
                          </Link>
                        ) : (
                          entry.reference
                        )}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg">
                        {Number(entry.debit) > 0
                          ? formatMoney(entry.debit, currency)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg">
                        {Number(entry.credit) > 0
                          ? formatMoney(entry.credit, currency)
                          : "—"}
                      </td>
                      <td className="px-4 py-2.5 font-semibold tabular-nums text-fg">
                        {formatMoney(entry.runningBalance, currency)}
                      </td>
                      <td className="px-4 py-2.5 text-end">
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-fg-subtle hover:bg-muted hover:text-fg"
                            aria-label={t("reports.openEntry")}
                          >
                            <ChevronRight
                              className="size-4 rtl:rotate-180"
                              aria-hidden
                            />
                          </Link>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Print-only full table (always all entries, no client filters) */}
      <div className="hidden print:block">
        <table className="w-full text-start text-sm">
          <thead>
            <tr>
              <th className="border-b px-2 py-1">{t("invoices.date")}</th>
              <th className="border-b px-2 py-1">{t("reports.type")}</th>
              <th className="border-b px-2 py-1">{t("reports.reference")}</th>
              <th className="border-b px-2 py-1">{t("reports.debit")}</th>
              <th className="border-b px-2 py-1">{t("reports.credit")}</th>
              <th className="border-b px-2 py-1">{t("reports.balance")}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={`print-${entry.reference}-${entry.date}`}>
                <td className="border-b px-2 py-1">{entry.date.slice(0, 10)}</td>
                <td className="border-b px-2 py-1">
                  {entry.type === "INVOICE"
                    ? t("reports.typeInvoice")
                    : t("reports.typePayment")}
                </td>
                <td className="border-b px-2 py-1">{entry.reference}</td>
                <td className="border-b px-2 py-1">
                  {Number(entry.debit) > 0
                    ? formatMoney(entry.debit, currency)
                    : "—"}
                </td>
                <td className="border-b px-2 py-1">
                  {Number(entry.credit) > 0
                    ? formatMoney(entry.credit, currency)
                    : "—"}
                </td>
                <td className="border-b px-2 py-1">
                  {formatMoney(entry.runningBalance, currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const t = useTranslations();
  return (
    <div
      role="group"
      aria-label={t("reports.ledgerViewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("reports.viewGrid")}
        onClick={() => onChange("grid")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 transition-colors ${
          view === "grid"
            ? "seg-on"
            : "text-fg-muted hover:bg-muted hover:text-fg"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        aria-label={t("reports.viewList")}
        onClick={() => onChange("list")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 transition-colors ${
          view === "list"
            ? "seg-on"
            : "text-fg-muted hover:bg-muted hover:text-fg"
        }`}
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function TypeChip({
  label,
  pressed,
  onClick,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: typeof FileText;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors ${
        pressed
          ? "seg-on"
          : "border border-line-strong bg-muted text-fg hover:bg-surface"
      }`}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {label}
    </button>
  );
}

function TypeBadge({ type }: { type: "INVOICE" | "PAYMENT" }) {
  const t = useTranslations();
  const isInvoice = type === "INVOICE";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-medium ${
        isInvoice
          ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          : "bg-judi-50 text-judi-900 dark:bg-judi-950/40 dark:text-judi-100"
      }`}
    >
      {isInvoice ? (
        <ArrowUpRight className="size-3" aria-hidden />
      ) : (
        <ArrowDownLeft className="size-3" aria-hidden />
      )}
      {isInvoice ? t("reports.typeInvoice") : t("reports.typePayment")}
    </span>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-10 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-muted text-judi-800 dark:text-judi-200">
        <Receipt className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function LedgerGridCard({
  entry,
  currency,
  surface = "office",
}: {
  entry: StatementLedgerEntry;
  currency: CurrencyCode;
  surface?: "office" | "field";
}) {
  const t = useTranslations();
  const href = entryHref(entry, surface);
  const amount =
    Number(entry.debit) > 0
      ? formatMoney(entry.debit, currency)
      : formatMoney(entry.credit, currency);
  const body = (
    <>
      <div className="flex items-start gap-3">
        <Thumb
          kind="stock"
          size="md"
          icon={entry.type === "INVOICE" ? FileText : Wallet}
          alt=""
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <TypeBadge type={entry.type} />
            <span className="text-xs tabular-nums text-fg-subtle">
              {entry.date.slice(0, 10)}
            </span>
          </div>
          <p className="mt-2 truncate font-semibold text-fg">{entry.reference}</p>
          <p className="mt-1 text-base font-bold tabular-nums text-fg">{amount}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {t("reports.balance")}:{" "}
            <span className="font-medium tabular-nums text-fg">
              {formatMoney(entry.runningBalance, currency)}
            </span>
          </p>
        </div>
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-2xl border border-line bg-surface px-3 py-3 text-start shadow-sm transition-colors hover:border-judi-400 hover:bg-muted"
      >
        {body}
        <span className="mt-3 inline-flex min-h-touch w-full items-center justify-center gap-1 rounded-xl border border-judi-300 bg-judi-50 text-sm font-medium text-judi-800 dark:border-judi-700 dark:bg-judi-950/40 dark:text-judi-100">
          {t("reports.openEntry")}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </span>
      </Link>
    );
  }

  return (
    <article className="rounded-2xl border border-line bg-surface px-3 py-3 text-start shadow-sm">
      {body}
    </article>
  );
}

function LedgerListCard({
  entry,
  currency,
  surface = "office",
}: {
  entry: StatementLedgerEntry;
  currency: CurrencyCode;
  surface?: "office" | "field";
}) {
  const t = useTranslations();
  const href = entryHref(entry, surface);
  const isDebit = Number(entry.debit) > 0;
  const inner = (
    <>
      <Thumb
        kind="stock"
        size="sm"
        icon={entry.type === "INVOICE" ? FileText : Wallet}
        alt=""
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-semibold text-fg">{entry.reference}</p>
          <TypeBadge type={entry.type} />
        </div>
        <p className="mt-0.5 text-sm tabular-nums text-fg-subtle">
          {entry.date.slice(0, 10)}
        </p>
      </div>
      <div className="shrink-0 text-end">
        <p className="font-bold tabular-nums text-fg">
          {isDebit
            ? formatMoney(entry.debit, currency)
            : formatMoney(entry.credit, currency)}
        </p>
        <p className="text-xs tabular-nums text-fg-muted">
          {t("reports.balance")}: {formatMoney(entry.runningBalance, currency)}
        </p>
      </div>
      {href ? (
        <ChevronRight
          className="size-5 shrink-0 text-fg-subtle rtl:rotate-180"
          aria-hidden
        />
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="flex min-h-touch items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-start shadow-sm transition-colors hover:border-judi-400 hover:bg-muted sm:px-4"
      >
        {inner}
        <span className="sr-only">{t("reports.openEntry")}</span>
      </Link>
    );
  }

  return (
    <article className="flex min-h-touch items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2.5 text-start shadow-sm sm:px-4">
      {inner}
    </article>
  );
}
