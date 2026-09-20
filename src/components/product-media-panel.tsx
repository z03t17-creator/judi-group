"use client";

import { useEffect, useState } from "react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaGallery } from "@/components/media-gallery";
import { Thumb } from "@/components/thumb";
import type { MediaAssetDto } from "@/lib/media-shared";

type ProductMediaPanelProps = {
  productId: string;
  productName: string;
  initialPrimaryUrl?: string | null;
  canEdit?: boolean;
  /** Open the gallery on mount (e.g. after create redirect with ?focus=photos). */
  defaultOpen?: boolean;
  /** Smooth-scroll the product block into view when opening (use with ?focus=photos). */
  scrollOnOpen?: boolean;
  /** Dense layout for the barcode sidebar (2-col thumbs, short empty). */
  compact?: boolean;
  /** Hide outer chrome when nested inside another panel. */
  embedded?: boolean;
  className?: string;
  onPrimaryUrlChange?: (url: string | null) => void;
};

/**
 * Camera 2 — product photos.
 * Compact thumb + toggle; gallery mounts only when opened.
 */
export function ProductMediaPanel({
  productId,
  productName,
  initialPrimaryUrl = null,
  canEdit = true,
  defaultOpen = false,
  scrollOnOpen = false,
  compact = false,
  embedded = false,
  className = "",
  onPrimaryUrlChange,
}: ProductMediaPanelProps) {
  const t = useTranslations("products");
  const [open, setOpen] = useState(defaultOpen);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(initialPrimaryUrl);

  useEffect(() => {
    setPrimaryUrl(initialPrimaryUrl ?? null);
  }, [initialPrimaryUrl, productId]);

  useEffect(() => {
    if (!defaultOpen) return;
    setOpen(true);
    if (!scrollOnOpen) return;
    const el = document.getElementById(`product-${productId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [defaultOpen, productId, scrollOnOpen]);

  function onChanged(items: MediaAssetDto[]) {
    const primary = items.find((item) => item.isPrimary) ?? items[0];
    const next = primary?.url ?? null;
    setPrimaryUrl(next);
    onPrimaryUrlChange?.(next);
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <Thumb kind="product" size="sm" src={primaryUrl} alt={productName} />
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-touch min-w-0 flex-1 items-center justify-between gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted"
          aria-expanded={open}
        >
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <Camera
              className="size-4 shrink-0 text-judi-700 dark:text-judi-400"
              aria-hidden
            />
            <span className="truncate">
              {open ? t("hidePhotos") : t("showPhotos")}
            </span>
          </span>
          {open ? (
            <ChevronUp className="size-4 shrink-0" aria-hidden />
          ) : (
            <ChevronDown className="size-4 shrink-0" aria-hidden />
          )}
        </button>
      </div>

      {open ? (
        <div className={embedded ? undefined : "surface-panel p-2.5 sm:p-3"}>
          <MediaGallery
            kind="PRODUCT"
            entityType="Product"
            entityId={productId}
            canEdit={canEdit}
            compact={compact}
            onChanged={onChanged}
          />
        </div>
      ) : null}
    </div>
  );
}
