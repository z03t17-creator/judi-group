"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  ChevronRight,
  FolderTree,
  Languages,
  LayoutGrid,
  List,
  Package,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import {
  createCategoryAction,
  createSubcategoryAction,
  deleteCategoryAction,
  deleteSubcategoryAction,
  updateCategoryAction,
  updateSubcategoryAction,
} from "./actions";

export type CategoryRow = {
  id: string;
  displayName: string;
  nameEn: string;
  nameAr: string;
  nameCkb: string;
  productCount: number;
  subcategories: {
    id: string;
    displayName: string;
    nameEn: string;
    nameAr: string;
    nameCkb: string;
    productCount: number;
  }[];
};

type Panel =
  | { mode: "closed" }
  | { mode: "createCategory" }
  | { mode: "editCategory"; id: string }
  | { mode: "createSub"; categoryId: string }
  | { mode: "editSub"; id: string; categoryId: string };

type ViewMode = "grid" | "list";
type StatusFilter = "all" | "withProducts" | "empty" | "withSubs";

export function CategoriesDirectory({
  categories,
  canManage,
}: {
  categories: CategoryRow[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const titleId = useId();

  const editingCategory =
    panel.mode === "editCategory"
      ? categories.find((item) => item.id === panel.id) ?? null
      : null;

  const editingSub =
    panel.mode === "editSub"
      ? categories
          .flatMap((cat) =>
            cat.subcategories.map((sub) => ({ ...sub, categoryId: cat.id })),
          )
          .find((item) => item.id === panel.id) ?? null
      : null;

  const createSubParent =
    panel.mode === "createSub"
      ? categories.find((item) => item.id === panel.categoryId) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories.filter((category) => {
      if (statusFilter === "withProducts" && category.productCount === 0) {
        return false;
      }
      if (statusFilter === "empty" && category.productCount > 0) {
        return false;
      }
      if (statusFilter === "withSubs" && category.subcategories.length === 0) {
        return false;
      }
      if (!q) return true;
      const inName =
        category.displayName.toLowerCase().includes(q) ||
        category.nameEn.toLowerCase().includes(q) ||
        category.nameAr.toLowerCase().includes(q) ||
        category.nameCkb.toLowerCase().includes(q);
      if (inName) return true;
      return category.subcategories.some(
        (sub) =>
          sub.displayName.toLowerCase().includes(q) ||
          sub.nameEn.toLowerCase().includes(q) ||
          sub.nameAr.toLowerCase().includes(q) ||
          sub.nameCkb.toLowerCase().includes(q),
      );
    });
  }, [categories, query, statusFilter]);

  useEffect(() => {
    if (panel.mode === "closed") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.mode]);

  useEffect(() => {
    if (panel.mode === "editCategory" && !editingCategory) {
      setPanel({ mode: "closed" });
    }
    if (panel.mode === "editSub" && !editingSub) {
      setPanel({ mode: "closed" });
    }
    if (panel.mode === "createSub" && !createSubParent) {
      setPanel({ mode: "closed" });
    }
  }, [createSubParent, editingCategory, editingSub, panel.mode]);

  function openCategory(id: string) {
    if (!canManage) return;
    setPanel({ mode: "editCategory", id });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === categories.length
            ? t("categories.listHint", { count: categories.length })
            : t("categories.matchedHint", {
                matched: filtered.length,
                total: categories.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Link
            href="/dashboard/products"
            className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 font-medium text-fg hover:bg-muted sm:px-4"
          >
            <Package className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{t("categories.toProducts")}</span>
          </Link>
          {canManage ? (
            <button
              type="button"
              onClick={() => setPanel({ mode: "createCategory" })}
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("categories.create")}
            </button>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="categories-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="categories-filters-heading" className="sr-only">
          {t("categories.filtersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("categories.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("categories.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div
          role="group"
          aria-label={t("categories.filterStatus")}
          className="chip-scroll"
        >
          <StatusChip
            pressed={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={t("categories.filterAll")}
          />
          <StatusChip
            pressed={statusFilter === "withProducts"}
            onClick={() => setStatusFilter("withProducts")}
            label={t("categories.filterWithProducts")}
          />
          <StatusChip
            pressed={statusFilter === "empty"}
            onClick={() => setStatusFilter("empty")}
            label={t("categories.filterEmpty")}
          />
          <StatusChip
            pressed={statusFilter === "withSubs"}
            onClick={() => setStatusFilter("withSubs")}
            label={t("categories.filterWithSubs")}
            icon
          />
        </div>
      </section>

      {categories.length === 0 ? (
        <EmptyState
          title={t("categories.empty")}
          hint={canManage ? t("categories.emptyHint") : undefined}
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => setPanel({ mode: "createCategory" })}
                className="btn btn-important"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                {t("categories.create")}
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("categories.noMatches")}
          hint={t("categories.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatusFilter("all");
              }}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("categories.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          {filtered.map((category) => (
            <li key={category.id}>
              <CategoryGridCard
                category={category}
                canManage={canManage}
                onOpen={() => openCategory(category.id)}
                onAddSub={() =>
                  setPanel({ mode: "createSub", categoryId: category.id })
                }
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards" role="list">
            {filtered.map((category) => (
              <li key={category.id}>
                <CategoryListCard
                  category={category}
                  canManage={canManage}
                  onOpen={() => openCategory(category.id)}
                  onAddSub={() =>
                    setPanel({ mode: "createSub", categoryId: category.id })
                  }
                  onEditSub={(subId) =>
                    setPanel({
                      mode: "editSub",
                      id: subId,
                      categoryId: category.id,
                    })
                  }
                />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("categories.nameColumn")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("categories.productsColumn")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
                    {t("categories.subsColumn")}
                  </th>
                  {canManage ? (
                    <th className="px-4 py-3 font-medium" scope="col">
                      <span className="sr-only">{t("categories.openCategory")}</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((category) => (
                  <CategoryTableRow
                    key={category.id}
                    category={category}
                    canManage={canManage}
                    onOpen={() => openCategory(category.id)}
                    onAddSub={() =>
                      setPanel({ mode: "createSub", categoryId: category.id })
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {canManage && panel.mode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/50 dark:bg-black/70"
            aria-label={t("categories.dismissOverlay")}
            onClick={() => setPanel({ mode: "closed" })}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-line px-4 py-4 text-start sm:px-5">
              <span className="icon-badge icon-badge-md tone-sky">
                {panel.mode === "createCategory" || panel.mode === "createSub" ? (
                  <Plus className="size-5" aria-hidden />
                ) : panel.mode === "editSub" ? (
                  <FolderTree className="size-5" aria-hidden />
                ) : (
                  <Tags className="size-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-semibold text-fg">
                  {panel.mode === "createCategory"
                    ? t("categories.create")
                    : panel.mode === "editCategory"
                      ? t("categories.edit")
                      : panel.mode === "createSub"
                        ? t("categories.addSub")
                        : t("categories.editSub")}
                </h2>
                <p className="text-sm text-fg-subtle">
                  {panel.mode === "createCategory"
                    ? t("categories.createHint")
                    : panel.mode === "editCategory"
                      ? editingCategory?.displayName
                      : panel.mode === "createSub"
                        ? createSubParent?.displayName
                        : editingSub?.displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel({ mode: "closed" })}
                className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
                aria-label={t("categories.close")}
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              {panel.mode === "createCategory" ? (
                <form action={createCategoryAction} className="grid gap-3">
                  <NameFields />
                  <Submit label={t("categories.save")} />
                </form>
              ) : null}

              {panel.mode === "editCategory" && editingCategory ? (
                <div className="space-y-4">
                  <form action={updateCategoryAction} className="grid gap-3">
                    <input type="hidden" name="id" value={editingCategory.id} />
                    <NameFields
                      nameEn={editingCategory.nameEn}
                      nameAr={editingCategory.nameAr}
                      nameCkb={editingCategory.nameCkb}
                    />
                    <Submit label={t("categories.update")} icon="save" />
                  </form>

                  <section className="space-y-2 text-start">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-fg">
                        {t("categories.subsSection")}
                      </h3>
                      <button
                        type="button"
                        onClick={() =>
                          setPanel({
                            mode: "createSub",
                            categoryId: editingCategory.id,
                          })
                        }
                        className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-line-strong bg-muted px-3 text-sm font-medium text-fg hover:bg-surface"
                      >
                        <FolderTree className="size-3.5" aria-hidden />
                        {t("categories.addSub")}
                      </button>
                    </div>
                    {editingCategory.subcategories.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-4 text-sm text-fg-muted">
                        {t("categories.noSubs")}
                      </p>
                    ) : (
                      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line" role="list">
                        {editingCategory.subcategories.map((sub) => (
                          <li key={sub.id}>
                            <button
                              type="button"
                              onClick={() =>
                                setPanel({
                                  mode: "editSub",
                                  id: sub.id,
                                  categoryId: editingCategory.id,
                                })
                              }
                              className="flex min-h-touch w-full items-center gap-2 px-3 py-2 text-start hover:bg-muted/50"
                            >
                              <Thumb
                                kind="product"
                                icon={FolderTree}
                                size="xs"
                                alt=""
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-fg">
                                  {sub.displayName}
                                </span>
                                <span className="text-xs tabular-nums text-fg-subtle">
                                  {t("categories.productsCount", {
                                    count: sub.productCount,
                                  })}
                                </span>
                              </span>
                              <ChevronRight
                                className="size-4 shrink-0 text-fg-muted rtl:rotate-180"
                                aria-hidden
                              />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>

                  <form action={deleteCategoryAction}>
                    <input type="hidden" name="id" value={editingCategory.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t("categories.delete")}
                    </button>
                  </form>
                </div>
              ) : null}

              {panel.mode === "createSub" ? (
                <form action={createSubcategoryAction} className="grid gap-3">
                  <input type="hidden" name="categoryId" value={panel.categoryId} />
                  <NameFields />
                  <Submit label={t("categories.saveSub")} />
                </form>
              ) : null}

              {panel.mode === "editSub" && editingSub ? (
                <div className="space-y-3">
                  <form action={updateSubcategoryAction} className="grid gap-3">
                    <input type="hidden" name="id" value={editingSub.id} />
                    <input
                      type="hidden"
                      name="categoryId"
                      value={editingSub.categoryId}
                    />
                    <NameFields
                      nameEn={editingSub.nameEn}
                      nameAr={editingSub.nameAr}
                      nameCkb={editingSub.nameCkb}
                    />
                    <Submit label={t("categories.updateSub")} icon="save" />
                  </form>
                  <form action={deleteSubcategoryAction}>
                    <input type="hidden" name="id" value={editingSub.id} />
                    <button
                      type="submit"
                      className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-red-200 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="size-4" aria-hidden />
                      {t("categories.deleteSub")}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </section>
        </div>
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
  const t = useTranslations();
  return (
    <div
      role="group"
      aria-label={t("categories.viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("categories.viewGrid")}
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
        aria-label={t("categories.viewList")}
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
  icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: boolean;
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
      {icon ? <FolderTree className="size-3.5 shrink-0" aria-hidden /> : null}
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
        <Tags className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function CategoryMeta({ category }: { category: CategoryRow }) {
  const t = useTranslations();
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span className="tabular-nums">
        {t("categories.productsCount", { count: category.productCount })}
      </span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <FolderTree className="size-3.5" aria-hidden />
        {t("categories.subsCount", { count: category.subcategories.length })}
      </span>
    </span>
  );
}

function CategoryGridCard({
  category,
  canManage,
  onOpen,
  onAddSub,
}: {
  category: CategoryRow;
  canManage: boolean;
  onOpen: () => void;
  onAddSub: () => void;
}) {
  const t = useTranslations();
  const body = (
    <>
      <Thumb kind="product" icon={Tags} size="md" alt="" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">
          {category.displayName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium tabular-nums text-judi-800 dark:text-judi-200">
          {t("categories.productsCount", { count: category.productCount })}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
          <FolderTree className="size-3 shrink-0" aria-hidden />
          <span className="tabular-nums">
            {t("categories.subsCount", {
              count: category.subcategories.length,
            })}
          </span>
        </span>
      </span>
    </>
  );

  if (!canManage) {
    return (
      <div className="flex min-h-touch w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-2.5 py-2 text-start shadow-sm">
        {body}
      </div>
    );
  }

  return (
    <div className="flex min-h-touch items-center gap-1 rounded-2xl border border-line bg-surface px-1.5 py-1.5 shadow-sm">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-start transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
      >
        {body}
      </button>
      <button
        type="button"
        onClick={onAddSub}
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
        aria-label={t("categories.addSub")}
      >
        <FolderTree className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function CategoryListCard({
  category,
  canManage,
  onOpen,
  onAddSub,
  onEditSub,
}: {
  category: CategoryRow;
  canManage: boolean;
  onOpen: () => void;
  onAddSub: () => void;
  onEditSub: (subId: string) => void;
}) {
  const t = useTranslations();

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-sm">
      <div className="flex min-h-touch items-center gap-2 px-2.5 py-2 sm:px-3">
        {canManage ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-w-0 flex-1 items-center gap-2.5 text-start transition-colors hover:text-judi-900 focus-visible:outline-none dark:hover:text-judi-100"
          >
            <Thumb kind="product" icon={Tags} size="sm" alt="" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-fg">
                {category.displayName}
              </span>
              <CategoryMeta category={category} />
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-judi-800 dark:text-judi-200">
              {t("categories.openCategory")}
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </span>
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2.5 text-start">
            <Thumb kind="product" icon={Tags} size="sm" alt="" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-fg">
                {category.displayName}
              </span>
              <CategoryMeta category={category} />
            </span>
          </div>
        )}
        {canManage ? (
          <button
            type="button"
            onClick={onAddSub}
            className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
            aria-label={t("categories.addSub")}
          >
            <FolderTree className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {category.subcategories.length > 0 ? (
        <ul className="border-t border-line divide-y divide-line" role="list">
          {category.subcategories.map((sub) => (
            <li key={sub.id}>
              {canManage ? (
                <button
                  type="button"
                  onClick={() => onEditSub(sub.id)}
                  className="flex min-h-touch w-full items-center gap-2 px-3 py-2 ps-12 text-start hover:bg-muted/40"
                >
                  <Thumb kind="product" icon={FolderTree} size="xs" alt="" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {sub.displayName}
                    </span>
                    <span className="text-xs tabular-nums text-fg-subtle">
                      {t("categories.productsCount", {
                        count: sub.productCount,
                      })}
                    </span>
                  </span>
                  <span className="text-xs font-medium text-judi-800 dark:text-judi-200">
                    {t("common.edit")}
                  </span>
                </button>
              ) : (
                <div className="flex min-h-touch w-full items-center gap-2 px-3 py-2 ps-12 text-start">
                  <Thumb kind="product" icon={FolderTree} size="xs" alt="" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {sub.displayName}
                    </span>
                    <span className="text-xs tabular-nums text-fg-subtle">
                      {t("categories.productsCount", {
                        count: sub.productCount,
                      })}
                    </span>
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CategoryTableRow({
  category,
  canManage,
  onOpen,
  onAddSub,
}: {
  category: CategoryRow;
  canManage: boolean;
  onOpen: () => void;
  onAddSub: () => void;
}) {
  const t = useTranslations();
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        {canManage ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-h-touch items-center gap-3 text-start font-medium text-fg hover:text-judi-800 dark:hover:text-judi-200"
          >
            <Thumb kind="product" icon={Tags} size="xs" alt="" desktopOnly />
            <span className="truncate">{category.displayName}</span>
          </button>
        ) : (
          <span className="flex min-h-touch items-center gap-3 font-medium text-fg">
            <Thumb kind="product" icon={Tags} size="xs" alt="" desktopOnly />
            <span className="truncate">{category.displayName}</span>
          </span>
        )}
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted">
        {t("categories.productsCount", { count: category.productCount })}
      </td>
      <td className="hidden px-4 py-2 tabular-nums text-fg-muted md:table-cell">
        {t("categories.subsCount", { count: category.subcategories.length })}
      </td>
      {canManage ? (
        <td className="px-4 py-2">
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={onAddSub}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
              aria-label={t("categories.addSub")}
            >
              <FolderTree className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
              aria-label={t("categories.openCategory")}
            >
              <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
            </button>
          </div>
        </td>
      ) : null}
    </tr>
  );
}

function NameFields({
  nameEn,
  nameAr,
  nameCkb,
}: {
  nameEn?: string;
  nameAr?: string;
  nameCkb?: string;
}) {
  const t = useTranslations("categories");
  const fieldClass =
    "min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface";

  return (
    <>
      <label className="block space-y-1.5 text-start">
        <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
          <Languages className="size-3.5 text-judi-700 dark:text-judi-300" aria-hidden />
          {t("nameEn")}
        </span>
        <input name="nameEn" required defaultValue={nameEn} className={fieldClass} />
      </label>
      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("nameAr")}</span>
        <input name="nameAr" required defaultValue={nameAr} className={fieldClass} />
      </label>
      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("nameCkb")}</span>
        <input name="nameCkb" required defaultValue={nameCkb} className={fieldClass} />
      </label>
    </>
  );
}

function Submit({
  label,
  icon = "plus",
}: {
  label: string;
  icon?: "plus" | "save";
}) {
  return (
    <button
      type="submit"
      className="mt-1 btn btn-important w-full"
    >
      {icon === "save" ? (
        <Save className="size-4" aria-hidden />
      ) : (
        <Plus className="size-4" aria-hidden />
      )}
      {label}
    </button>
  );
}
