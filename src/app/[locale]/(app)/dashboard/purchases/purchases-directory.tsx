"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PackageOpen,
  Search,
  XCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { StockMediaPanel } from "@/components/stock-media-panel";
import { Thumb } from "@/components/thumb";
import { formatMoney } from "@/lib/money";
import {
  cancelPurchaseAction,
  receivePurchaseAction,
} from "./actions";

export type PurchaseDirectoryItem = {
  id: string;
  orderNumber: string;
  status: "DRAFT" | "RECEIVED" | "CANCELLED";
  currency: string;
  notes: string | null;
  createdAt: string;
  receivedAt: string | null;
  supplierName: string;
  warehouseName: string;
  createdByName: string;
  receiptId: string | null;
  receiptNumber: string | null;
  primaryMediaUrl: string | null;
  lineCount: number;
  lines: {
    id: string;
    productName: string;
    productSku: string;
    unitName: string;
    quantity: string;
    unitCost: string;
    currency: string;
    lotCode: string | null;
    expiryDate: string | null;
    primaryMediaUrl: string | null;
  }[];
};

type StatusFilter = "all" | "DRAFT" | "RECEIVED" | "CANCELLED";

function chipClass(active: boolean) {
  return `chip chip-sm ${active ? "chip-on" : "chip-off"}`;
}

