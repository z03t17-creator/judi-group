"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { WarehouseType } from "@prisma/client";
import {
  Building2,
  ChevronRight,
  Languages,
  LayoutGrid,
  List,
  Plus,
  Save,
  Search,
  Tags,
  Trash2,
  Truck,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/thumb";
import { WAREHOUSE_TYPES } from "@/lib/constants";
import {
  createWarehouseAction,
  deleteWarehouseAction,
  updateWarehouseAction,
} from "./actions";

const TYPE_ICONS: Record<WarehouseType, LucideIcon> = {
  MAIN: Warehouse,
  BRANCH: Building2,
  VAN: Truck,
};

export type WarehousesDirectoryItem = {
  id: string;
  displayName: string;
  nameEn: string;
  nameAr: string;
  nameCkb: string;
  type: WarehouseType;
  licensePlate: string | null;
  usersCount: number;
};

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; warehouseId: string };

type ViewMode = "grid" | "list";
type TypeFilter = "all" | WarehouseType;

export function WarehousesDirectory({
  warehouses,
  canManage,
}: {
  warehouses: WarehousesDirectoryItem[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const titleId = useId();

  const editingWarehouse =
    panel.mode === "edit"
      ? warehouses.find((item) => item.id === panel.warehouseId) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return warehouses.filter((warehouse) => {
      if (typeFilter !== "all" && warehouse.type !== typeFilter) return false;
      if (!q) return true;
      return (
        warehouse.displayName.toLowerCase().includes(q) ||
        warehouse.nameEn.toLowerCase().includes(q) ||
        warehouse.nameAr.toLowerCase().includes(q) ||
        warehouse.nameCkb.toLowerCase().includes(q) ||
        (warehouse.licensePlate?.toLowerCase().includes(q) ?? false) ||
        t(`warehouseTypes.${warehouse.type}`).toLowerCase().includes(q)
      );
    });
  }, [query, t, typeFilter, warehouses]);

  useEffect(() => {
    if (panel.mode === "closed") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.mode]);

  useEffect(() => {
    if (panel.mode === "edit" && !editingWarehouse) {
      setPanel({ mode: "closed" });
    }
  }, [editingWarehouse, panel.mode]);

  function openEdit(warehouseId: string) {
    if (!canManage) return;
    setPanel({ mode: "edit", warehouseId });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === warehouses.length
            ? t("warehouses.listHint", { count: warehouses.length })
            : t("warehouses.matchedHint", {
                matched: filtered.length,
                total: warehouses.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          {canManage ? (
            <button
              type="button"
              onClick={() => setPanel({ mode: "create" })}
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("warehouses.create")}
            </button>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="warehouses-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="warehouses-filters-heading" className="sr-only">
          {t("warehouses.filtersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("warehouses.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("warehouses.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div
          role="group"
          aria-label={t("warehouses.filterType")}
          className="chip-scroll"
        >
          <TypeChip
            pressed={typeFilter === "all"}
            onClick={() => setTypeFilter("all")}
            label={t("warehouses.allTypes")}
          />
          {WAREHOUSE_TYPES.map((type) => {
            const Icon = TYPE_ICONS[type];
            return (
              <TypeChip
                key={type}
                pressed={typeFilter === type}
                onClick={() => setTypeFilter(type)}
                label={t(`warehouseTypes.${type}`)}
                icon={Icon}
              />
            );
          })}
        </div>
      </section>

      {warehouses.length === 0 ? (
        <EmptyState
          title={t("warehouses.empty")}
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => setPanel({ mode: "create" })}
                className="btn btn-important"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                {t("warehouses.create")}
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("warehouses.noMatches")}
          hint={t("warehouses.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
              }}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("warehouses.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          {filtered.map((warehouse) => (
            <li key={warehouse.id}>
              <WarehouseGridCard
                warehouse={warehouse}
                canManage={canManage}
                onOpen={() => openEdit(warehouse.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards" role="list">
            {filtered.map((warehouse) => (
              <li key={warehouse.id}>
                <WarehouseListCard
                  warehouse={warehouse}
                  canManage={canManage}
                  onOpen={() => openEdit(warehouse.id)}
                />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("warehouses.nameColumn")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("warehouses.type")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
                    {t("warehouses.licensePlate")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("warehouses.usersCount")}
                  </th>
                  {canManage ? (
                    <th className="px-4 py-3 font-medium" scope="col">
                      <span className="sr-only">{t("warehouses.openLocation")}</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((warehouse) => (
                  <WarehouseTableRow
                    key={warehouse.id}
                    warehouse={warehouse}
                    canManage={canManage}
                    onOpen={() => openEdit(warehouse.id)}
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
            aria-label={t("warehouses.dismissOverlay")}
            onClick={() => setPanel({ mode: "closed" })}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-line px-4 py-4 text-start sm:px-5">
              <span className="icon-badge icon-badge-md tone-indigo">
                {panel.mode === "create" ? (
                  <Plus className="size-5" aria-hidden />
                ) : (
                  <Warehouse className="size-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-semibold text-fg">
                  {panel.mode === "create"
                    ? t("warehouses.create")
                    : t("warehouses.locationTitle")}
                </h2>
                <p className="text-sm text-fg-subtle">
                  {panel.mode === "create"
                    ? t("warehouses.createHint")
                    : editingWarehouse?.displayName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel({ mode: "closed" })}
                className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
                aria-label={t("warehouses.closeLocation")}
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              {panel.mode === "create" ? (
                <CreateWarehouseForm />
              ) : editingWarehouse ? (
                <EditWarehouseForm warehouse={editingWarehouse} />
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
      aria-label={t("warehouses.viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("warehouses.viewGrid")}
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
        aria-label={t("warehouses.viewList")}
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

function TypeChip({
  label,
  pressed,
  onClick,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: LucideIcon;
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
        <Warehouse className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function WarehouseMeta({ warehouse }: { warehouse: WarehousesDirectoryItem }) {
  const t = useTranslations();
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span>{t(`warehouseTypes.${warehouse.type}`)}</span>
      {warehouse.licensePlate ? (
        <>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="tabular-nums">{warehouse.licensePlate}</span>
        </>
      ) : null}
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <Users className="size-3.5" aria-hidden />
        {warehouse.usersCount}
      </span>
    </span>
  );
}

function WarehouseGridCard({
  warehouse,
  canManage,
  onOpen,
}: {
  warehouse: WarehousesDirectoryItem;
  canManage: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const TypeIcon = TYPE_ICONS[warehouse.type];
  const body = (
    <>
      <Thumb kind="warehouse" icon={TypeIcon} size="md" alt="" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">
          {warehouse.displayName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-judi-800 dark:text-judi-200">
          {t(`warehouseTypes.${warehouse.type}`)}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
          {warehouse.licensePlate ? (
            <span className="truncate tabular-nums">{warehouse.licensePlate}</span>
          ) : (
            <span className="truncate">{t("warehouses.noPlate")}</span>
          )}
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums text-fg-muted">
            <Users className="size-3" aria-hidden />
            {warehouse.usersCount}
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
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-touch w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-2.5 py-2 text-start shadow-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      {body}
    </button>
  );
}

function WarehouseListCard({
  warehouse,
  canManage,
  onOpen,
}: {
  warehouse: WarehousesDirectoryItem;
  canManage: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const TypeIcon = TYPE_ICONS[warehouse.type];
  const body = (
    <>
      <Thumb kind="warehouse" icon={TypeIcon} size="sm" alt="" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-fg">
          {warehouse.displayName}
        </span>
        <WarehouseMeta warehouse={warehouse} />
      </span>
    </>
  );

  if (!canManage) {
    return (
      <div className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-start shadow-sm sm:px-4">
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-start shadow-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-4"
    >
      {body}
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-judi-800 dark:text-judi-200">
        {t("warehouses.openLocation")}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </span>
    </button>
  );
}

function WarehouseTableRow({
  warehouse,
  canManage,
  onOpen,
}: {
  warehouse: WarehousesDirectoryItem;
  canManage: boolean;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const TypeIcon = TYPE_ICONS[warehouse.type];
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        {canManage ? (
          <button
            type="button"
            onClick={onOpen}
            className="flex min-h-touch items-center gap-3 text-start font-medium text-fg hover:text-judi-800 focus-visible:outline-none dark:hover:text-judi-200"
          >
            <Thumb
              kind="warehouse"
              icon={TypeIcon}
              size="xs"
              alt=""
              desktopOnly
            />
            <span className="truncate">{warehouse.displayName}</span>
          </button>
        ) : (
          <div className="flex min-h-touch items-center gap-3 font-medium text-fg">
            <Thumb
              kind="warehouse"
              icon={TypeIcon}
              size="xs"
              alt=""
              desktopOnly
            />
            <span className="truncate">{warehouse.displayName}</span>
          </div>
        )}
      </td>
      <td className="px-4 py-2 text-fg-muted">
        {t(`warehouseTypes.${warehouse.type}`)}
      </td>
      <td className="hidden px-4 py-2 tabular-nums text-fg-muted md:table-cell">
        {warehouse.licensePlate ?? "—"}
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted">
        {warehouse.usersCount}
      </td>
      {canManage ? (
        <td className="px-4 py-2">
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
            aria-label={t("warehouses.openLocation")}
          >
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
          </button>
        </td>
      ) : null}
    </tr>
  );
}

function CreateWarehouseForm() {
  const t = useTranslations();
  return (
    <form action={createWarehouseAction} className="grid gap-3">
      <WarehouseFields />
      <button
        type="submit"
        className="mt-1 btn btn-important w-full"
      >
        <Plus className="size-4 shrink-0" aria-hidden />
        {t("warehouses.save")}
      </button>
    </form>
  );
}

function EditWarehouseForm({
  warehouse,
}: {
  warehouse: WarehousesDirectoryItem;
}) {
  const t = useTranslations();
  return (
    <div className="space-y-4">
      <form action={updateWarehouseAction} className="grid gap-3">
        <input type="hidden" name="id" value={warehouse.id} />
        <WarehouseFields warehouse={warehouse} />
        <p className="flex min-h-touch items-center gap-2 rounded-xl border border-line bg-muted px-3 text-sm text-fg-muted text-start">
          <Users className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
          <span>
            {t("warehouses.usersCount")}:{" "}
            <span className="font-medium tabular-nums text-fg">
              {warehouse.usersCount}
            </span>
          </span>
        </p>
        <button
          type="submit"
          className="mt-1 btn btn-important w-full"
        >
          <Save className="size-4 shrink-0" aria-hidden />
          {t("warehouses.update")}
        </button>
      </form>

      <form action={deleteWarehouseAction} className="border-t border-line pt-3">
        <input type="hidden" name="id" value={warehouse.id} />
        <button
          type="submit"
          className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          {t("warehouses.delete")}
        </button>
      </form>
    </div>
  );
}

function WarehouseFields({
  warehouse,
}: {
  warehouse?: WarehousesDirectoryItem;
}) {
  const t = useTranslations();
  return (
    <>
      <Field
        icon={Languages}
        label={t("warehouses.nameEn")}
        name="nameEn"
        hint={t("warehouses.nameHint")}
        defaultValue={warehouse?.nameEn}
        required
      />
      <Field
        icon={Languages}
        label={t("warehouses.nameAr")}
        name="nameAr"
        hint={t("warehouses.nameHint")}
        defaultValue={warehouse?.nameAr}
        required
      />
      <Field
        icon={Languages}
        label={t("warehouses.nameCkb")}
        name="nameCkb"
        hint={t("warehouses.nameHint")}
        defaultValue={warehouse?.nameCkb}
        required
      />
      <SelectField
        icon={Tags}
        label={t("warehouses.type")}
        name="type"
        hint={t("warehouses.typeHint")}
        defaultValue={warehouse?.type ?? "VAN"}
      >
        {WAREHOUSE_TYPES.map((type) => (
          <option key={type} value={type}>
            {t(`warehouseTypes.${type}`)}
          </option>
        ))}
      </SelectField>
      <Field
        icon={Truck}
        label={t("warehouses.licensePlate")}
        name="licensePlate"
        hint={t("warehouses.licensePlateHint")}
        defaultValue={warehouse?.licensePlate ?? ""}
      />
    </>
  );
}

function Field({
  icon: Icon,
  label,
  name,
  hint,
  required,
  defaultValue,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label className="block space-y-1.5 text-start">
      <span className="flex items-center gap-2 text-sm font-medium text-fg">
        <Icon className="size-4 text-judi-700 dark:text-judi-300" aria-hidden />
        {label}
      </span>
      <input
        name={name}
        required={required}
        defaultValue={defaultValue}
        aria-describedby={hintId}
        className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
      />
      {hint ? (
        <span id={hintId} className="block text-xs text-fg-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  icon: Icon,
  label,
  name,
  hint,
  defaultValue,
  children,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label className="block space-y-1.5 text-start">
      <span className="flex items-center gap-2 text-sm font-medium text-fg">
        <Icon className="size-4 text-judi-700 dark:text-judi-300" aria-hidden />
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        aria-describedby={hintId}
        className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
      >
        {children}
      </select>
      {hint ? (
        <span id={hintId} className="block text-xs text-fg-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
