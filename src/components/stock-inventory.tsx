"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  LayoutGrid,
  List,
  PackageX,
  Search,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/thumb";

export type StockInventoryItem = {
  id: string;
  sku: string;
  displayName: string;
  /** Raw base qty string for filtering / display. */
  baseQty: string;
  /** Formatted on-hand (may include sign). */
  baseQtyLabel: string;
  isNegative: boolean;
  breakdown: string;
  primaryMediaUrl: string | null;
  /** Field recon expected closing qty (optional). */
  expectedQtyLabel?: string | null;
};

type StockStatusFilter = "all" | "inStock" | "zero" | "negative";
type ViewMode = "grid" | "list";

function qtyNumber(value: string) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function StockInventoryDirectory({
  items,
  emptyTitle,
  emptyHint,
}: {
  items: StockInventoryItem[];
  emptyTitle?: string;
  emptyHint?: string;
}) {
  const t = useTranslations("stock");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StockStatusFilter>("all");
  const [view, setView] = useState<ViewMode>("list");

  const showExpected = items.some((item) => item.expectedQtyLabel != null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      const qty = qtyNumber(item.baseQty);
      if (status === "inStock" && !(qty > 0)) return false;
      if (status === "zero" && qty !== 0) return false;
      if (status === "negative" && !item.isNegative) return false;
      if (!q) return true;
      return (
        item.sku.toLowerCase().includes(q) ||
        item.displayName.toLowerCase().includes(q) ||
        item.breakdown.toLowerCase().includes(q)
      );
    });
  }, [items, query, status]);

  const statusCounts = useMemo(() => {
    let inStock = 0;
    let zero = 0;
    let negative = 0;
    for (const item of items) {
      const qty = qtyNumber(item.baseQty);
      if (item.isNegative) negative += 1;
      else if (qty === 0) zero += 1;
      else if (qty > 0) inStock += 1;
    }
    return { inStock, zero, negative, all: items.length };
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === items.length
            ? t("listHint", { count: items.length })
            : t("matchedHint", { matched: filtered.length, total: items.length })}
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <section className="surface-panel space-y-2.5 p-3">
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

        <div role="group" aria-label={t("filterStatus")} className="chip-scroll">
          <StatusChip
            pressed={status === "all"}
            onClick={() => setStatus("all")}
            label={t("filterAll")}
            count={statusCounts.all}
          />
          <StatusChip
            pressed={status === "inStock"}
            onClick={() => setStatus("inStock")}
            label={t("filterInStock")}
            count={statusCounts.inStock}
          />
          <StatusChip
            pressed={status === "zero"}
            onClick={() => setStatus("zero")}
            label={t("filterZero")}
            count={statusCounts.zero}
          />
          <StatusChip
            pressed={status === "negative"}
            onClick={() => setStatus("negative")}
            label={t("filterNegative")}
            count={statusCounts.negative}
            icon={AlertTriangle}
          />
        </div>
      </section>

      {items.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? t("empty")}
          hint={emptyHint ?? t("emptyHint")}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("noMatches")}
          hint={t("noMatchesHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          role="list"
        >
          {filtered.map((item) => (
            <li key={item.id}>
              <StockGridCard item={item} showExpected={showExpected} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards" role="list">
            {filtered.map((item) => (
              <li key={item.id}>
                <StockListCard item={item} showExpected={showExpected} />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("product")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("sku")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("baseQty")}
                  </th>
                  {showExpected ? (
                    <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
                      {t("expectedQty")}
                    </th>
                  ) : null}
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("breakdown")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((item) => (
                  <StockTableRow
                    key={item.id}
                    item={item}
                    showExpected={showExpected}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
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
  const t = useTranslations("stock");
  return (
    <div
      role="group"
      aria-label={t("viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("viewGrid")}
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
        aria-label={t("viewList")}
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

function StatusChip({
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
          : "border border-line-strong bg-surface text-fg hover:bg-muted"
      }`}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span>{label}</span>
      <span
        className={`tabular-nums text-xs ${
          pressed ? "opacity-90" : "text-fg-muted"
        }`}
      >
        {count}
      </span>
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
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-10 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-muted text-judi-800 dark:text-judi-200">
        <PackageX className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function NegativeBadge() {
  const t = useTranslations("stock");
  return (
    <span className="inline-flex items-center rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
      {t("negativeBadge")}
    </span>
  );
}

function StockGridCard({
  item,
  showExpected,
}: {
  item: StockInventoryItem;
  showExpected: boolean;
}) {
  const t = useTranslations("stock");
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
      <span className="flex items-center justify-center bg-muted/60 p-3">
        <Thumb
          kind="product"
          size="md"
          src={item.primaryMediaUrl}
          alt={item.displayName}
        />
      </span>
      <span className="flex flex-1 flex-col gap-0.5 p-2.5 text-start">
        <span className="line-clamp-2 text-sm font-semibold text-fg">{item.displayName}</span>
        <span className="text-xs font-medium tabular-nums text-judi-800 dark:text-judi-200">
          {item.sku}
        </span>
        <span className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-sm font-semibold tabular-nums text-fg">
            {item.baseQtyLabel}
          </span>
          {item.isNegative ? <NegativeBadge /> : null}
        </span>
        {item.breakdown ? (
          <span className="line-clamp-1 text-xs text-fg-subtle">{item.breakdown}</span>
        ) : null}
        {showExpected && item.expectedQtyLabel != null ? (
          <span className="text-xs text-fg-muted">
            {t("expectedQty")}:{" "}
            <span className="tabular-nums">{item.expectedQtyLabel}</span>
          </span>
        ) : null}
      </span>
    </article>
  );
}

function StockListCard({
  item,
  showExpected,
}: {
  item: StockInventoryItem;
  showExpected: boolean;
}) {
  const t = useTranslations("stock");
  return (
    <article className="flex min-h-touch items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-sm sm:px-4">
      <Thumb
        kind="product"
        size="sm"
        src={item.primaryMediaUrl}
        alt={item.displayName}
      />
      <div className="min-w-0 flex-1 text-start">
        <p className="truncate font-semibold text-fg">{item.displayName}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
          <span className="font-medium tabular-nums text-fg-muted">{item.sku}</span>
          {item.breakdown ? (
            <>
              <span aria-hidden className="text-line-strong">
                ·
              </span>
              <span className="line-clamp-1">{item.breakdown}</span>
            </>
          ) : null}
        </p>
        {showExpected && item.expectedQtyLabel != null ? (
          <p className="mt-0.5 text-xs text-fg-muted">
            {t("expectedQty")}:{" "}
            <span className="tabular-nums">{item.expectedQtyLabel}</span>
          </p>
        ) : null}
      </div>
      <div className="shrink-0 text-end">
        <p className="font-semibold tabular-nums text-fg">{item.baseQtyLabel}</p>
        {item.isNegative ? (
          <div className="mt-1 flex justify-end">
            <NegativeBadge />
          </div>
        ) : null}
      </div>
    </article>
  );
}

function StockTableRow({
  item,
  showExpected,
}: {
  item: StockInventoryItem;
  showExpected: boolean;
}) {
  return (
    <tr className="min-h-touch">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Thumb
            kind="product"
            size="xs"
            src={item.primaryMediaUrl}
            alt=""
            desktopOnly
          />
          <span className="font-medium text-fg">{item.displayName}</span>
        </div>
      </td>
      <td className="px-4 py-3 tabular-nums text-fg-muted">{item.sku}</td>
      <td className="px-4 py-3">
        <span className="inline-flex flex-wrap items-center gap-2">
          <span className="font-medium tabular-nums text-fg">{item.baseQtyLabel}</span>
          {item.isNegative ? <NegativeBadge /> : null}
        </span>
      </td>
      {showExpected ? (
        <td className="hidden px-4 py-3 tabular-nums text-fg md:table-cell">
          {item.expectedQtyLabel ?? "—"}
        </td>
      ) : null}
      <td className="hidden px-4 py-3 text-fg-muted lg:table-cell">
        {item.breakdown || "—"}
      </td>
    </tr>
  );
}
