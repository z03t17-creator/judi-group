"use client";

import { Warehouse } from "lucide-react";

export function WarehousePicker({
  label,
  selectedId,
  warehouses,
  paramName = "warehouseId",
}: {
  label: string;
  selectedId: string;
  warehouses: { id: string; label: string }[];
  /** Query param name for GET forms (e.g. `sourceId` on transfers). */
  paramName?: string;
}) {
  return (
    <form method="get" className="flex flex-wrap items-center gap-2 text-start">
      <label className="inline-flex min-w-0 flex-1 items-center gap-2 sm:max-w-md">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-judi-800 dark:text-judi-200">
          <Warehouse className="size-4" aria-hidden />
        </span>
        <span className="sr-only">{label}</span>
        <select
          name={paramName}
          defaultValue={selectedId}
          aria-label={label}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.label}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
