"use client";

import { AlertTriangle, CalendarClock, MapPin, Package, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import { writeOffLotAction } from "./actions";

export type ExpiryLotItem = {
  id: string;
  productName: string;
  productSku: string;
  primaryMediaUrl: string | null;
  baseQty: string;
  lotCode: string | null;
  expiryDate: string | null;
  daysLeft: number | null;
  locationKind: "warehouse" | "van" | "store";
  locationName: string;
  warehouseType: string | null;
};

type ExpiryDirectoryProps = {
  lots: ExpiryLotItem[];
  canWriteOff: boolean;
  filter: "expired" | "soon" | "all";
  locationFilter: "all" | "warehouse" | "van" | "store";
};

function statusTone(daysLeft: number | null) {
  if (daysLeft == null) return "neutral";
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 7) return "critical";
  if (daysLeft <= 14) return "warn";
  if (daysLeft <= 30) return "soon";
  return "ok";
}

export function ExpiryDirectory({
  lots,
  canWriteOff,
  filter,
  locationFilter,
}: ExpiryDirectoryProps) {
  const t = useTranslations("expiry");

  const filtered = lots.filter((lot) => {
    if (locationFilter !== "all" && lot.locationKind !== locationFilter) {
      return false;
    }
    if (filter === "all") return true;
    if (lot.daysLeft == null) return filter === "all";
    if (filter === "expired") return lot.daysLeft < 0;
    return lot.daysLeft >= 0 && lot.daysLeft <= 30;
  });

  if (filtered.length === 0) {
    return (
      <div className="surface-panel px-4 py-10 text-center">
        <CalendarClock className="mx-auto size-8 text-fg-muted" aria-hidden />
        <p className="mt-3 text-sm font-medium text-fg">{t("empty")}</p>
        <p className="mt-1 text-sm text-fg-muted">{t("emptyHint")}</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {filtered.map((lot) => {
        const tone = statusTone(lot.daysLeft);
        const canOff =
          canWriteOff &&
          Number(lot.baseQty) > 0 &&
          (lot.daysLeft == null || lot.daysLeft <= 30);

        return (
          <li
            key={lot.id}
            className="surface-panel flex flex-col gap-3 p-3 sm:flex-row sm:items-center"
          >
            <Thumb
              kind="product"
              src={lot.primaryMediaUrl}
              alt={lot.productName}
              size="md"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1 space-y-1 text-start">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-fg">{lot.productName}</p>
                <span
                  className={`rounded-lg px-2 py-0.5 text-xs font-medium ${
                    tone === "expired"
                      ? "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200"
                      : tone === "critical"
                        ? "bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-100"
                        : tone === "warn"
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                          : tone === "soon"
                            ? "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
                            : "bg-surface-2 text-fg-muted"
                  }`}
                >
                  {lot.daysLeft == null
                    ? t("noExpiry")
                    : lot.daysLeft < 0
                      ? t("expiredDays", { days: Math.abs(lot.daysLeft) })
                      : t("daysLeft", { days: lot.daysLeft })}
                </span>
              </div>
              <p className="text-xs text-fg-muted">
                <Package className="me-1 inline size-3.5" aria-hidden />
                {lot.productSku}
                {lot.lotCode ? ` · ${t("lotCode")}: ${lot.lotCode}` : ""}
                {lot.expiryDate ? ` · ${t("expiryDate")}: ${lot.expiryDate}` : ""}
              </p>
              <p className="text-xs text-fg-muted">
                <MapPin className="me-1 inline size-3.5" aria-hidden />
                {t(`location.${lot.locationKind}`)} · {lot.locationName}
                {" · "}
                {t("qty", { qty: lot.baseQty })}
              </p>
            </div>

            {canOff ? (
              <form action={writeOffLotAction} className="shrink-0">
                <input type="hidden" name="stockLotId" value={lot.id} />
                <button
                  type="submit"
                  className="inline-flex min-h-touch min-w-touch items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 text-sm font-medium text-red-800 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200 dark:hover:bg-red-950/70"
                >
                  <Trash2 className="size-4" aria-hidden />
                  {t("writeOff")}
                </button>
              </form>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}

export function ExpiryFilterBar({
  filter,
  locationFilter,
}: {
  filter: "expired" | "soon" | "all";
  locationFilter: "all" | "warehouse" | "van" | "store";
}) {
  const t = useTranslations("expiry");

  const filters: Array<"expired" | "soon" | "all"> = ["expired", "soon", "all"];
  const locations: Array<"all" | "warehouse" | "van" | "store"> = [
    "all",
    "warehouse",
    "van",
    "store",
  ];

  return (
    <div className="surface-panel space-y-3 p-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterStatus")}>
        {filters.map((key) => (
          <Link
            key={key}
            href={`/dashboard/expiry?filter=${key}&location=${locationFilter}`}
            className={`inline-flex min-h-touch items-center rounded-xl px-3 text-sm font-medium transition-colors ${
              filter === key
                ? "bg-judi-800 text-white"
                : "bg-surface-2 text-fg hover:bg-judi-100 dark:hover:bg-judi-950/50"
            }`}
          >
            {key === "expired" ? (
              <AlertTriangle className="me-1.5 size-4" aria-hidden />
            ) : null}
            {t(`filters.${key}`)}
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("filterLocation")}>
        {locations.map((key) => (
          <Link
            key={key}
            href={`/dashboard/expiry?filter=${filter}&location=${key}`}
            className={`inline-flex min-h-touch items-center rounded-xl px-3 text-sm font-medium transition-colors ${
              locationFilter === key
                ? "bg-judi-700 text-white"
                : "bg-surface-2 text-fg hover:bg-judi-100 dark:hover:bg-judi-950/50"
            }`}
          >
            {t(`location.${key === "all" ? "all" : key}`)}
          </Link>
        ))}
      </div>
    </div>
  );
}
