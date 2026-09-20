"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  FolderOpen,
  LayoutGrid,
  List,
  Package,
  Search,
  Tags,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { ProductMediaPanel } from "@/components/product-media-panel";
import { Thumb } from "@/components/thumb";
import { formatMoney } from "@/lib/money";
import { productMatchesBarcodeQuery } from "@/lib/barcode-resolve";

export type FieldCatalogItem = {
  id: string;
  sku: string;
  barcode: string | null;
  displayName: string;
  displayCategory: string;
  displaySubcategory: string | null;
  priceCurrency: "IQD" | "USD" | "BOTH";
  primaryMediaUrl: string | null;
  units: {
    id: string;
    barcode: string | null;
    displayName: string;
    conversionRatio: string;
    sellingPrice: string;
    sellingPriceUsd: string;
  }[];
};

type ViewMode = "grid" | "list";

function formatUnitPrice(
  currency: FieldCatalogItem["priceCurrency"],
  iqd: string,
  usd: string,
) {
  if (currency === "USD") return formatMoney(usd, "USD");
  if (currency === "BOTH") {
    return `${formatMoney(iqd, "IQD")} · ${formatMoney(usd, "USD")}`;
  }
  return formatMoney(iqd, "IQD");
}

export function FieldCatalogDirectory({
  products,
}: {
  products: FieldCatalogItem[];
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [thumbById, setThumbById] = useState<Record<string, string | null>>(() =>
    Object.fromEntries(products.map((product) => [product.id, product.primaryMediaUrl])),
  );

  const categories = useMemo(() => {
    const seen = new Map<string, string>();
    for (const product of products) {
      const key = product.displayCategory.trim().toLowerCase();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, product.displayCategory);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (category !== "all") {
        if (product.displayCategory.trim().toLowerCase() !== category) return false;
      }
      if (!q) return true;
      return (
        productMatchesBarcodeQuery(
          {
            id: product.id,
            sku: product.sku,
            barcode: product.barcode,
            name: product.displayName,
            units: product.units.map((unit) => ({
              id: unit.id,
              barcode: unit.barcode,
              conversionRatio: unit.conversionRatio,
            })),
          },
          q,
        ) ||
        product.displayCategory.toLowerCase().includes(q) ||
        (product.displaySubcategory?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [category, products, query]);

  function clearFilters() {
    setQuery("");
    setCategory("all");
  }

  function thumbSrc(product: FieldCatalogItem) {
    return thumbById[product.id] ?? product.primaryMediaUrl;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === products.length
            ? t("products.listHint", { count: products.length })
            : t("products.matchedHint", {
                matched: filtered.length,
                total: products.length,
              })}
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <section
        aria-labelledby="field-catalog-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="field-catalog-filters-heading" className="sr-only">
          {t("products.filtersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("products.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("products.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div role="group" aria-label={t("products.filterCategory")} className="chip-scroll">
          <FilterChip
            pressed={category === "all"}
            onClick={() => setCategory("all")}
            label={t("products.allCategories")}
            icon={Tags}
          />
          {categories.map((name) => (
            <FilterChip
              key={name}
              pressed={category === name.trim().toLowerCase()}
              onClick={() => setCategory(name.trim().toLowerCase())}
              label={name}
              icon={FolderOpen}
            />
          ))}
        </div>

        {query || category !== "all" ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
          >
            {t("products.clearFilters")}
          </button>
        ) : null}
      </section>

      {products.length === 0 ? (
        <EmptyState title={t("products.empty")} hint={t("products.emptyHint")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("products.noMatches")}
          hint={t("products.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("products.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          role="list"
        >
          {filtered.map((product) => {
            const baseUnit = product.units[0];
            const open = expandedId === product.id;
            return (
              <li key={product.id}>
                <article className="flex h-full flex-col overflow-hidden rounded-xl border border-line bg-surface">
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : product.id)}
                    className="flex flex-1 flex-col text-start"
                  >
                    <span className="flex items-center justify-center bg-muted/60 p-3">
                      <Thumb
                        kind="product"
                        size="md"
                        src={thumbSrc(product)}
                        alt={product.displayName}
                      />
                    </span>
                    <span className="flex flex-1 flex-col gap-0.5 p-2.5">
                      <span className="line-clamp-2 text-sm font-semibold text-fg">
                        {product.displayName}
                      </span>
                      <span className="text-xs font-medium tabular-nums text-judi-800 dark:text-judi-200">
                        {product.sku}
                      </span>
                      <span className="line-clamp-1 text-xs text-fg-subtle">
                        {product.displayCategory}
                      </span>
                      {baseUnit ? (
                        <span className="mt-auto pt-1 text-sm font-semibold text-fg">
                          {formatUnitPrice(
                            product.priceCurrency,
                            baseUnit.sellingPrice,
                            baseUnit.sellingPriceUsd,
                          )}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  {open ? (
                    <div className="space-y-2 border-t border-line p-2.5">
                      <ProductMediaPanel
                        productId={product.id}
                        productName={product.displayName || product.sku}
                        initialPrimaryUrl={thumbSrc(product)}
                        canEdit
                        defaultOpen
                        compact
                        onPrimaryUrlChange={(url) =>
                          setThumbById((prev) => ({ ...prev, [product.id]: url }))
                        }
                      />
                      <UnitList product={product} />
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="space-y-3" role="list">
          {filtered.map((product) => {
            const baseUnit = product.units[0];
            const open = expandedId === product.id;
            return (
              <li key={product.id}>
                <article
                  id={`product-${product.id}`}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : product.id)}
                    className="flex w-full min-h-touch items-start gap-3 text-start"
                  >
                    <Thumb
                      kind="product"
                      size="md"
                      src={thumbSrc(product)}
                      alt={product.displayName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-judi-700 dark:text-judi-400">
                        {product.sku}
                      </p>
                      <h2 className="text-lg font-semibold text-fg">{product.displayName}</h2>
                      <p className="mt-1 inline-flex items-center gap-1 text-sm text-fg-muted">
                        <FolderOpen className="size-3.5 shrink-0" aria-hidden />
                        {product.displayCategory}
                        {product.displaySubcategory
                          ? ` / ${product.displaySubcategory}`
                          : ""}
                      </p>
                    </div>
                    {baseUnit ? (
                      <p className="shrink-0 text-sm font-semibold text-judi-900 text-end dark:text-judi-200">
                        {formatUnitPrice(
                          product.priceCurrency,
                          baseUnit.sellingPrice,
                          baseUnit.sellingPriceUsd,
                        )}
                      </p>
                    ) : null}
                  </button>
                  {open ? (
                    <div className="mt-3 space-y-3 border-t border-line pt-3">
                      <ProductMediaPanel
                        productId={product.id}
                        productName={product.displayName || product.sku}
                        initialPrimaryUrl={thumbSrc(product)}
                        canEdit
                        defaultOpen
                        onPrimaryUrlChange={(url) =>
                          setThumbById((prev) => ({ ...prev, [product.id]: url }))
                        }
                      />
                      <UnitList product={product} />
                    </div>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UnitList({ product }: { product: FieldCatalogItem }) {
  return (
    <ul className="space-y-1 text-sm text-fg-muted">
      {product.units.map((unit) => (
        <li key={unit.id} className="flex justify-between gap-3 text-start">
          <span>
            {unit.displayName}
            <span className="text-fg-subtle"> (×{unit.conversionRatio})</span>
          </span>
          <span className="font-medium text-fg text-end">
            {formatUnitPrice(
              product.priceCurrency,
              unit.sellingPrice,
              unit.sellingPriceUsd,
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const t = useTranslations("products");
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

function FilterChip({
  label,
  pressed,
  onClick,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: typeof Tags;
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
