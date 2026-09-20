"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { StockTransferStatus, WarehouseType } from "@prisma/client";
import {
  ArrowRight,
  Building2,
  Camera,
  Check,
  Search,
  Truck,
  Warehouse,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaGallery } from "@/components/media-gallery";
import { Thumb } from "@/components/thumb";
import { decideTransferAction } from "./actions";

const TYPE_ICONS: Record<WarehouseType, LucideIcon> = {
  MAIN: Warehouse,
  BRANCH: Building2,
  VAN: Truck,
};

export type TransferLinePreview = {
  id: string;
  sku: string;
  productName: string;
  qtyLabel: string;
  baseQtyLabel: string;
  primaryMediaUrl: string | null;
};

export type TransferDirectoryItem = {
  id: string;
  status: StockTransferStatus;
  sourceName: string;
  sourceType: WarehouseType;
  destinationName: string;
  destinationType: WarehouseType;
  notes: string | null;
  createdAtLabel: string;
  lines: TransferLinePreview[];
  primaryMediaUrl: string | null;
  showDecide: boolean;
};

type StatusFilter = "all" | StockTransferStatus;

export function TransfersDirectory({
  transfers,
  focusTransferId,
  canEditMedia,
}: {
  transfers: TransferDirectoryItem[];
  focusTransferId?: string;
  canEditMedia: boolean;
}) {
  const t = useTranslations("transfers");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [openPhotosId, setOpenPhotosId] = useState<string | null>(
    focusTransferId ?? null,
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transfers.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!q) return true;
      const haystack = [
        item.sourceName,
        item.destinationName,
        item.notes ?? "",
        ...item.lines.flatMap((line) => [line.sku, line.productName]),
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, status, transfers]);

  const statusCounts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let rejected = 0;
    for (const item of transfers) {
      if (item.status === "PENDING") pending += 1;
      else if (item.status === "ACCEPTED") accepted += 1;
      else rejected += 1;
    }
    return { all: transfers.length, pending, accepted, rejected };
  }, [transfers]);

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold text-fg text-start">{t("history")}</h2>
        <label className="relative min-w-0 flex-1 sm:max-w-xs">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-muted"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("searchPlaceholder")}
            className="h-10 w-full rounded-lg border border-line-strong bg-muted ps-8 pe-2 text-sm text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>
        <div role="group" aria-label={t("filterStatus")} className="chip-scroll">
          <StatusChip
            pressed={status === "all"}
            onClick={() => setStatus("all")}
            label={t("filterAll")}
            count={statusCounts.all}
          />
          <StatusChip
            pressed={status === "PENDING"}
            onClick={() => setStatus("PENDING")}
            label={t("status.PENDING")}
            count={statusCounts.pending}
          />
          <StatusChip
            pressed={status === "ACCEPTED"}
            onClick={() => setStatus("ACCEPTED")}
            label={t("status.ACCEPTED")}
            count={statusCounts.accepted}
          />
          <StatusChip
            pressed={status === "REJECTED"}
            onClick={() => setStatus("REJECTED")}
            label={t("status.REJECTED")}
            count={statusCounts.rejected}
          />
        </div>
      </div>

      {transfers.length === 0 ? (
        <EmptyState title={t("empty")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("noMatches")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setStatus("all");
              }}
              className="inline-flex h-10 items-center rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted"
            >
              {t("clearFilters")}
            </button>
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface" role="list">
          {filtered.map((item) => {
            const photosOpen = openPhotosId === item.id || focusTransferId === item.id;
            const DestIcon = TYPE_ICONS[item.destinationType];
            return (
              <li
                key={item.id}
                className={
                  focusTransferId === item.id
                    ? "bg-judi-50/50 dark:bg-judi-950/20"
                    : undefined
                }
              >
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <Thumb
                    kind="warehouse"
                    size="sm"
                    icon={DestIcon}
                    src={item.primaryMediaUrl}
                    alt={item.destinationName}
                  />
                  <div className="min-w-0 flex-1 text-start">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <p className="flex flex-wrap items-center gap-1 text-sm font-medium text-fg">
                        <span>{item.sourceName}</span>
                        <ArrowRight
                          className="size-3.5 shrink-0 text-fg-muted rtl:rotate-180"
                          aria-hidden
                        />
                        <span>{item.destinationName}</span>
                      </p>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-fg-muted">
                      {t("lines", { count: item.lines.length })}
                      <span aria-hidden className="mx-1">
                        ·
                      </span>
                      {item.createdAtLabel}
                      {item.notes ? (
                        <>
                          <span aria-hidden className="mx-1">
                            ·
                          </span>
                          <span className="text-fg-subtle">{item.notes}</span>
                        </>
                      ) : null}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-fg-subtle">
                      {item.lines
                        .map((line) => `${line.sku} ${line.qtyLabel}`)
                        .join(" · ")}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      {item.showDecide ? (
                        <>
                          <form action={decideTransferAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="decision" value="ACCEPTED" />
                            <button
                              type="submit"
                              className="btn btn-important btn-sm"
                            >
                              <Check className="size-3.5" aria-hidden />
                              {t("accept")}
                            </button>
                          </form>
                          <form action={decideTransferAction}>
                            <input type="hidden" name="id" value={item.id} />
                            <input type="hidden" name="decision" value="REJECTED" />
                            <button
                              type="submit"
                              className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-300 px-2.5 text-xs font-semibold text-red-800 dark:border-red-800 dark:text-red-200"
                            >
                              <X className="size-3.5" aria-hidden />
                              {t("reject")}
                            </button>
                          </form>
                        </>
                      ) : null}
                      {canEditMedia || item.primaryMediaUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setOpenPhotosId((current) =>
                              current === item.id ? null : item.id,
                            )
                          }
                          className="inline-flex h-9 items-center gap-1 rounded-lg border border-line-strong px-2.5 text-xs font-medium text-fg hover:bg-muted"
                          aria-expanded={photosOpen}
                        >
                          <Camera className="size-3.5 text-judi-700 dark:text-judi-400" aria-hidden />
                          {photosOpen ? t("hidePhotos") : t("showPhotos")}
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
                {photosOpen ? (
                  <div className="border-t border-line px-3 py-2">
                    <MediaGallery
                      kind="STOCK"
                      entityType="StockTransfer"
                      entityId={item.id}
                      canEdit={canEditMedia}
                      compact
                    />
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function StatusChip({
  label,
  pressed,
  onClick,
  count,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex h-9 shrink-0 items-center gap-1 rounded-lg px-2.5 text-xs font-medium transition-colors ${
        pressed
          ? "seg-on"
          : "border border-line-strong bg-surface text-fg hover:bg-muted"
      }`}
    >
      <span>{label}</span>
      <span className={`tabular-nums ${pressed ? "opacity-90" : "text-fg-muted"}`}>
        {count}
      </span>
    </button>
  );
}

function EmptyState({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line bg-muted/30 px-3 py-6 text-center">
      <p className="text-sm text-fg-muted">{title}</p>
      {action ? <div className="mt-2 flex justify-center">{action}</div> : null}
    </div>
  );
}

function StatusBadge({ status }: { status: StockTransferStatus }) {
  const t = useTranslations("transfers");
  const tone =
    status === "PENDING"
      ? "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
      : status === "ACCEPTED"
        ? "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
        : "bg-red-100 text-red-900 dark:bg-red-950/40 dark:text-red-200";

  return (
    <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {t(`status.${status}`)}
    </span>
  );
}
