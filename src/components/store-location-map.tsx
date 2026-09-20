"use client";

import { useMemo, useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";

type StoreLocationMapProps = {
  latitude?: string | number | null;
  longitude?: string | number | null;
  /** Store name for the iframe title / open link. */
  label?: string;
  className?: string;
  /** Compact preview height (default 180). */
  height?: number;
};

function parseCoord(value: string | number | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Small Google Maps preview for a store pin.
 * Uses Maps Embed API when `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is set;
 * otherwise falls back to the standard Google Maps embed URL.
 */
export function StoreLocationMap({
  latitude,
  longitude,
  label,
  className = "",
  height = 180,
}: StoreLocationMapProps) {
  const t = useTranslations("stores");
  const lat = parseCoord(latitude);
  const lng = parseCoord(longitude);

  const embedSrc = useMemo(() => {
    if (lat == null || lng == null) return null;
    const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
    if (key) {
      const params = new URLSearchParams({
        key,
        q: `${lat},${lng}`,
        zoom: "16",
      });
      return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
    }
    return `https://www.google.com/maps?q=${lat},${lng}&z=16&hl=en&output=embed`;
  }, [lat, lng]);

  const openUrl =
    lat != null && lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
      : null;

  if (!embedSrc || !openUrl || lat == null || lng == null) {
    return (
      <div
        className={`flex min-h-[7.5rem] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-muted/40 px-3 py-4 text-center ${className}`}
      >
        <MapPin className="size-5 text-fg-subtle" aria-hidden />
        <p className="text-sm text-fg-muted">{t("mapEmpty")}</p>
      </div>
    );
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-line bg-muted/20 ${className}`}>
      <div className="relative w-full" style={{ height }}>
        <iframe
          title={label ? t("mapTitleNamed", { name: label }) : t("mapTitle")}
          src={embedSrc}
          className="absolute inset-0 size-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-3 py-2">
        <p className="text-xs tabular-nums text-fg-muted text-start">
          {lat.toFixed(5)}, {lng.toFixed(5)}
        </p>
        <a
          href={openUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-touch items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-judi-800 hover:bg-muted dark:text-judi-200"
        >
          <ExternalLink className="size-3.5 shrink-0" aria-hidden />
          {t("openInMaps")}
        </a>
      </div>
    </div>
  );
}

type LocationFieldsProps = {
  defaultLatitude?: string;
  defaultLongitude?: string;
  storeName?: string;
};

/** Lat/lng inputs + live Google Maps preview (client-synced). */
export function StoreLocationFields({
  defaultLatitude = "",
  defaultLongitude = "",
  storeName,
}: LocationFieldsProps) {
  const t = useTranslations("stores");
  const [latitude, setLatitude] = useState(defaultLatitude);
  const [longitude, setLongitude] = useState(defaultLongitude);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-start">
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <MapPin
              className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
              aria-hidden
            />
            {t("latitude")}
          </span>
          <input
            name="latitude"
            value={latitude}
            onChange={(event) => setLatitude(event.target.value)}
            inputMode="decimal"
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg tabular-nums"
          />
        </label>
        <label className="block space-y-1.5 text-start">
          <span className="block text-sm font-medium text-fg">{t("longitude")}</span>
          <input
            name="longitude"
            value={longitude}
            onChange={(event) => setLongitude(event.target.value)}
            inputMode="decimal"
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg tabular-nums"
          />
        </label>
      </div>
      <StoreLocationMap
        latitude={latitude}
        longitude={longitude}
        label={storeName}
        height={168}
      />
    </div>
  );
}
