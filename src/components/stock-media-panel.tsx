"use client";

import { useEffect, useState } from "react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaGallery } from "@/components/media-gallery";
import { Thumb } from "@/components/thumb";
import type { MediaAssetDto, MediaEntityType } from "@/lib/media-shared";

/** Entity types Camera 4 (STOCK) can attach to — movements, counts, and later transfers/invoices. */
export type StockMediaEntityType = Extract<
  MediaEntityType,
  | "StockMovement"
  | "StockAudit"
  | "StockTransfer"
  | "Invoice"
  | "Transaction"
  | "PurchaseOrder"
  | "PurchaseReceipt"
  | "Expense"
>;

type StockMediaPanelProps = {
  entityType: StockMediaEntityType;
  entityId: string;
  /** Accessible / thumb alt label (product, transfer, audit day, …). */
  label: string;
  initialPrimaryUrl?: string | null;
  canEdit?: boolean;
  /** Open the gallery on mount (e.g. after receive redirect with ?focus=photos). */
  defaultOpen?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
  /** DOM id for scroll-into-view after create. */
  scrollId?: string;
};

/**
 * Camera 4 — stock / receive / write-off / count / transfer proof photos.
 * List thumb + expandable MediaGallery (lazy-mounted when opened).
 * Reuse on any page that needs STOCK kind images — do not build a fifth picker.
 */
export function StockMediaPanel({
  entityType,
  entityId,
  label,
  initialPrimaryUrl = null,
  canEdit = true,
  defaultOpen = false,
  size = "md",
  className = "",
  scrollId,
}: StockMediaPanelProps) {
  const t = useTranslations("stock");
  const [open, setOpen] = useState(defaultOpen);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(initialPrimaryUrl);
  const anchorId = scrollId ?? `stock-media-${entityType}-${entityId}`;

  useEffect(() => {
    setPrimaryUrl(initialPrimaryUrl ?? null);
  }, [initialPrimaryUrl, entityId]);

  useEffect(() => {
    if (!defaultOpen) return;
    setOpen(true);
    const el = document.getElementById(anchorId);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [defaultOpen, anchorId]);

  function onChanged(items: MediaAssetDto[]) {
    const primary = items.find((item) => item.isPrimary) ?? items[0];
    setPrimaryUrl(primary?.url ?? null);
  }

  return (
    <div id={anchorId} className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Thumb kind="stock" size={size} src={primaryUrl} alt={label} />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="btn btn-regular"
          aria-expanded={open}
        >
          <Camera className="size-5 shrink-0 text-judi-700 dark:text-judi-400" aria-hidden />
          {open ? t("hidePhotos") : t("showPhotos")}
          {open ? (
            <ChevronUp className="size-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <MediaGallery
          kind="STOCK"
          entityType={entityType}
          entityId={entityId}
          canEdit={canEdit}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  );
}