export function PurchasesDirectory({
  purchases,
  canManage,
  focusPurchaseId,
  focusPhotos,
}: {
  purchases: PurchaseDirectoryItem[];
  canManage: boolean;
  focusPurchaseId?: string | null;
  focusPhotos?: boolean;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return purchases.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return (
        row.orderNumber.toLowerCase().includes(q) ||
        row.supplierName.toLowerCase().includes(q) ||
        row.warehouseName.toLowerCase().includes(q) ||
        (row.receiptNumber ?? "").toLowerCase().includes(q) ||
        row.lines.some(
          (line) =>
            line.productName.toLowerCase().includes(q) ||
            line.productSku.toLowerCase().includes(q) ||
            (line.lotCode ?? "").toLowerCase().includes(q),
        )
      );
    });
  }, [purchases, query, statusFilter]);

  return (
    <div className="space-y-2.5">
      <section
        aria-labelledby="purchases-filters-heading"
        className="surface-panel space-y-2 p-2.5"
      >
        <h2 id="purchases-filters-heading" className="sr-only">
          {t("purchases.filtersTitle")}
        </h2>
        <label className="relative block">
          <span className="sr-only">{t("purchases.search")}</span>
          <Search className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("purchases.searchPlaceholder")}
            className="h-10 min-h-10 w-full rounded-lg border border-line-strong bg-muted ps-8 pe-3 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface"
          />
        </label>
        <div
          className="chip-scroll"
          role="group"
          aria-label={t("purchases.filtersTitle")}
        >
          {(
            [
              ["all", t("purchases.filterAll")],
              ["DRAFT", t("purchases.statuses.DRAFT")],
              ["RECEIVED", t("purchases.statuses.RECEIVED")],
              ["CANCELLED", t("purchases.statuses.CANCELLED")],
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

      <p className="text-xs text-fg-muted text-start sm:text-sm">
        {filtered.length === purchases.length
          ? t("purchases.listHint", { count: purchases.length })
          : t("purchases.matchedHint", {
              matched: filtered.length,
              total: purchases.length,
            })}
      </p>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line-strong bg-muted/40 px-4 py-8 text-center">
          <PackageOpen className="mx-auto size-7 text-fg-muted" aria-hidden />
          <p className="mt-2 text-sm font-medium text-fg">
            {purchases.length === 0 ? t("purchases.empty") : t("purchases.noMatches")}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {purchases.length === 0
              ? t("purchases.emptyHint")
              : t("purchases.noMatchesHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((row) => (
            <li key={row.id}>
              <PurchaseCard
                row={row}
                canManage={canManage}
                defaultOpen={focusPurchaseId === row.id}
                defaultOpenPhotos={Boolean(focusPhotos && focusPurchaseId === row.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PurchaseCard({
  row,
  canManage,
  defaultOpen,
  defaultOpenPhotos,
}: {
  row: PurchaseDirectoryItem;
  canManage: boolean;
  defaultOpen: boolean;
  defaultOpenPhotos: boolean;
}) {
  const t = useTranslations();
  const [open, setOpen] = useState(defaultOpen || defaultOpenPhotos);
  const mediaEntityType = row.receiptId ? "PurchaseReceipt" : "PurchaseOrder";
  const mediaEntityId = row.receiptId ?? row.id;

  return (
    <article className="rounded-xl border border-line bg-surface p-2.5 text-start">
      <div className="flex items-start gap-2">
        <Thumb
          kind="stock"
          size="sm"
          src={row.primaryMediaUrl}
          alt={row.orderNumber}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-fg">{row.orderNumber}</h3>
            <StatusBadge status={row.status} />
          </div>
          <p className="mt-0.5 text-xs text-fg-muted">
            {row.supplierName} · {row.warehouseName}
          </p>
          <p className="text-[11px] text-fg-muted">
            {t("purchases.lineCount", { count: row.lineCount })}
            {" · "}
            {t("purchases.createdBy", { name: row.createdByName })}
            {row.receiptNumber
              ? ` · ${t("purchases.receipt")} ${row.receiptNumber}`
              : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 min-h-10 shrink-0 items-center gap-1 rounded-lg border border-line px-2 text-xs font-medium text-fg hover:bg-muted"
          aria-expanded={open}
        >
          {open ? (
            <ChevronUp className="size-4" aria-hidden />
          ) : (
            <ChevronDown className="size-4" aria-hidden />
          )}
          {open
            ? t("purchases.hideLines")
            : t("purchases.showLines", { count: row.lineCount })}
        </button>
      </div>

      {open ? (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          <ul className="space-y-1">
            {row.lines.map((line) => (
              <li
                key={line.id}
                className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1.5"
              >
                <Thumb
                  kind="product"
                  size="xs"
                  src={line.primaryMediaUrl}
                  alt={line.productName}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-fg">
                    {line.productSku} — {line.productName}
                  </p>
                  <p className="text-[11px] text-fg-muted">
                    {line.quantity} {line.unitName} ·{" "}
                    {formatMoney(line.unitCost, line.currency)}
                    {line.lotCode ? ` · ${t("purchases.lot")}: ${line.lotCode}` : ""}
                    {line.expiryDate
                      ? ` · ${t("purchases.exp")}: ${line.expiryDate}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {row.notes ? (
            <p className="text-xs text-fg-muted">{row.notes}</p>
          ) : null}

          <StockMediaPanel
            entityType={mediaEntityType}
            entityId={mediaEntityId}
            label={row.receiptNumber ?? row.orderNumber}
            initialPrimaryUrl={row.primaryMediaUrl}
            canEdit={canManage}
            defaultOpen={defaultOpenPhotos}
            size="sm"
          />

          {canManage && row.status === "DRAFT" ? (
            <div className="space-y-2 border-t border-line pt-2">
              <form action={receivePurchaseAction} className="grid gap-2 sm:grid-cols-[1fr_7rem_auto]">
                <input type="hidden" name="id" value={row.id} />
                <label className="block space-y-1 text-start">
                  <span className="text-[11px] font-medium text-fg-muted">
                    {t("purchases.freightAmount")}
                  </span>
                  <input
                    name="freightAmount"
                    type="text"
                    inputMode="decimal"
                    placeholder={t("purchases.freightAmountPlaceholder")}
                    className="h-10 min-h-10 w-full rounded-lg border border-line-strong bg-muted px-2.5 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface"
                  />
                </label>
                <label className="block space-y-1 text-start">
                  <span className="text-[11px] font-medium text-fg-muted">
                    {t("purchases.freightCurrency")}
                  </span>
                  <select
                    name="freightCurrency"
                    defaultValue={row.currency}
                    className="h-10 min-h-10 w-full rounded-lg border border-line-strong bg-muted px-2 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface"
                  >
                    <option value="IQD">IQD</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <button
                  type="submit"
                  className="btn btn-important btn-sm self-end"
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  {t("purchases.receive")}
                </button>
              </form>
              <form action={cancelPurchaseAction}>
                <input type="hidden" name="id" value={row.id} />
                <button
                  type="submit"
                  className="btn btn-danger-outline btn-sm"
                >
                  <XCircle className="size-4" aria-hidden />
                  {t("purchases.cancel")}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function StatusBadge({
  status,
}: {
  status: PurchaseDirectoryItem["status"];
}) {
  const t = useTranslations("purchases");
  const tone =
    status === "RECEIVED"
      ? "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
      : status === "DRAFT"
        ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        : "bg-muted text-fg-muted";
  return (
    <span className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {t(`statuses.${status}`)}
    </span>
  );
}
