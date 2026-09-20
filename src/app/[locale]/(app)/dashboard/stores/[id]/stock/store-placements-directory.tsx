"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Camera, Package } from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaGallery } from "@/components/media-gallery";
import { Thumb } from "@/components/thumb";

export type StorePlacementLinePreview = {
  id: string;
  sku: string;
  productName: string;
  qtyLabel: string;
  baseQtyLabel: string;
  primaryMediaUrl: string | null;
  expiryLabel: string | null;
  lotCode: string | null;
};

export type StorePlacementDirectoryItem = {
  id: string;
  direction: "TO_STORE" | "FROM_STORE";
  warehouseName: string;
  notes: string | null;
  createdAtLabel: string;
  createdByName: string;
  lines: StorePlacementLinePreview[];
  primaryMediaUrl: string | null;
};

export function StorePlacementsDirectory({
  placements,
  focusPlacementId,
  canEditMedia,
}: {
  placements: StorePlacementDirectoryItem[];
  focusPlacementId?: string;
  canEditMedia: boolean;
}) {
  const t = useTranslations("storeStock");
  const [openPhotosId, setOpenPhotosId] = useState<string | null>(
    focusPlacementId ?? null,
  );

  const filtered = useMemo(() => placements, [placements]);

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-10 text-center">
        <Package className="size-8 text-fg-muted" aria-hidden />
        <p className="font-semibold text-fg">{t("recentEmptyTitle")}</p>
        <p className="text-sm text-fg-muted">{t("recentEmptyHint")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {filtered.map((row) => {
        const photosOpen = openPhotosId === row.id;
        return (
          <li
            key={row.id}
            className="rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 text-start">
                <p className="text-sm font-semibold text-fg">
                  {row.direction === "TO_STORE"
                    ? t("directionToStore")
                    : t("directionFromStore")}
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-fg-muted">
                  <span>{row.warehouseName}</span>
                  <ArrowRight className="size-3 rtl:rotate-180" aria-hidden />
                  <span>{row.createdAtLabel}</span>
                  <span>· {row.createdByName}</span>
                </p>
                {row.notes ? (
                  <p className="mt-1 text-sm text-fg-muted">{row.notes}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() =>
                  setOpenPhotosId((current) => (current === row.id ? null : row.id))
                }
                className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-muted px-3 text-sm font-medium text-fg hover:bg-surface"
              >
                <Camera className="size-4" aria-hidden />
                {photosOpen ? t("hidePhotos") : t("showPhotos")}
              </button>
            </div>

            <ul className="mt-3 space-y-2">
              {row.lines.map((line) => (
                <li
                  key={line.id}
                  className="flex items-center gap-2 rounded-xl border border-line bg-muted/30 px-2 py-2"
                >
                  <Thumb
                    kind="product"
                    size="sm"
                    src={line.primaryMediaUrl}
                    alt={line.productName}
                  />
                  <div className="min-w-0 flex-1 text-start">
                    <p className="truncate text-sm font-medium text-fg">
                      {line.productName}
                    </p>
                    <p className="text-xs text-fg-muted">
                      {line.sku} · {line.qtyLabel} · {line.baseQtyLabel}
                      {line.lotCode ? ` · ${line.lotCode}` : ""}
                      {line.expiryLabel ? ` · ${line.expiryLabel}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            {photosOpen ? (
              <div className="mt-3 border-t border-line pt-3">
                <MediaGallery
                  kind="STOCK"
                  entityType="StorePlacement"
                  entityId={row.id}
                  canEdit={canEditMedia}
                  compact
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
