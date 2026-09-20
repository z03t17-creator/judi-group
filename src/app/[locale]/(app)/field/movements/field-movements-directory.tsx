"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  CalendarRange,
  ChevronRight,
  FileText,
  LayoutGrid,
  List,
  Package,
  PackageMinus,
  RotateCcw,
  Search,
  Truck,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Thumb, type ThumbKind } from "@/components/thumb";
import type {
  FieldActivityCollection,
  FieldActivityInvoice,
  FieldActivityStockMove,
} from "@/lib/field-activity-load";

type ViewMode = "grid" | "list";
type KindFilter = "all" | "sale" | "return" | "collection" | "stock";

export type FieldMovementKind = "sale" | "return" | "collection" | "stock";

export type FieldMovementRow = {
  id: string;
  kind: FieldMovementKind;
  title: string;
  subtitle: string;
  thumbUrl: string | null;
  thumbKind: ThumbKind;
  amountLabel: string | null;
  metaLabel: string;
  dateYmd: string;
  createdAtIso: string;
  href: string | null;
  stockType?: FieldActivityStockMove["type"];
};

const KIND_ICONS: Record<FieldMovementKind, LucideIcon> = {
  sale: FileText,
  return: RotateCcw,
  collection: Wallet,
  stock: Package,
};

const STOCK_ICONS: Record<FieldActivityStockMove["type"], LucideIcon> = {
  RECEIVE: ArrowDownToLine,
  WRITE_OFF: PackageMinus,
  TRANSFER_IN: Truck,
  TRANSFER_OUT: ArrowUpFromLine,
  SALE: FileText,
  GIFT: Package,
  RETURN: RotateCcw,
  STORE_OUT: ArrowUpFromLine,
  STORE_IN: ArrowDownToLine,
};

export function buildFieldMovements(input: {
  invoices: FieldActivityInvoice[];
  collections: FieldActivityCollection[];
  stockMoves: FieldActivityStockMove[];
  stockTypeLabel: (type: FieldActivityStockMove["type"]) => string;
}): FieldMovementRow[] {
  const rows: FieldMovementRow[] = [];

  for (const inv of input.invoices) {
    const isReturn = inv.invoiceType === "RETURN";
    rows.push({
      id: `inv-${inv.id}`,
      kind: isReturn ? "return" : "sale",
      title: inv.invoiceNumber,
      subtitle: inv.storeName,
      thumbUrl: inv.storeThumbUrl,
      thumbKind: "store",
      amountLabel: inv.totalLabel,
      metaLabel: inv.invoiceType,
      dateYmd: inv.dateYmd,
      createdAtIso: inv.createdAtIso,
      href: `/field/invoice/${inv.id}`,
    });
  }

  for (const col of input.collections) {
    rows.push({
      id: `col-${col.id}`,
      kind: "collection",
      title: col.receiptNumber,
      subtitle: col.storeName,
      thumbUrl: col.storeThumbUrl,
      thumbKind: "store",
      amountLabel: col.amountLabel,
      metaLabel: col.paymentMethod,
      dateYmd: col.dateYmd,
      createdAtIso: col.createdAtIso,
      href: `/field/collection?ok=${col.id}`,
    });
  }

  for (const move of input.stockMoves) {
    rows.push({
      id: `stk-${move.id}`,
      kind: "stock",
      title: move.productLabel,
      subtitle: input.stockTypeLabel(move.type),
      thumbUrl: move.productThumbUrl,
      thumbKind: "product",
      amountLabel: null,
      metaLabel: move.qtyLabel,
      dateYmd: move.dateYmd,
      createdAtIso: move.createdAtIso,
      href: "/field/stock",
      stockType: move.type,
    });
  }

  return rows.sort((a, b) => b.createdAtIso.localeCompare(a.createdAtIso));
}

