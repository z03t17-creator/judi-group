"use client";

import { useEffect, useState } from "react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaGallery } from "@/components/media-gallery";
import { Thumb } from "@/components/thumb";
import type { MediaAssetDto } from "@/lib/media-shared";

type StoreMediaPanelProps = {
  storeId: string;
  storeName: string;
  initialPrimaryUrl?: string | null;
  canEdit?: boolean;
  /** Open the gallery on mount (e.g. after create redirect with ?focus=). */
  defaultOpen?: boolean;
  /** Compact row thumb only — parent controls expand via children below. */
  size?: "sm" | "md" | "lg";
  className?: string;
  onPrimaryUrlChange?: (url: string | null) => void;
};

/**
 * Camera 1 — store / customer storefront photos.
 * List thumb + expandable MediaGallery (lazy-mounted when opened).
 */
export function StoreMediaPanel({
  storeId,
  storeName,
  initialPrimaryUrl = null,
  canEdit = true,
  defaultOpen = false,
  size = "md",
  className = "",
  onPrimaryUrlChange,
}: StoreMediaPanelProps) {
  const t = useTranslations("stores");
  const [open, setOpen] = useState(defaultOpen);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(initialPrimaryUrl);

  useEffect(() => {
    setPrimaryUrl(initialPrimaryUrl ?? null);
  }, [initialPrimaryUrl, storeId]);

  useEffect(() => {
    if (!defaultOpen) return;
    setOpen(true);
    const el = document.getElementById(`store-${storeId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [defaultOpen, storeId]);

  function onChanged(items: MediaAssetDto[]) {
    const primary = items.find((item) => item.isPrimary) ?? items[0];
    const url = primary?.url ?? null;
    setPrimaryUrl(url);
    onPrimaryUrlChange?.(url);
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <Thumb kind="store" size={size} src={primaryUrl} alt={storeName} />
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
          kind="STORE"
          entityType="Store"
          entityId={storeId}
          canEdit={canEdit}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  );
}
