"use client";

import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Camera, ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { MediaGallery } from "@/components/media-gallery";
import { EntityAvatar } from "@/components/thumb";
import type { MediaAssetDto } from "@/lib/media-shared";

type EmployeeMediaPanelProps = {
  userId: string;
  fullName: string;
  initialPrimaryUrl?: string | null;
  canEdit?: boolean;
  /** Open the gallery on mount (e.g. after create redirect with ?focus=). */
  defaultOpen?: boolean;
  size?: "sm" | "md" | "lg";
  /** Role icon when no portrait yet. */
  placeholderIcon?: LucideIcon;
  className?: string;
  onPrimaryUrlChange?: (url: string | null) => void;
};

/**
 * Camera 3 — employee / collector / delegate portraits.
 * List thumb + expandable MediaGallery (lazy-mounted when opened).
 */
export function EmployeeMediaPanel({
  userId,
  fullName,
  initialPrimaryUrl = null,
  canEdit = true,
  defaultOpen = false,
  size = "md",
  placeholderIcon,
  className = "",
  onPrimaryUrlChange,
}: EmployeeMediaPanelProps) {
  const t = useTranslations("users");
  const [open, setOpen] = useState(defaultOpen);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(initialPrimaryUrl);

  useEffect(() => {
    setPrimaryUrl(initialPrimaryUrl ?? null);
  }, [initialPrimaryUrl, userId]);

  useEffect(() => {
    if (!defaultOpen) return;
    setOpen(true);
    const el = document.getElementById(`user-${userId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [defaultOpen, userId]);

  function onChanged(items: MediaAssetDto[]) {
    const primary = items.find((item) => item.isPrimary) ?? items[0];
    const url = primary?.url ?? null;
    setPrimaryUrl(url);
    onPrimaryUrlChange?.(url);
  }

  return (
    <div id={`user-${userId}`} className={`space-y-3 ${className}`}>
      <div className="flex flex-wrap items-center gap-3">
        <EntityAvatar
          size={size}
          src={primaryUrl}
          alt={fullName}
          icon={placeholderIcon}
        />
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
          kind="EMPLOYEE"
          entityType="User"
          entityId={userId}
          canEdit={canEdit}
          onChanged={onChanged}
        />
      ) : null}
    </div>
  );
}
