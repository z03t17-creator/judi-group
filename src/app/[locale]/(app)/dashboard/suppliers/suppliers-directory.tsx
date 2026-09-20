"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  Factory,
  LayoutGrid,
  List,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  createSupplierAction,
  deleteSupplierAction,
  toggleSupplierAction,
  updateSupplierAction,
} from "./actions";

export type SupplierRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  active: boolean;
  purchaseCount: number;
};

type Panel = { mode: "closed" } | { mode: "create" } | { mode: "edit"; id: string };
type ViewMode = "grid" | "list";
type StatusFilter = "all" | "active" | "paused";

const fieldClass =
  "h-10 min-h-10 w-full rounded-lg border border-line-strong bg-muted px-2.5 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface";

function chipClass(active: boolean) {
  return `chip chip-sm ${active ? "chip-on" : "chip-off"}`;
}

export function SuppliersDirectory({
  suppliers,
  canManage,
}: {
  suppliers: SupplierRow[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const titleId = useId();

  const editing =
    panel.mode === "edit"
      ? suppliers.find((item) => item.id === panel.id) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return suppliers.filter((row) => {
      if (statusFilter === "active" && !row.active) return false;
      if (statusFilter === "paused" && row.active) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        (row.phone ?? "").toLowerCase().includes(q) ||
        (row.email ?? "").toLowerCase().includes(q) ||
        (row.address ?? "").toLowerCase().includes(q)
      );
    });
  }, [suppliers, query, statusFilter]);

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

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted text-start sm:text-sm">
          {filtered.length === suppliers.length
            ? t("suppliers.listHint", { count: suppliers.length })
            : t("suppliers.matchedHint", {
                matched: filtered.length,
                total: suppliers.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <div className="inline-flex rounded-lg border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`inline-flex size-10 items-center justify-center rounded-md ${
                view === "grid"
                  ? "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100"
                  : "text-fg-muted"
              }`}
              aria-pressed={view === "grid"}
              title={t("suppliers.viewGrid")}
            >
              <LayoutGrid className="size-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`inline-flex size-10 items-center justify-center rounded-md ${
                view === "list"
                  ? "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100"
                  : "text-fg-muted"
              }`}
              aria-pressed={view === "list"}
              title={t("suppliers.viewList")}
            >
              <List className="size-4" aria-hidden />
            </button>
          </div>
          {canManage ? (
            <button
              type="button"
              onClick={() => setPanel({ mode: "create" })}
              className="btn btn-important btn-sm"
            >
              <Plus className="size-4" aria-hidden />
              {t("suppliers.create")}
            </button>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="suppliers-filters-heading"
        className="surface-panel space-y-2 p-2.5"
      >
        <h2 id="suppliers-filters-heading" className="sr-only">
          {t("suppliers.filtersTitle")}
        </h2>
        <label className="relative block">
          <span className="sr-only">{t("suppliers.search")}</span>
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("suppliers.searchPlaceholder")}
            className={`${fieldClass} ps-8`}
          />
        </label>
        <div
          className="chip-scroll"
          role="group"
          aria-label={t("suppliers.filtersTitle")}
        >
          {(
            [
              ["all", t("suppliers.filterAll")],
              ["active", t("suppliers.filterActive")],
              ["paused", t("suppliers.filterPaused")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatusFilter(key)}
              className={chipClass(statusFilter === key)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-muted/40 px-4 py-8 text-center">
          <Factory className="mx-auto size-7 text-fg-muted" aria-hidden />
          <p className="mt-2 text-sm font-medium text-fg">
            {suppliers.length === 0 ? t("suppliers.empty") : t("suppliers.noMatches")}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {suppliers.length === 0 ? t("suppliers.emptyHint") : t("suppliers.noMatchesHint")}
          </p>
        </div>
      ) : view === "grid" ? (
        <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((row) => (
            <li key={row.id}>
              <SupplierCard
                row={row}
                canManage={canManage}
                onEdit={() => setPanel({ mode: "edit", id: row.id })}
              />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {filtered.map((row) => (
            <li key={row.id}>
              <SupplierListRow
                row={row}
                canManage={canManage}
                onEdit={() => setPanel({ mode: "edit", id: row.id })}
              />
            </li>
          ))}
        </ul>
      )}

      {panel.mode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t("common.cancel")}
            onClick={() => setPanel({ mode: "closed" })}
          />
          <aside
            className="relative flex h-full w-full max-w-md flex-col border-s border-line bg-surface shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
          >
            <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5">
              <h2 id={titleId} className="text-sm font-semibold text-fg text-start">
                {panel.mode === "create" ? t("suppliers.create") : t("suppliers.edit")}
              </h2>
              <button
                type="button"
                onClick={() => setPanel({ mode: "closed" })}
                className="inline-flex size-10 items-center justify-center rounded-lg border border-line text-fg hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <form
              action={panel.mode === "create" ? createSupplierAction : updateSupplierAction}
              className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3"
            >
              {panel.mode === "edit" && editing ? (
                <input type="hidden" name="id" value={editing.id} />
              ) : null}
              <label className="block space-y-1 text-start">
                <span className="text-xs font-medium text-fg">{t("suppliers.name")}</span>
                <input
                  name="name"
                  required
                  defaultValue={editing?.name ?? ""}
                  className={fieldClass}
                />
              </label>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <label className="block space-y-1 text-start">
                  <span className="text-xs font-medium text-fg">{t("suppliers.phone")}</span>
                  <input
                    name="phone"
                    defaultValue={editing?.phone ?? ""}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1 text-start">
                  <span className="text-xs font-medium text-fg">{t("suppliers.email")}</span>
                  <input
                    name="email"
                    type="email"
                    defaultValue={editing?.email ?? ""}
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block space-y-1 text-start">
                <span className="text-xs font-medium text-fg">{t("suppliers.address")}</span>
                <input
                  name="address"
                  defaultValue={editing?.address ?? ""}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1 text-start">
                <span className="text-xs font-medium text-fg">{t("suppliers.notes")}</span>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editing?.notes ?? ""}
                  className="min-h-[5rem] w-full rounded-lg border border-line-strong bg-muted px-2.5 py-2 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface"
                />
              </label>
              <label className="flex h-10 items-center gap-2.5 text-start">
                <input
                  type="checkbox"
                  name="active"
                  value="true"
                  defaultChecked={editing?.active ?? true}
                  className="size-4 rounded border-line-strong"
                />
                <span className="text-sm font-medium text-fg">{t("suppliers.active")}</span>
              </label>
              <div className="mt-auto flex flex-wrap gap-2 border-t border-line pt-2.5">
                <button
                  type="submit"
                  className="btn btn-important btn-sm flex-1"
                >
                  <Save className="size-4" aria-hidden />
                  {panel.mode === "create" ? t("suppliers.save") : t("suppliers.update")}
                </button>
                {panel.mode === "edit" && editing && editing.purchaseCount === 0 ? (
                  <button
                    type="submit"
                    formAction={deleteSupplierAction}
                    className="btn btn-danger-outline btn-sm"
                  >
                    <Trash2 className="size-4" aria-hidden />
                    {t("suppliers.delete")}
                  </button>
                ) : null}
              </div>
            </form>
          </aside>
        </div>
      ) : null}
    </div>
  );
}

function SupplierCard({
  row,
  canManage,
  onEdit,
}: {
  row: SupplierRow;
  canManage: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations();
  return (
    <article className="flex h-full flex-col gap-2 rounded-xl border border-line bg-surface p-2.5 text-start">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-fg">{row.name}</h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            {row.phone || row.email || t("common.none")}
          </p>
        </div>
        <StatusBadge active={row.active} />
      </div>
      {row.address ? <p className="text-xs text-fg-muted">{row.address}</p> : null}
      <p className="text-[11px] text-fg-muted">
        {t("suppliers.purchaseCount", { count: row.purchaseCount })}
      </p>
      <div className="mt-auto flex flex-wrap gap-1.5">
        {canManage ? (
          <>
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex h-10 min-h-10 flex-1 items-center justify-center rounded-lg border border-line-strong bg-muted px-2.5 text-xs font-medium text-fg hover:bg-surface"
            >
              {t("common.edit")}
            </button>
            <form action={toggleSupplierAction}>
              <input type="hidden" name="id" value={row.id} />
              <input type="hidden" name="active" value={row.active ? "false" : "true"} />
              <button
                type="submit"
                className="inline-flex h-10 min-h-10 items-center justify-center rounded-lg border border-line px-2.5 text-xs font-medium text-fg hover:bg-muted"
              >
                {row.active ? t("suppliers.pause") : t("suppliers.activate")}
              </button>
            </form>
          </>
        ) : null}
        <Link
          href={`/dashboard/purchases?supplierId=${row.id}`}
          className="btn btn-important btn-sm flex-1"
        >
          {t("suppliers.viewPurchases")}
        </Link>
      </div>
    </article>
  );
}

function SupplierListRow({
  row,
  canManage,
  onEdit,
}: {
  row: SupplierRow;
  canManage: boolean;
  onEdit: () => void;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-start">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="text-sm font-semibold text-fg">{row.name}</p>
          <StatusBadge active={row.active} />
        </div>
        <p className="text-xs text-fg-muted">
          {[row.phone, row.email].filter(Boolean).join(" · ") || t("common.none")}
          {" · "}
          {t("suppliers.purchaseCount", { count: row.purchaseCount })}
        </p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {canManage ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex h-10 min-h-10 items-center justify-center rounded-lg border border-line px-2.5 text-xs font-medium"
          >
            {t("common.edit")}
          </button>
        ) : null}
        <Link
          href={`/dashboard/purchases?supplierId=${row.id}`}
          className="btn btn-important btn-sm"
        >
          {t("suppliers.viewPurchases")}
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  const t = useTranslations("suppliers");
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
        active
          ? "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
          : "bg-muted text-fg-muted"
      }`}
    >
      {active ? t("filterActive") : t("filterPaused")}
    </span>
  );
}
