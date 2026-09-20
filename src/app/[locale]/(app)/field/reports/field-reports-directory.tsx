"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarRange,
  ChevronRight,
  FileText,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import { formatMoney } from "@/lib/money";
import type {
  FieldActivityCollection,
  FieldActivityInvoice,
} from "@/lib/field-activity-load";
import { shiftYmd } from "@/lib/field-activity-load";
import { toBaghdadYmd } from "@/lib/reports/date";

type ViewMode = "grid" | "list";
type PeriodFilter = "today" | "7d" | "30d" | "all";
type KindFilter = "all" | "sales" | "returns" | "collections";

type StoreReportRow = {
  storeId: string;
  storeName: string;
  storeThumbUrl: string | null;
  salesCount: number;
  returnCount: number;
  collectionCount: number;
  salesIqd: number;
  salesUsd: number;
  collectedIqd: number;
  collectedUsd: number;
  lastActivityYmd: string;
};

function inPeriod(dateYmd: string, period: PeriodFilter, today: string) {
  if (period === "all") return true;
  if (period === "today") return dateYmd === today;
  if (period === "7d") return dateYmd >= shiftYmd(today, -6);
  return dateYmd >= shiftYmd(today, -29);
}

export function FieldReportsDirectory({
  invoices,
  collections,
  todayYmd = toBaghdadYmd(new Date()),
}: {
  invoices: FieldActivityInvoice[];
  collections: FieldActivityCollection[];
  todayYmd?: string;
}) {
  const t = useTranslations("field");
  const [period, setPeriod] = useState<PeriodFilter>("today");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<ViewMode>("grid");

  const scopedInvoices = useMemo(
    () => invoices.filter((row) => inPeriod(row.dateYmd, period, todayYmd)),
    [invoices, period, todayYmd],
  );
  const scopedCollections = useMemo(
    () => collections.filter((row) => inPeriod(row.dateYmd, period, todayYmd)),
    [collections, period, todayYmd],
  );

  const sales = useMemo(
    () => scopedInvoices.filter((row) => row.invoiceType !== "RETURN"),
    [scopedInvoices],
  );
  const returns = useMemo(
    () => scopedInvoices.filter((row) => row.invoiceType === "RETURN"),
    [scopedInvoices],
  );

  const kpis = useMemo(() => {
    let salesIqd = 0;
    let salesUsd = 0;
    let returnIqd = 0;
    let returnUsd = 0;
    let collectedIqd = 0;
    let collectedUsd = 0;
    for (const row of sales) {
      const n = Number(row.totalAmount);
      if (row.currency === "USD") salesUsd += n;
      else salesIqd += n;
    }
    for (const row of returns) {
      const n = Number(row.totalAmount);
      if (row.currency === "USD") returnUsd += n;
      else returnIqd += n;
    }
    for (const row of scopedCollections) {
      const n = Number(row.amount);
      if (row.currency === "USD") collectedUsd += n;
      else collectedIqd += n;
    }
    return {
      salesCount: sales.length,
      returnCount: returns.length,
      collectionCount: scopedCollections.length,
      salesIqd,
      salesUsd,
      returnIqd,
      returnUsd,
      collectedIqd,
      collectedUsd,
    };
  }, [returns, sales, scopedCollections]);

  const storeRows = useMemo(() => {
    const map = new Map<string, StoreReportRow>();

    function ensure(storeId: string, storeName: string, thumb: string | null) {
      let row = map.get(storeId);
      if (!row) {
        row = {
          storeId,
          storeName,
          storeThumbUrl: thumb,
          salesCount: 0,
          returnCount: 0,
          collectionCount: 0,
          salesIqd: 0,
          salesUsd: 0,
          collectedIqd: 0,
          collectedUsd: 0,
          lastActivityYmd: "",
        };
        map.set(storeId, row);
      }
      return row;
    }

    for (const inv of scopedInvoices) {
      const row = ensure(inv.storeId, inv.storeName, inv.storeThumbUrl);
      const amount = Number(inv.totalAmount);
      if (inv.invoiceType === "RETURN") {
        row.returnCount += 1;
      } else {
        row.salesCount += 1;
        if (inv.currency === "USD") row.salesUsd += amount;
        else row.salesIqd += amount;
      }
      if (inv.dateYmd > row.lastActivityYmd) row.lastActivityYmd = inv.dateYmd;
    }

    for (const col of scopedCollections) {
      const row = ensure(col.storeId, col.storeName, col.storeThumbUrl);
      row.collectionCount += 1;
      const amount = Number(col.amount);
      if (col.currency === "USD") row.collectedUsd += amount;
      else row.collectedIqd += amount;
      if (col.dateYmd > row.lastActivityYmd) row.lastActivityYmd = col.dateYmd;
    }

    return [...map.values()].sort((a, b) => {
      if (b.lastActivityYmd !== a.lastActivityYmd) {
        return b.lastActivityYmd.localeCompare(a.lastActivityYmd);
      }
      return a.storeName.localeCompare(b.storeName);
    });
  }, [scopedCollections, scopedInvoices]);

  const filteredStores = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return storeRows.filter((row) => {
      if (kind === "sales" && row.salesCount === 0) return false;
      if (kind === "returns" && row.returnCount === 0) return false;
      if (kind === "collections" && row.collectionCount === 0) return false;
      if (!needle) return true;
      return row.storeName.toLowerCase().includes(needle);
    });
  }, [kind, query, storeRows]);

  const filtersActive = period !== "today" || kind !== "all" || query.trim().length > 0;

  function clearFilters() {
    setPeriod("today");
    setKind("all");
    setQuery("");
  }

  return (
    <div className="space-y-4">
      <section className="kpi-grid" aria-label={t("reportsKpisTitle")}>
        <KpiCard
          icon={FileText}
          label={t("reportsKpiSalesCount")}
          value={String(kpis.salesCount)}
          hint={`${formatMoney(kpis.salesIqd, "IQD")} · ${formatMoney(kpis.salesUsd, "USD")}`}
        />
        <KpiCard
          icon={Wallet}
          label={t("reportsKpiCollections")}
          value={String(kpis.collectionCount)}
          hint={`${formatMoney(kpis.collectedIqd, "IQD")} · ${formatMoney(kpis.collectedUsd, "USD")}`}
        />
        <KpiCard
          icon={RotateCcw}
          label={t("reportsKpiReturns")}
          value={String(kpis.returnCount)}
          hint={`${formatMoney(kpis.returnIqd, "IQD")} · ${formatMoney(kpis.returnUsd, "USD")}`}
        />
        <KpiCard
          icon={Store}
          label={t("reportsKpiStores")}
          value={String(storeRows.length)}
          hint={t("reportsPeriodHint", { period: t(`reportsPeriod.${period}`) })}
        />
      </section>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-start text-sm text-fg-muted">
          {filteredStores.length === storeRows.length
            ? t("reportsListHint", { count: storeRows.length })
            : t("reportsMatched", {
                matched: filteredStores.length,
                total: storeRows.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Link
            href="/field/movements"
            className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-muted"
          >
            <BarChart3 className="size-4 shrink-0" aria-hidden />
            {t("reportsOpenMovements")}
          </Link>
        </div>
      </div>

      <section
        aria-labelledby="field-reports-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <div className="flex items-center gap-2 text-start">
          <CalendarRange
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <h2 id="field-reports-filters-heading" className="text-sm font-semibold text-fg">
            {t("reportsFiltersTitle")}
          </h2>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("reportsSearch")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("reportsSearchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line bg-canvas pe-3 ps-10 text-fg placeholder:text-fg-subtle"
          />
        </label>

        <div className="chip-scroll" role="group" aria-label={t("reportsPeriodLabel")}>
          {(["today", "7d", "30d", "all"] as const).map((id) => (
            <FilterChip
              key={id}
              active={period === id}
              onClick={() => setPeriod(id)}
              label={t(`reportsPeriod.${id}`)}
            />
          ))}
        </div>

        <div className="chip-scroll" role="group" aria-label={t("reportsKindLabel")}>
          {(["all", "sales", "returns", "collections"] as const).map((id) => (
            <FilterChip
              key={id}
              active={kind === id}
              onClick={() => setKind(id)}
              label={t(`reportsKind.${id}`)}
            />
          ))}
        </div>

        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-touch items-center gap-2 rounded-xl px-3 text-sm font-medium text-judi-800 hover:bg-muted dark:text-judi-200"
          >
            <X className="size-4" aria-hidden />
            {t("reportsClearFilters")}
          </button>
        ) : null}
      </section>

      {filteredStores.length === 0 ? (
        <EmptyState hasRows={storeRows.length > 0} />
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredStores.map((row) => (
            <li key={row.storeId}>
              <StoreReportCard row={row} view="grid" />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-2">
          {filteredStores.map((row) => (
            <li key={row.storeId}>
              <StoreReportCard row={row} view="list" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StoreReportCard({ row, view }: { row: StoreReportRow; view: ViewMode }) {
  const t = useTranslations("field");
  const salesLine = `${formatMoney(row.salesIqd, "IQD")} · ${formatMoney(row.salesUsd, "USD")}`;
  const collectedLine = `${formatMoney(row.collectedIqd, "IQD")} · ${formatMoney(row.collectedUsd, "USD")}`;

  return (
    <Link
      href={`/field/customers/${row.storeId}/statement`}
      className={`flex min-h-touch gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-sm hover:border-judi-500 hover:bg-accent-soft/60 ${
        view === "grid" ? "flex-col sm:min-h-[11rem]" : "items-center"
      }`}
    >
      <div className={`flex items-center gap-3 ${view === "grid" ? "w-full" : "min-w-0 flex-1"}`}>
        <Thumb kind="store" size={view === "grid" ? "md" : "sm"} src={row.storeThumbUrl} alt="" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{row.storeName}</p>
          <p className="mt-0.5 text-xs text-fg-muted tabular-nums">{row.lastActivityYmd}</p>
        </div>
        {view === "list" ? (
          <ChevronRight className="size-5 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />
        ) : null}
      </div>

      <dl
        className={`grid gap-2 text-sm ${
          view === "grid" ? "grid-cols-2" : "hidden sm:grid sm:grid-cols-3 lg:grid-cols-4"
        }`}
      >
        <MetaStat label={t("reportsMetaSales")} value={`${row.salesCount}`} hint={salesLine} />
        <MetaStat
          label={t("reportsMetaCollected")}
          value={`${row.collectionCount}`}
          hint={collectedLine}
        />
        <MetaStat label={t("reportsMetaReturns")} value={`${row.returnCount}`} />
      </dl>
    </Link>
  );
}

function MetaStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/60 px-2.5 py-2 text-start">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 font-semibold tabular-nums text-fg" dir="ltr">
        {value}
      </dd>
      {hint ? (
        <p className="mt-0.5 truncate text-[11px] text-fg-muted tabular-nums" dir="ltr">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article className="surface-panel flex items-start gap-3 p-4 text-start">
      <span className="icon-badge icon-badge-md tone-sky">
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
        <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-fg" dir="ltr">
          {value}
        </p>
        <p className="mt-0.5 truncate text-xs text-fg-muted tabular-nums" dir="ltr">
          {hint}
        </p>
      </div>
    </article>
  );
}

function EmptyState({ hasRows }: { hasRows: boolean }) {
  const t = useTranslations("field");
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-12 text-center">
      <Thumb kind="store" size="lg" src={null} icon={BarChart3} alt="" />
      <div>
        <p className="font-semibold text-fg">
          {hasRows ? t("reportsNoMatch") : t("reportsEmpty")}
        </p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">
          {hasRows ? t("reportsNoMatchHint") : t("reportsEmptyHint")}
        </p>
      </div>
      {!hasRows ? (
        <Link
          href="/field/invoice"
          className="btn btn-important"
        >
          <FileText className="size-4" aria-hidden />
          {t("newInvoice")}
        </Link>
      ) : null}
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
  const t = useTranslations("field");
  return (
    <div
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
      role="group"
      aria-label={t("viewMode")}
    >
      <ToggleBtn active={view === "grid"} onClick={() => onChange("grid")} label={t("viewGrid")}>
        <LayoutGrid className="size-4" aria-hidden />
      </ToggleBtn>
      <ToggleBtn active={view === "list"} onClick={() => onChange("list")} label={t("viewList")}>
        <List className="size-4" aria-hidden />
      </ToggleBtn>
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg ${
        active
          ? "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100"
          : "text-fg-muted hover:bg-muted hover:text-fg"
      }`}
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-touch shrink-0 items-center rounded-xl px-3 text-sm font-medium ${
        active
          ? "bg-judi-700 text-white"
          : "border border-line-strong bg-surface text-fg hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}
