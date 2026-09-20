"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Boxes,
  ChevronRight,
  Ellipsis,
  FilePlus2,
  LayoutGrid,
  List,
  PackageSearch,
  RotateCcw,
  Search,
  Store,
  Truck,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { InstantLink } from "@/components/instant-nav";
import { Thumb, type ThumbKind } from "@/components/thumb";
import { iconBadge, tileTone, type UiTone } from "@/lib/ui-tones";

export type FieldHomeTileId =
  | "customers"
  | "addCustomer"
  | "newInvoice"
  | "returnOrder"
  | "collection"
  | "vanStock"
  | "catalog"
  | "more";

export type FieldHomeCategory = "customers" | "sales" | "stock" | "tools";

export type FieldHomeRecentStore = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  primaryMediaUrl: string | null;
};

type ViewMode = "grid" | "list";
type CategoryFilter = "all" | FieldHomeCategory;

type TileDef = {
  id: FieldHomeTileId;
  href:
    | "/field/customers"
    | "/field/customers/new"
    | "/field/invoice"
    | "/field/return"
    | "/field/collection"
    | "/field/stock"
    | "/field/catalog"
    | "/field/more";
  category: FieldHomeCategory;
  icon: LucideIcon;
  thumbKind: ThumbKind;
  titleKey:
    | "customers"
    | "addCustomer"
    | "newInvoice"
    | "returnTitle"
    | "collection"
    | "vanStock"
    | "catalogTitle"
    | "moreTitle";
  hintKey:
    | "customersHint"
    | "addCustomerHint"
    | "newInvoiceHint"
    | "returnHint"
    | "collectionHint"
    | "vanStockHint"
    | "catalogSubtitle"
    | "moreSubtitle";
  tone: UiTone;
};

const TILES: TileDef[] = [
  {
    id: "customers",
    href: "/field/customers",
    category: "customers",
    icon: Users,
    thumbKind: "store",
    titleKey: "customers",
    hintKey: "customersHint",
    tone: "sky",
  },
  {
    id: "addCustomer",
    href: "/field/customers/new",
    category: "customers",
    icon: UserPlus,
    thumbKind: "store",
    titleKey: "addCustomer",
    hintKey: "addCustomerHint",
    tone: "cyan",
  },
  {
    id: "newInvoice",
    href: "/field/invoice",
    category: "sales",
    icon: FilePlus2,
    thumbKind: "product",
    titleKey: "newInvoice",
    hintKey: "newInvoiceHint",
    tone: "teal",
  },
  {
    id: "returnOrder",
    href: "/field/return",
    category: "sales",
    icon: RotateCcw,
    thumbKind: "stock",
    titleKey: "returnTitle",
    hintKey: "returnHint",
    tone: "amber",
  },
  {
    id: "collection",
    href: "/field/collection",
    category: "sales",
    icon: Wallet,
    thumbKind: "stock",
    titleKey: "collection",
    hintKey: "collectionHint",
    tone: "emerald",
  },
  {
    id: "vanStock",
    href: "/field/stock",
    category: "stock",
    icon: PackageSearch,
    thumbKind: "stock",
    titleKey: "vanStock",
    hintKey: "vanStockHint",
    tone: "indigo",
  },
  {
    id: "catalog",
    href: "/field/catalog",
    category: "stock",
    icon: BookOpen,
    thumbKind: "product",
    titleKey: "catalogTitle",
    hintKey: "catalogSubtitle",
    tone: "violet",
  },
  {
    id: "more",
    href: "/field/more",
    category: "tools",
    icon: Ellipsis,
    thumbKind: "warehouse",
    titleKey: "moreTitle",
    hintKey: "moreSubtitle",
    tone: "slate",
  },
];

const CATEGORY_FILTERS: { id: CategoryFilter; icon: LucideIcon; tone: UiTone }[] = [
  { id: "all", icon: LayoutGrid, tone: "teal" },
  { id: "customers", icon: Users, tone: "sky" },
  { id: "sales", icon: FilePlus2, tone: "emerald" },
  { id: "stock", icon: Boxes, tone: "indigo" },
  { id: "tools", icon: Ellipsis, tone: "amber" },
];

