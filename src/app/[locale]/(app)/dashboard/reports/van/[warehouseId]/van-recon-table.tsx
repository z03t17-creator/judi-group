"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  LayoutGrid,
  List,
  Package,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DataExportButtons } from "@/components/data-export-buttons";
import { Thumb } from "@/components/thumb";
import { saveVanAuditAction } from "./actions";

export type ReconRow = {
  productId: string;
  sku: string;
  name: string;
  primaryMediaUrl?: string | null;
  openingQty: string;
  loadedQty: string;
  soldQty: string;
  giftQty: string;
  returnedQty: string;
  expectedClosingQty: string;
  actualClosingQty: string;
  discrepancy: string;
};

type ViewMode = "grid" | "list";
type DiscFilter = "all" | "ok" | "mismatch" | "short" | "over";

function formatQty(value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return value;
  return Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/\.?0+$/, "");
}

export function VanReconTable({
  warehouseId,
  auditDate,
  rows,
  canEdit,
}: {
  warehouseId: string;
  auditDate: string;
  rows: ReconRow[];
  canEdit: boolean;
}) {
  const t = useTranslations();
  const [counts, setCounts] = useState<Record<string, string>>(() =>
    Object.fromEntries(rows.map((row) => [row.productId, row.actualClosingQty])),
  );
  const [query, setQuery] = useState("");
  const [discFilter, setDiscFilter] = useState<DiscFilter>("all");
  const [view, setView] = useState<ViewMode>("list");

  const preview = useMemo(
    () =>
      rows.map((row) => {
        const counted = counts[row.productId] ?? row.actualClosingQty;
        const discrepancy = (
          Number(counted) - Number(row.expectedClosingQty)
        ).toFixed(4);
        return { ...row, counted, discrepancy };
      }),
    [counts, rows],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return preview.filter((row) => {
      const disc = Number(row.discrepancy);
      if (discFilter === "ok" && disc !== 0) return false;
      if (discFilter === "mismatch" && disc === 0) return false;
      if (discFilter === "short" && !(disc < 0)) return false;
      if (discFilter === "over" && !(disc > 0)) return false;
      if (!q) return true;
      return (
        row.sku.toLowerCase().includes(q) ||
        row.name.toLowerCase().includes(q)
      );
    });
  }, [discFilter, preview, query]);

  const discCounts = useMemo(() => {
    let ok = 0;
    let mismatch = 0;
    let short = 0;
    let over = 0;
    for (const row of preview) {
      const disc = Number(row.discrepancy);
      if (disc === 0) ok += 1;
      else {
        mismatch += 1;
        if (disc < 0) short += 1;
        else over += 1;
      }
    }
    return { all: preview.length, ok, mismatch, short, over };
  }, [preview]);

  function clearFilters() {
    setQuery("");
    setDiscFilter("all");
  }

  const exportHeaders = [
    t("reports.reconSku"),
    t("reports.reconProduct"),
    t("reports.reconOpening"),
    t("reports.reconLoaded"),
    t("reports.reconSold"),
    t("reports.reconExpected"),
    t("reports.reconCounted"),
    t("reports.reconDiscrepancy"),
  ];

  const exportRows = filtered.map((row) => [
    row.sku,
    row.name,
    formatQty(row.openingQty),
    formatQty(row.loadedQty),
    formatQty(row.soldQty),
    formatQty(row.expectedClosingQty),
    formatQty(row.counted),
    formatQty(row.discrepancy),
  ]);

  return (
    <form action={saveVanAuditAction} className="space-y-3">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input type="hidden" name="auditDate" value={auditDate} />
      <input
        type="hidden"
        name="itemsJson"
        value={JSON.stringify(
          preview.map((row) => ({
            productId: row.productId,
            countedBaseQty: Number(row.counted) || 0,
          })),
        )}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === preview.length
            ? t("reports.reconHint", { count: preview.length })
            : t("reports.reconMatchedHint", {
                matched: filtered.length,
                total: preview.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DataExportButtons
            title={t("reports.vanReconciliation")}
            subtitle={t("reports.reconDate")}
            metaLines={[auditDate]}
            fileBase="judi-van-recon"
            headers={exportHeaders}
            rows={exportRows}
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <section
        aria-labelledby="recon-filters-heading"
        className="surface-panel space-y-3 p-3 sm:p-4"
      >
        <div className="flex items-start gap-2 text-start">
          <Filter
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div className="min-w-0">
            <h2
              id="recon-filters-heading"
              className="text-sm font-semibold text-fg"
            >
              {t("reports.reconFiltersTitle")}
            </h2>
            <p className="text-xs text-fg-muted">{t("reports.reconFiltersHint")}</p>
          </div>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("reports.searchRecon")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("reports.searchReconPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div
          role="group"
          aria-label={t("reports.filterDiscrepancy")}
          className="chip-scroll"
        >
          <DiscChip
            pressed={discFilter === "all"}
            onClick={() => setDiscFilter("all")}
            label={t("reports.allReconProducts")}
            count={discCounts.all}
          />
          <DiscChip
            pressed={discFilter === "ok"}
            onClick={() => setDiscFilter("ok")}
            label={t("reports.reconOk")}
            count={discCounts.ok}
            icon={CheckCircle2}
          />
          <DiscChip
            pressed={discFilter === "mismatch"}
            onClick={() => setDiscFilter("mismatch")}
            label={t("reports.reconMismatch")}
            count={discCounts.mismatch}
            icon={AlertTriangle}
          />
          <DiscChip
            pressed={discFilter === "short"}
            onClick={() => setDiscFilter("short")}
            label={t("reports.reconShort")}
            count={discCounts.short}
          />
          <DiscChip
            pressed={discFilter === "over"}
            onClick={() => setDiscFilter("over")}
            label={t("reports.reconOver")}
            count={discCounts.over}
          />
        </div>
      </section>

      {rows.length === 0 ? (
        <EmptyState title={t("reports.reconEmpty")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("reports.noReconMatches")}
          hint={t("reports.noReconMatchesHint")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("reports.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3"
          role="list"
        >
          {filtered.map((row) => (
            <li key={row.productId}>
              <ReconGridCard
                row={row}
                canEdit={canEdit}
                counted={counts[row.productId] ?? ""}
                onCountChange={(value) =>
                  setCounts((prev) => ({ ...prev, [row.productId]: value }))
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards space-y-2" role="list">
            {filtered.map((row) => (
              <li key={row.productId}>
                <ReconListCard
                  row={row}
                  canEdit={canEdit}
                  counted={counts[row.productId] ?? ""}
                  onCountChange={(value) =>
                    setCounts((prev) => ({ ...prev, [row.productId]: value }))
                  }
                />
              </li>
            ))}
          </ul>
          <div className="directory-table overflow-x-auto rounded-2xl border border-line bg-surface">
            <table className="w-full min-w-[56rem] text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconProduct")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconOpening")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconLoaded")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconSold")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconExpected")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconCounted")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("reports.reconDiscrepancy")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((row) => {
                  const disc = Number(row.discrepancy);
                  return (
                    <tr key={row.productId} className="hover:bg-muted/40">
                      <td className="px-4 py-2.5">
                        <span className="inline-flex min-h-touch items-center gap-3">
                          <Thumb
                            kind="product"
                            size="xs"
                            src={row.primaryMediaUrl}
                            alt=""
                            desktopOnly
                          />
                          <span className="min-w-0 text-start">
                            <span className="block font-medium text-fg">
                              {row.name}
                            </span>
                            <span className="block tabular-nums text-xs text-fg-subtle">
                              {row.sku}
                            </span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg">
                        {formatQty(row.openingQty)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg">
                        {formatQty(row.loadedQty)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg">
                        {formatQty(row.soldQty)}
                      </td>
                      <td className="px-4 py-2.5 font-medium tabular-nums text-fg">
                        {formatQty(row.expectedClosingQty)}
                      </td>
                      <td className="px-4 py-2.5">
                        {canEdit ? (
                          <CountInput
                            value={counts[row.productId] ?? ""}
                            onChange={(value) =>
                              setCounts((prev) => ({
                                ...prev,
                                [row.productId]: value,
                              }))
                            }
                            label={`${t("reports.reconCounted")} ${row.sku}`}
                          />
                        ) : (
                          <span className="tabular-nums text-fg">
                            {formatQty(row.counted)}
                          </span>
                        )}
                      </td>
                      <td
                        className={`px-4 py-2.5 font-semibold tabular-nums ${discClass(disc)}`}
                      >
                        {formatQty(row.discrepancy)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canEdit && rows.length > 0 ? (
        <div className="sticky-form-actions -mx-1 space-y-2 sm:mx-0 sm:rounded-2xl sm:border sm:border-line sm:bg-surface sm:px-4">
          <button
            type="submit"
            className="btn btn-important w-full sm:w-auto"
          >
            {t("reports.saveCounts")}
          </button>
          <p className="text-start text-sm text-fg-muted">{t("reports.countsHint")}</p>
        </div>
      ) : rows.length > 0 ? (
        <p className="text-start text-sm text-fg-muted">{t("reports.countsHint")}</p>
      ) : null}
    </form>
  );
}

function discClass(disc: number) {
  if (disc === 0) return "text-judi-800 dark:text-judi-200";
  if (disc > 0) return "text-amber-700 dark:text-amber-300";
  return "text-red-700 dark:text-red-300";
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
      aria-label={t("reports.reconViewMode")}
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

function DiscChip({
  label,
  pressed,
  onClick,
  count,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  count: number;
  icon?: typeof AlertTriangle;
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
      <span
        className={`rounded-md px-1.5 py-0.5 text-xs tabular-nums ${
          pressed
            ? "bg-white/20"
            : "bg-surface text-fg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function CountInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input
        type="number"
        min="0"
        step="0.0001"
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-touch w-full min-w-24 max-w-36 rounded-xl border border-line-strong bg-muted px-3 text-start tabular-nums text-fg focus:border-judi-500 focus:bg-surface"
      />
    </label>
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
        <Package className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function ReconGridCard({
  row,
  canEdit,
  counted,
  onCountChange,
}: {
  row: ReconRow & { counted: string; discrepancy: string };
  canEdit: boolean;
  counted: string;
  onCountChange: (value: string) => void;
}) {
  const t = useTranslations();
  const disc = Number(row.discrepancy);
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-sm">
      <div className="flex items-start gap-3">
        <Thumb
          kind="product"
          size="md"
          src={row.primaryMediaUrl}
          alt={row.name}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-fg">{row.name}</p>
          <p className="tabular-nums text-xs text-fg-subtle">{row.sku}</p>
          <p className={`mt-1 text-sm font-semibold tabular-nums ${discClass(disc)}`}>
            {t("reports.reconDiscrepancy")}: {formatQty(row.discrepancy)}
          </p>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <QtyStat label={t("reports.reconOpening")} value={row.openingQty} />
        <QtyStat label={t("reports.reconLoaded")} value={row.loadedQty} />
        <QtyStat label={t("reports.reconSold")} value={row.soldQty} />
        <QtyStat
          label={t("reports.reconExpected")}
          value={row.expectedClosingQty}
          strong
        />
      </dl>
      <div className="mt-auto space-y-1.5">
        <p className="text-xs font-medium text-fg-subtle">
          {t("reports.reconCounted")}
        </p>
        {canEdit ? (
          <CountInput
            value={counted}
            onChange={onCountChange}
            label={`${t("reports.reconCounted")} ${row.sku}`}
          />
        ) : (
          <p className="min-h-touch text-base font-bold tabular-nums text-fg">
            {formatQty(row.counted)}
          </p>
        )}
      </div>
    </article>
  );
}

function ReconListCard({
  row,
  canEdit,
  counted,
  onCountChange,
}: {
  row: ReconRow & { counted: string; discrepancy: string };
  canEdit: boolean;
  counted: string;
  onCountChange: (value: string) => void;
}) {
  const t = useTranslations();
  const disc = Number(row.discrepancy);
  return (
    <article className="rounded-2xl border border-line bg-surface px-3 py-3 text-start shadow-sm sm:px-4">
      <div className="flex items-start gap-3">
        <Thumb
          kind="product"
          size="sm"
          src={row.primaryMediaUrl}
          alt={row.name}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold text-fg">{row.name}</p>
              <p className="tabular-nums text-sm text-fg-subtle">{row.sku}</p>
            </div>
            <p className={`text-sm font-bold tabular-nums ${discClass(disc)}`}>
              {formatQty(row.discrepancy)}
            </p>
          </div>
          <p className="mt-1 text-xs text-fg-muted">
            {t("reports.reconOpening")} {formatQty(row.openingQty)} ·{" "}
            {t("reports.reconLoaded")} {formatQty(row.loadedQty)} ·{" "}
            {t("reports.reconSold")} {formatQty(row.soldQty)} ·{" "}
            {t("reports.reconExpected")}{" "}
            <span className="font-medium text-fg">
              {formatQty(row.expectedClosingQty)}
            </span>
          </p>
          <div className="mt-2 max-w-xs">
            <p className="mb-1 text-xs font-medium text-fg-subtle">
              {t("reports.reconCounted")}
            </p>
            {canEdit ? (
              <CountInput
                value={counted}
                onChange={onCountChange}
                label={`${t("reports.reconCounted")} ${row.sku}`}
              />
            ) : (
              <p className="font-bold tabular-nums text-fg">
                {formatQty(row.counted)}
              </p>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

function QtyStat({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-lg bg-muted/50 px-2 py-1.5">
      <dt className="text-fg-subtle">{label}</dt>
      <dd
        className={`tabular-nums text-fg ${strong ? "font-semibold" : "font-medium"}`}
      >
        {formatQty(value)}
      </dd>
    </div>
  );
}