export function FieldMovementsDirectory({
  invoices,
  collections,
  stockMoves,
}: {
  invoices: FieldActivityInvoice[];
  collections: FieldActivityCollection[];
  stockMoves: FieldActivityStockMove[];
}) {
  const t = useTranslations("field");
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [view, setView] = useState<ViewMode>("list");

  const allRows = useMemo(
    () =>
      buildFieldMovements({
        invoices,
        collections,
        stockMoves,
        stockTypeLabel: (type) => t(`movementsStockType.${type}`),
      }),
    [collections, invoices, stockMoves, t],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return allRows.filter((row) => {
      if (kind !== "all" && row.kind !== kind) return false;
      if (from && row.dateYmd < from) return false;
      if (to && row.dateYmd > to) return false;
      if (!needle) return true;
      return (
        row.title.toLowerCase().includes(needle) ||
        row.subtitle.toLowerCase().includes(needle) ||
        row.metaLabel.toLowerCase().includes(needle) ||
        (row.amountLabel?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [allRows, from, kind, query, to]);

  const filtersActive =
    kind !== "all" || from.length > 0 || to.length > 0 || query.trim().length > 0;

  function clearFilters() {
    setQuery("");
    setKind("all");
    setFrom("");
    setTo("");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-start text-sm text-fg-muted">
          {filtered.length === allRows.length
            ? t("movementsListHint", { count: allRows.length })
            : t("movementsMatched", {
                matched: filtered.length,
                total: allRows.length,
              })}
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <section
        aria-labelledby="field-movements-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <div className="flex items-center gap-2 text-start">
          <CalendarRange
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <h2
            id="field-movements-filters-heading"
            className="text-sm font-semibold text-fg"
          >
            {t("movementsFiltersTitle")}
          </h2>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("movementsSearch")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("movementsSearchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line bg-canvas pe-3 ps-10 text-fg placeholder:text-fg-subtle"
          />
        </label>

        <div className="chip-scroll" role="group" aria-label={t("movementsKindLabel")}>
          {(["all", "sale", "return", "collection", "stock"] as const).map((id) => (
            <FilterChip
              key={id}
              active={kind === id}
              onClick={() => setKind(id)}
              label={t(`movementsKind.${id}`)}
              icon={id === "all" ? LayoutGrid : KIND_ICONS[id]}
            />
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-start text-sm">
            <span className="mb-1 block font-medium text-fg">{t("movementsFrom")}</span>
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg"
            />
          </label>
          <label className="block text-start text-sm">
            <span className="mb-1 block font-medium text-fg">{t("movementsTo")}</span>
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg"
            />
          </label>
        </div>

        {filtersActive ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-touch items-center gap-2 rounded-xl px-3 text-sm font-medium text-judi-800 hover:bg-muted dark:text-judi-200"
          >
            <X className="size-4" aria-hidden />
            {t("movementsClearFilters")}
          </button>
        ) : null}
      </section>

      {filtered.length === 0 ? (
        <EmptyState hasRows={allRows.length > 0} />
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <li key={row.id}>
              <MovementCard row={row} view="grid" />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards space-y-2">
            {filtered.map((row) => (
              <li key={row.id}>
                <MovementCard row={row} view="list" />
              </li>
            ))}
          </ul>
          <MovementsTable rows={filtered} />
        </>
      )}
    </div>
  );
}

function kindIcon(row: FieldMovementRow): LucideIcon {
  if (row.kind === "stock" && row.stockType) return STOCK_ICONS[row.stockType];
  return KIND_ICONS[row.kind];
}

function MovementsTable({ rows }: { rows: FieldMovementRow[] }) {
  const t = useTranslations("field");
  const router = useRouter();

  return (
    <div className="directory-table overflow-x-auto rounded-2xl border border-line bg-surface shadow-sm">
      <table className="w-full min-w-[40rem] text-start text-sm">
        <thead className="border-b border-line bg-muted/50 text-fg-muted">
          <tr>
            <th className="px-3 py-3 font-medium">{t("movementsColWhat")}</th>
            <th className="px-3 py-3 font-medium">{t("movementsColParty")}</th>
            <th className="px-3 py-3 font-medium">{t("movementsColKind")}</th>
            <th className="px-3 py-3 font-medium">{t("movementsColAmount")}</th>
            <th className="px-3 py-3 font-medium">{t("movementsColDate")}</th>
            <th className="px-3 py-3 font-medium">
              <span className="sr-only">{t("movementsColOpen")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const Icon = kindIcon(row);
            return (
              <tr
                key={row.id}
                tabIndex={row.href ? 0 : undefined}
                onClick={() => {
                  if (row.href) router.push(row.href as "/field");
                }}
                onKeyDown={(event) => {
                  if (!row.href) return;
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    router.push(row.href as "/field");
                  }
                }}
                className={`border-b border-line last:border-0 ${
                  row.href ? "cursor-pointer hover:bg-muted/40" : ""
                }`}
              >
                <td className="px-3 py-2">
                  <div className="flex min-h-touch items-center gap-3">
                    <Thumb
                      kind={row.thumbKind}
                      size="xs"
                      src={row.thumbUrl}
                      icon={Icon}
                      alt=""
                      desktopOnly
                    />
                    <span className="font-medium text-fg tabular-nums">{row.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-fg-muted">{row.subtitle}</td>
                <td className="px-3 py-2">
                  <KindBadge kind={row.kind} />
                </td>
                <td className="px-3 py-2 tabular-nums text-fg" dir="ltr">
                  {row.amountLabel ?? row.metaLabel}
                </td>
                <td className="px-3 py-2 tabular-nums text-fg-muted">{row.dateYmd}</td>
                <td className="px-3 py-2">
                  {row.href ? (
                    <ChevronRight
                      className="size-4 text-fg-subtle rtl:rotate-180"
                      aria-hidden
                    />
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function MovementCard({ row, view }: { row: FieldMovementRow; view: ViewMode }) {
  const t = useTranslations("field");
  const Icon = KIND_ICONS[row.kind];
  const body = (
    <div
      className={`flex min-h-touch gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-sm transition hover:border-judi-500 hover:bg-accent-soft/60 ${
        view === "grid" ? "h-full flex-col" : "items-center"
      }`}
    >
      <div className="flex items-center gap-3">
        <Thumb
          kind={row.thumbKind}
          size={view === "grid" ? "md" : "sm"}
          src={row.thumbUrl}
          icon={Icon}
          alt=""
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-fg tabular-nums">{row.title}</p>
            <KindBadge kind={row.kind} />
          </div>
          <p className="mt-0.5 truncate text-sm text-fg-muted">{row.subtitle}</p>
          {view === "list" ? (
            <p className="mt-1 text-xs text-fg-subtle">
              <span className="tabular-nums">{row.dateYmd}</span>
              {row.metaLabel ? (
                <>
                  <span aria-hidden className="mx-1">
                    ·
                  </span>
                  <span>{row.metaLabel}</span>
                </>
              ) : null}
            </p>
          ) : null}
        </div>
        {view === "list" ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            {row.amountLabel ? (
              <p className="font-semibold tabular-nums text-fg" dir="ltr">
                {row.amountLabel}
              </p>
            ) : (
              <p className="text-sm tabular-nums text-fg-muted" dir="ltr">
                {row.metaLabel}
              </p>
            )}
            <ChevronRight className="size-5 text-fg-subtle rtl:rotate-180" aria-hidden />
          </div>
        ) : null}
      </div>

      {view === "grid" ? (
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="min-w-0 text-start">
            <p className="text-xs text-fg-subtle tabular-nums">{row.dateYmd}</p>
            <p className="truncate text-xs text-fg-muted">{row.metaLabel}</p>
          </div>
          {row.amountLabel ? (
            <p className="shrink-0 text-lg font-bold tabular-nums text-fg" dir="ltr">
              {row.amountLabel}
            </p>
          ) : (
            <p className="shrink-0 text-sm font-semibold tabular-nums text-fg" dir="ltr">
              {row.metaLabel}
            </p>
          )}
        </div>
      ) : null}
      <span className="sr-only">{t(`movementsKind.${row.kind}`)}</span>
    </div>
  );

  if (!row.href) return body;
  return (
    <Link href={row.href as "/field"} className="block h-full">
      {body}
    </Link>
  );
}

function KindBadge({ kind }: { kind: FieldMovementKind }) {
  const t = useTranslations("field");
  const Icon = KIND_ICONS[kind];
  const tones: Record<FieldMovementKind, string> = {
    sale: "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100",
    return: "bg-amber-100 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100",
    collection: "bg-emerald-100 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100",
    stock: "bg-muted text-fg",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-medium ${tones[kind]}`}
    >
      <Icon className="size-3" aria-hidden />
      {t(`movementsKind.${kind}`)}
    </span>
  );
}

function EmptyState({ hasRows }: { hasRows: boolean }) {
  const t = useTranslations("field");
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-12 text-center">
      <Thumb kind="stock" size="lg" src={null} icon={Package} alt="" />
      <div>
        <p className="font-semibold text-fg">
          {hasRows ? t("movementsNoMatch") : t("movementsEmpty")}
        </p>
        <p className="mt-1 max-w-sm text-sm text-fg-muted">
          {hasRows ? t("movementsNoMatchHint") : t("movementsEmptyHint")}
        </p>
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
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium ${
        active
          ? "bg-judi-700 text-white"
          : "border border-line-strong bg-surface text-fg hover:bg-muted"
      }`}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
  );
}