export function FieldHomeBoard({
  delegateName,
  delegateMediaUrl,
  warehouseName,
  warehousePlate,
  customerCount,
  todayInvoiceCount,
  stockSkuCount,
  recentStores,
}: {
  delegateName: string;
  delegateMediaUrl: string | null;
  warehouseName: string | null;
  warehousePlate: string | null;
  customerCount: number;
  todayInvoiceCount: number;
  stockSkuCount: number;
  recentStores: FieldHomeRecentStore[];
}) {
  const t = useTranslations("field");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return TILES.filter((tile) => {
      if (category !== "all" && tile.category !== category) return false;
      if (!needle) return true;
      const title = t(tile.titleKey).toLowerCase();
      const hint = t(tile.hintKey).toLowerCase();
      return title.includes(needle) || hint.includes(needle);
    });
  }, [category, query, t]);

  const hasFilters = query.trim().length > 0 || category !== "all";

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <header className="surface-panel p-3 sm:p-4">
        <div className="flex items-center gap-3">
          <Thumb
            kind="person"
            size="md"
            src={delegateMediaUrl}
            alt={delegateName}
            icon={Users}
          />
          <div className="min-w-0 flex-1 text-start">
            <p className="text-xs font-medium text-fg-subtle">{t("welcomeLabel")}</p>
            <h1 className="truncate text-base font-bold tracking-tight text-fg sm:text-xl">
              {t("welcome", { name: delegateName })}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-fg-muted">
              <span className="inline-flex items-center gap-1 truncate">
                <Truck className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
                <span className="truncate">{warehouseName ?? t("noWarehouse")}</span>
              </span>
              {warehousePlate ? (
                <span className="tabular-nums text-fg-subtle" dir="ltr">
                  {warehousePlate}
                </span>
              ) : null}
            </p>
          </div>
        </div>

        <ul className="mt-3 grid grid-cols-3 gap-1.5 sm:gap-2" role="list">
          <StatChip
            icon={Store}
            label={t("statCustomers")}
            value={String(customerCount)}
            tone="sky"
          />
          <StatChip
            icon={FilePlus2}
            label={t("statTodayInvoices")}
            value={String(todayInvoiceCount)}
            tone="teal"
          />
          <StatChip
            icon={PackageSearch}
            label={t("statStockSkus")}
            value={String(stockSkuCount)}
            tone="indigo"
          />
        </ul>
      </header>

      <section className="space-y-2" aria-labelledby="field-board-filters-heading">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="field-board-filters-heading"
            className="text-sm font-semibold text-fg text-start"
          >
            {t("boardTitle")}
          </h2>
          <ViewToggle
            view={view}
            onChange={setView}
            label={t("viewMode")}
            gridLabel={t("viewGrid")}
            listLabel={t("viewList")}
          />
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("searchTools")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchToolsPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-sm text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div role="group" aria-label={t("filterCategory")} className="chip-scroll">
          {CATEGORY_FILTERS.map((item) => {
            const Icon = item.icon;
            const label =
              item.id === "all"
                ? t("allTools")
                : t(
                    item.id === "customers"
                      ? "categoryCustomers"
                      : item.id === "sales"
                        ? "categorySales"
                        : item.id === "stock"
                          ? "categoryStock"
                          : "categoryTools",
                  );
            return (
              <FilterChip
                key={item.id}
                pressed={category === item.id}
                onClick={() => setCategory(item.id)}
                label={label}
                icon={Icon}
                tone={item.tone}
              />
            );
          })}
        </div>
      </section>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title={t("noMatches")}
          hint={t("noMatchesHint")}
          action={
            hasFilters ? (
              <button type="button" onClick={clearFilters} className="btn btn-regular">
                <X className="size-4" aria-hidden />
                {t("clearFilters")}
              </button>
            ) : null
          }
        />
      ) : view === "grid" ? (
        <section className="field-tile-grid" aria-label={t("boardTitle")}>
          {filtered.map((tile) => (
            <TileGridCard key={tile.id} tile={tile} />
          ))}
        </section>
      ) : (
        <section className="flex flex-col gap-1.5" aria-label={t("boardTitle")}>
          {filtered.map((tile) => (
            <TileListRow key={tile.id} tile={tile} />
          ))}
        </section>
      )}

      {recentStores.length > 0 ? (
        <section
          className="space-y-2"
          aria-labelledby="field-recent-stores-heading"
        >
          <div className="flex items-center justify-between gap-2 text-start">
            <h2
              id="field-recent-stores-heading"
              className="text-sm font-semibold text-fg"
            >
              {t("recentStores")}
            </h2>
            <InstantLink
              href="/field/customers"
              className="inline-flex min-h-touch items-center gap-1 rounded-xl px-2 text-sm font-medium text-judi-800 hover:bg-muted dark:text-judi-200"
            >
              {t("openCustomers")}
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </InstantLink>
          </div>

          <ul
            className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3"
            role="list"
          >
            {recentStores.map((store) => (
              <li key={store.id}>
                <InstantLink
                  href="/field/customers"
                  className="flex min-h-touch items-center gap-2.5 rounded-xl border border-line bg-surface px-2.5 py-2 text-start transition-colors duration-75 hover:border-judi-400 hover:bg-muted"
                >
                  <Thumb
                    kind="store"
                    size="sm"
                    src={store.primaryMediaUrl}
                    alt={store.storeName}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {store.storeName}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">
                      {store.ownerName || store.phone}
                    </span>
                  </span>
                  <ChevronRight
                    className="size-4 shrink-0 text-fg-subtle rtl:rotate-180"
                    aria-hidden
                  />
                </InstantLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function TileGridCard({ tile }: { tile: TileDef }) {
  const t = useTranslations("field");
  const Icon = tile.icon;

  return (
    <InstantLink
      href={tile.href}
      className={`flex min-h-touch flex-col justify-between gap-2 rounded-xl border bg-surface p-2.5 text-start transition-colors duration-75 sm:min-h-[7.5rem] sm:gap-3 sm:rounded-2xl sm:p-3.5 ${tileTone(tile.tone)}`}
    >
      <span className={iconBadge(tile.tone, "sm")}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug text-fg sm:text-base">
          {t(tile.titleKey)}
        </span>
        <span className="mt-0.5 hidden text-xs text-fg-muted sm:line-clamp-2 sm:block">
          {t(tile.hintKey)}
        </span>
      </span>
    </InstantLink>
  );
}

function TileListRow({ tile }: { tile: TileDef }) {
  const t = useTranslations("field");
  const Icon = tile.icon;

  return (
    <InstantLink
      href={tile.href}
      className={`flex min-h-touch items-center gap-2.5 rounded-xl border bg-surface px-2.5 py-2 text-start transition-colors duration-75 sm:gap-3 sm:px-3 ${tileTone(tile.tone)}`}
    >
      <span className={iconBadge(tile.tone)}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-fg">{t(tile.titleKey)}</span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {t(tile.hintKey)}
        </span>
      </span>
      <ChevronRight
        className="size-4 shrink-0 text-fg-subtle rtl:rotate-180"
        aria-hidden
      />
    </InstantLink>
  );
}

function StatChip({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: UiTone;
}) {
  return (
    <li className="flex min-h-touch flex-col justify-center gap-0.5 rounded-xl border border-line bg-muted/40 px-2 py-1.5 text-start sm:flex-row sm:items-center sm:gap-2 sm:px-3">
      <span className={`${iconBadge(tone, "sm")} sm:size-9 sm:rounded-xl`}>
        <Icon className="size-3.5 sm:size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[10px] leading-tight text-fg-subtle sm:text-xs">
          {label}
        </span>
        <span className="block text-base font-bold tabular-nums leading-tight text-fg sm:text-lg">
          {value}
        </span>
      </span>
    </li>
  );
}

function ViewToggle({
  view,
  onChange,
  label,
  gridLabel,
  listLabel,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
  label: string;
  gridLabel: string;
  listLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-0.5"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={gridLabel}
        onClick={() => onChange("grid")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-2.5 transition-colors ${
          view === "grid" ? "seg-on" : "seg-off border-0"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        aria-label={listLabel}
        onClick={() => onChange("list")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-2.5 transition-colors ${
          view === "list" ? "seg-on" : "seg-off border-0"
        }`}
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function FilterChip({
  label,
  pressed,
  onClick,
  icon: Icon,
  tone,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  tone: UiTone;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`chip ${pressed ? "chip-on" : "chip-off"}`}
    >
      {Icon ? (
        <Icon
          className={`size-3.5 shrink-0 ${pressed ? "" : `tab-${tone}`}`}
          aria-hidden
        />
      ) : null}
      {label}
    </button>
  );
}

function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-muted/40 px-3 py-6 text-center">
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-judi-800 dark:text-judi-200">
        <Icon className="size-5" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-xs text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}
