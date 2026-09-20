"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  Link2,
  Plus,
  Receipt,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DataExportButtons } from "@/components/data-export-buttons";
import { StockMediaPanel } from "@/components/stock-media-panel";
import { Thumb } from "@/components/thumb";
import { EXPENSE_CATEGORIES } from "@/lib/constants";
import {
  createExpenseAction,
  deleteExpenseAction,
  updateExpenseAction,
} from "./actions";

export type ExpenseRow = {
  id: string;
  dateYmd: string;
  category: (typeof EXPENSE_CATEGORIES)[number];
  amount: string;
  currency: string;
  amountLabel: string;
  note: string | null;
  productId: string | null;
  productLabel: string | null;
  warehouseId: string | null;
  warehouseLabel: string | null;
  storeId: string | null;
  storeLabel: string | null;
  stockLotId: string | null;
  lotLabel: string | null;
  createdByName: string;
  primaryMediaUrl: string | null;
  stockLinked: boolean;
};

type CatalogOption = { id: string; label: string };

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; id: string };

type CategoryFilter = "all" | (typeof EXPENSE_CATEGORIES)[number];

const fieldClass =
  "min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface";

function chipClass(active: boolean) {
  return `chip ${active ? "chip-on" : "chip-off"}`;
}

export function ExpensesDirectory({
  expenses,
  products,
  warehouses,
  stores,
  canManage,
  focusId,
}: {
  expenses: ExpenseRow[];
  products: CatalogOption[];
  warehouses: CatalogOption[];
  stores: CatalogOption[];
  canManage: boolean;
  focusId?: string | null;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [stockOnly, setStockOnly] = useState(false);
  const titleId = useId();

  const editing =
    panel.mode === "edit"
      ? expenses.find((item) => item.id === panel.id) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (stockOnly && !row.stockLinked) return false;
      if (!q) return true;
      return (
        row.amountLabel.toLowerCase().includes(q) ||
        row.category.toLowerCase().includes(q) ||
        t(`expenses.categories.${row.category}`).toLowerCase().includes(q) ||
        (row.note ?? "").toLowerCase().includes(q) ||
        (row.productLabel ?? "").toLowerCase().includes(q) ||
        (row.warehouseLabel ?? "").toLowerCase().includes(q) ||
        (row.storeLabel ?? "").toLowerCase().includes(q) ||
        (row.lotLabel ?? "").toLowerCase().includes(q) ||
        row.createdByName.toLowerCase().includes(q) ||
        row.dateYmd.includes(q)
      );
    });
  }, [categoryFilter, expenses, query, stockOnly, t]);

  useEffect(() => {
    if (panel.mode === "closed") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.mode]);

  useEffect(() => {
    if (panel.mode === "edit" && !editing) setPanel({ mode: "closed" });
  }, [editing, panel.mode]);

  useEffect(() => {
    if (!focusId) return;
    const el = document.getElementById(`expense-${focusId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusId]);

  const exportHeaders = [
    t("expenses.date"),
    t("expenses.category"),
    t("expenses.amount"),
    t("expenses.currency"),
    t("expenses.note"),
    t("expenses.product"),
    t("expenses.warehouse"),
    t("expenses.store"),
    t("expenses.lot"),
    t("expenses.recordedByColumn"),
  ];

  const exportRows = filtered.map((row) => [
    row.dateYmd,
    t(`expenses.categories.${row.category}`),
    row.amountLabel,
    row.currency,
    row.note ?? "",
    row.productLabel ?? "",
    row.warehouseLabel ?? "",
    row.storeLabel ?? "",
    row.lotLabel ?? "",
    row.createdByName,
  ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === expenses.length
            ? t("expenses.listHint", { count: expenses.length })
            : t("expenses.matchedHint", {
                matched: filtered.length,
                total: expenses.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DataExportButtons
            title={t("expenses.title")}
            fileBase="judi-expenses"
            headers={exportHeaders}
            rows={exportRows}
          />
          {canManage ? (
            <button
              type="button"
              onClick={() => setPanel({ mode: "create" })}
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("expenses.create")}
            </button>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="expenses-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="expenses-filters-heading" className="sr-only">
          {t("expenses.filtersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("expenses.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("expenses.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label={t("expenses.filterCategory")}
        >
          <button
            type="button"
            className={chipClass(categoryFilter === "all")}
            onClick={() => setCategoryFilter("all")}
          >
            {t("expenses.filterAll")}
          </button>
          {EXPENSE_CATEGORIES.map((category) => (
            <button
              key={category}
              type="button"
              className={chipClass(categoryFilter === category)}
              onClick={() => setCategoryFilter(category)}
            >
              {t(`expenses.categories.${category}`)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2" role="group" aria-label={t("expenses.filterLink")}>
          <button
            type="button"
            className={chipClass(!stockOnly)}
            onClick={() => setStockOnly(false)}
          >
            {t("expenses.filterAll")}
          </button>
          <button
            type="button"
            className={chipClass(stockOnly)}
            onClick={() => setStockOnly(true)}
          >
            {t("expenses.filterStockLinked")}
          </button>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="surface-panel px-4 py-10 text-center">
          <Receipt className="mx-auto size-8 text-judi-700 dark:text-judi-300" aria-hidden />
          <p className="mt-3 font-semibold text-fg">
            {expenses.length === 0 ? t("expenses.empty") : t("expenses.noMatches")}
          </p>
          <p className="mt-1 text-sm text-fg-muted">
            {expenses.length === 0 ? t("expenses.emptyHint") : t("expenses.noMatchesHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((row) => (
            <li key={row.id} id={`expense-${row.id}`} className="surface-panel p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => canManage && setPanel({ mode: "edit", id: row.id })}
                  disabled={!canManage}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Thumb
                      kind="stock"
                      size="sm"
                      src={row.primaryMediaUrl}
                      alt={row.note ?? row.category}
                    />
                    <span className="font-semibold text-fg">{row.amountLabel}</span>
                    <span className="rounded-lg border border-line px-2 py-0.5 text-xs text-fg-muted">
                      {t(`expenses.categories.${row.category}`)}
                    </span>
                    {row.stockLinked ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-judi-100 px-2 py-0.5 text-xs font-semibold text-judi-900 dark:bg-judi-950/50 dark:text-judi-100">
                        <Link2 className="size-3" aria-hidden />
                        {t("expenses.stockLinked")}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm text-fg-muted">
                    {row.dateYmd}
                    {row.productLabel ? ` · ${row.productLabel}` : ""}
                    {row.warehouseLabel ? ` · ${row.warehouseLabel}` : ""}
                    {row.storeLabel ? ` · ${row.storeLabel}` : ""}
                    {row.lotLabel ? ` · ${row.lotLabel}` : ""}
                  </p>
                  {row.note ? (
                    <p className="mt-0.5 text-sm text-fg-subtle">{row.note}</p>
                  ) : null}
                  <p className="mt-0.5 text-xs text-fg-subtle">
                    {t("expenses.createdBy", { name: row.createdByName })}
                  </p>
                </button>

                {canManage ? (
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPanel({ mode: "edit", id: row.id })}
                      className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted"
                    >
                      {t("expenses.edit")}
                    </button>
                    <form action={deleteExpenseAction}>
                      <input type="hidden" name="id" value={row.id} />
                      <button
                        type="submit"
                        className="btn btn-danger-outline"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t("expenses.delete")}
                      </button>
                    </form>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 border-t border-line pt-3">
                <StockMediaPanel
                  entityType="Expense"
                  entityId={row.id}
                  label={row.note ?? row.amountLabel}
                  initialPrimaryUrl={row.primaryMediaUrl}
                  canEdit={canManage}
                  defaultOpen={focusId === row.id}
                  size="sm"
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      {panel.mode !== "closed" ? (
        <ExpenseDrawer
          titleId={titleId}
          title={
            panel.mode === "create" ? t("expenses.create") : t("expenses.edit")
          }
          onClose={() => setPanel({ mode: "closed" })}
        >
          <ExpenseForm
            key={panel.mode === "edit" ? panel.id : "create"}
            mode={panel.mode}
            expense={editing}
            products={products}
            warehouses={warehouses}
            stores={stores}
            onCancel={() => setPanel({ mode: "closed" })}
          />
        </ExpenseDrawer>
      ) : null}
    </div>
  );
}

function ExpenseDrawer({
  titleId,
  title,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation">
      <button
        type="button"
        className="h-full flex-1 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-lg flex-col border-s border-line bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-fg text-start">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line-strong text-fg hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function ExpenseForm({
  mode,
  expense,
  products,
  warehouses,
  stores,
  onCancel,
}: {
  mode: "create" | "edit";
  expense: ExpenseRow | null;
  products: CatalogOption[];
  warehouses: CatalogOption[];
  stores: CatalogOption[];
  onCancel: () => void;
}) {
  const t = useTranslations();
  const action = mode === "create" ? createExpenseAction : updateExpenseAction;
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" && expense ? (
        <input type="hidden" name="id" value={expense.id} />
      ) : null}

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("expenses.date")}</span>
        <input
          type="date"
          name="date"
          required
          defaultValue={expense?.dateYmd ?? today}
          className={fieldClass}
        />
      </label>

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("expenses.category")}</span>
        <select
          name="category"
          required
          defaultValue={expense?.category ?? "OTHER"}
          className={fieldClass}
        >
          {EXPENSE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {t(`expenses.categories.${category}`)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("expenses.amount")}</span>
          <input
            type="text"
            name="amount"
            inputMode="decimal"
            required
            defaultValue={expense?.amount ?? ""}
            className={fieldClass}
          />
        </label>
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("expenses.currency")}</span>
          <select
            name="currency"
            defaultValue={expense?.currency ?? "IQD"}
            className={fieldClass}
          >
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("expenses.note")}</span>
        <textarea
          name="note"
          rows={3}
          defaultValue={expense?.note ?? ""}
          placeholder={t("expenses.notePlaceholder")}
          className="min-h-[5rem] w-full rounded-xl border border-line-strong bg-muted px-3 py-2 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface"
        />
      </label>

      <fieldset className="space-y-3 rounded-xl border border-line p-3">
        <legend className="px-1 text-sm font-medium text-fg">
          {t("expenses.linksTitle")}
        </legend>
        <p className="text-xs text-fg-muted text-start">{t("expenses.linksHint")}</p>

        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("expenses.product")}</span>
          <select
            name="productId"
            defaultValue={expense?.productId ?? ""}
            className={fieldClass}
          >
            <option value="">{t("expenses.none")}</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("expenses.warehouse")}</span>
          <select
            name="warehouseId"
            defaultValue={expense?.warehouseId ?? ""}
            className={fieldClass}
          >
            <option value="">{t("expenses.none")}</option>
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("expenses.store")}</span>
          <select
            name="storeId"
            defaultValue={expense?.storeId ?? ""}
            className={fieldClass}
          >
            <option value="">{t("expenses.none")}</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.label}
              </option>
            ))}
          </select>
        </label>

        {expense?.stockLotId ? (
          <input type="hidden" name="stockLotId" value={expense.stockLotId} />
        ) : (
          <input type="hidden" name="stockLotId" value="" />
        )}
        {expense?.lotLabel ? (
          <p className="text-sm text-fg-muted text-start">
            {t("expenses.lot")}: {expense.lotLabel}
          </p>
        ) : null}
      </fieldset>

      {mode === "edit" && expense ? (
        <div className="rounded-xl border border-line p-3">
          <p className="mb-2 text-sm font-medium text-fg text-start">
            {t("expenses.receiptPhotos")}
          </p>
          <StockMediaPanel
            entityType="Expense"
            entityId={expense.id}
            label={expense.note ?? expense.amountLabel}
            initialPrimaryUrl={expense.primaryMediaUrl}
            canEdit
            defaultOpen
            size="sm"
          />
        </div>
      ) : (
        <p className="text-xs text-fg-muted text-start">{t("expenses.photosAfterCreate")}</p>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          className="btn btn-important flex-1"
        >
          <Save className="size-4" aria-hidden />
          {mode === "create" ? t("expenses.save") : t("expenses.saveChanges")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-touch items-center justify-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}
