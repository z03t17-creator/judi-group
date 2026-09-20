"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  Barcode,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  List,
  Package,
  Plus,
  Search,
  Tags,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import { deleteProductAction } from "./actions";

export type ProductsDirectoryItem = {
  id: string;
  sku: string;
  barcode: string | null;
  displayName: string;
  displayCategory: string;
  displaySubcategory: string | null;
  unitsCount: number;
  baseCost: string;
  primaryMediaUrl: string | null;
};

type ViewMode = "grid" | "list";

export function ProductsDirectory({
  products,
  canManage,
}: {
  products: ProductsDirectoryItem[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [view, setView] = useState<ViewMode>("grid");

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
        if (product.displayCategory.trim().toLowerCase() !== category) {
          return false;
        }
      }
      if (!q) return true;
      return (
        product.sku.toLowerCase().includes(q) ||
        product.displayName.toLowerCase().includes(q) ||
        product.displayCategory.toLowerCase().includes(q) ||
        (product.displaySubcategory?.toLowerCase().includes(q) ?? false) ||
        (product.barcode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [category, products, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === products.length
            ? t("products.listHint", { count: products.length })
            : t("products.matchedHint", {
                matched: filtered.length,
                total: products.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          {canManage ? (
            <>
              <Link
                href="/dashboard/categories"
                className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 font-medium text-fg hover:bg-muted sm:px-4"
              >
                <Tags className="size-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">
                  {t("products.manageCategories")}
                </span>
              </Link>
              <Link
                href="/dashboard/products/new"
                className="btn btn-important"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                {t("products.create")}
              </Link>
            </>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="products-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="products-filters-heading" className="sr-only">
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

        <div
          role="group"
          aria-label={t("products.filterCategory")}
          className="chip-scroll"
        >
          <CategoryChip
            pressed={category === "all"}
            onClick={() => setCategory("all")}
            label={t("products.allCategories")}
          />
          {categories.map((item) => {
            const value = item.trim().toLowerCase();
            return (
              <CategoryChip
                key={value}
                pressed={category === value}
                onClick={() => setCategory(value)}
                label={item}
              />
            );
          })}
        </div>
      </section>

      {products.length === 0 ? (
        <EmptyState
          title={t("products.empty")}
          hint={canManage ? t("products.emptyHint") : undefined}
          action={
            canManage ? (
              <Link
                href="/dashboard/products/new"
                className="btn btn-important"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                {t("products.create")}
              </Link>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("products.noMatches")}
          hint={t("products.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("products.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          {filtered.map((product) => (
            <li key={product.id}>
              <ProductGridCard product={product} canManage={canManage} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards" role="list">
            {filtered.map((product) => (
              <li key={product.id}>
                <ProductListCard product={product} canManage={canManage} />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("products.name")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("products.sku")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
                    {t("products.category")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("products.barcode")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("products.units")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("products.openProduct")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((product) => (
                  <ProductTableRow
                    key={product.id}
                    product={product}
                    canManage={canManage}
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
  const t = useTranslations();
  return (
    <div
      role="group"
      aria-label={t("products.viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("products.viewGrid")}
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
        aria-label={t("products.viewList")}
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

function CategoryChip({
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
        <Package className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function ProductMeta({ product }: { product: ProductsDirectoryItem }) {
  const t = useTranslations();
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span className="font-medium tabular-nums text-fg-muted">{product.sku}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span className="inline-flex min-w-0 items-center gap-1 truncate">
        <FolderOpen className="size-3.5 shrink-0" aria-hidden />
        {product.displayCategory}
        {product.displaySubcategory ? ` / ${product.displaySubcategory}` : ""}
      </span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span className="tabular-nums">
        {t("products.unitsCount", { count: product.unitsCount })}
      </span>
      {product.barcode ? (
        <>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Barcode className="size-3.5" aria-hidden />
            {product.barcode}
          </span>
        </>
      ) : null}
    </span>
  );
}

function ProductGridCard({
  product,
  canManage,
}: {
  product: ProductsDirectoryItem;
  canManage: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="flex min-h-touch items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-2 shadow-sm">
      <Link
        href={`/dashboard/products/${product.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-start transition-colors hover:bg-muted/40 focus-visible:outline-none"
      >
        <Thumb
          kind="product"
          size="sm"
          src={product.primaryMediaUrl}
          alt={product.displayName}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">
            {product.displayName}
          </span>
          <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-judi-800 dark:text-judi-200">
            {product.sku}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
            <span className="truncate">
              {product.displayCategory}
              {product.displaySubcategory
                ? ` / ${product.displaySubcategory}`
                : ""}
            </span>
            <span aria-hidden className="text-line-strong">
              ·
            </span>
            <span className="shrink-0 tabular-nums text-fg-muted">
              {t("products.unitsCount", { count: product.unitsCount })}
            </span>
          </span>
        </span>
      </Link>
      {canManage ? <DeleteProductButton productId={product.id} /> : null}
    </div>
  );
}

function ProductListCard({
  product,
  canManage,
}: {
  product: ProductsDirectoryItem;
  canManage: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="flex min-h-touch items-center gap-2 rounded-2xl border border-line bg-surface px-2.5 py-2 shadow-sm sm:px-3">
      <Link
        href={`/dashboard/products/${product.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-start transition-colors hover:text-judi-900 focus-visible:outline-none dark:hover:text-judi-100"
      >
        <Thumb
          kind="product"
          size="sm"
          src={product.primaryMediaUrl}
          alt={product.displayName}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-fg">
            {product.displayName}
          </span>
          <ProductMeta product={product} />
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-judi-800 dark:text-judi-200">
          {canManage ? t("products.openProduct") : t("products.view")}
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </span>
      </Link>
      {canManage ? <DeleteProductButton productId={product.id} /> : null}
    </div>
  );
}

function ProductTableRow({
  product,
  canManage,
}: {
  product: ProductsDirectoryItem;
  canManage: boolean;
}) {
  const t = useTranslations();
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        <Link
          href={`/dashboard/products/${product.id}`}
          className="flex min-h-touch items-center gap-3 text-start font-medium text-fg hover:text-judi-800 dark:hover:text-judi-200"
        >
          <Thumb
            kind="product"
            size="xs"
            src={product.primaryMediaUrl}
            alt=""
            desktopOnly
          />
          <span className="truncate">{product.displayName}</span>
        </Link>
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted">{product.sku}</td>
      <td className="hidden px-4 py-2 text-fg-muted md:table-cell">
        <span className="line-clamp-1">
          {product.displayCategory}
          {product.displaySubcategory ? ` / ${product.displaySubcategory}` : ""}
        </span>
      </td>
      <td className="hidden px-4 py-2 tabular-nums text-fg-subtle lg:table-cell">
        {product.barcode ?? "—"}
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted">
        {t("products.unitsCount", { count: product.unitsCount })}
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-1">
          <Link
            href={`/dashboard/products/${product.id}`}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
            aria-label={canManage ? t("products.openProduct") : t("products.view")}
          >
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </Link>
          {canManage ? <DeleteProductButton productId={product.id} /> : null}
        </div>
      </td>
    </tr>
  );
}

function DeleteProductButton({ productId }: { productId: string }) {
  const t = useTranslations();
  return (
    <form action={deleteProductAction} className="shrink-0">
      <input type="hidden" name="id" value={productId} />
      <button
        type="submit"
        className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
        aria-label={t("products.delete")}
      >
        <Trash2 className="size-4" aria-hidden />
      </button>
    </form>
  );
}
