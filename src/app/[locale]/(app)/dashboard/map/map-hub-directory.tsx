"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  MapPin,
  MapPinned,
  Navigation,
  Search,
  Store,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StoreLocationMap } from "@/components/store-location-map";
import { Thumb } from "@/components/thumb";
import type { StoreStatus, StoreTier } from "@/lib/constants";

export type MapHubStore = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  tier: StoreTier;
  status: StoreStatus;
  thumbUrl: string | null;
};

type GpsFilter = "all" | "mapped" | "missing";

type MapHubDirectoryProps = {
  stores: MapHubStore[];
};

export function MapHubDirectory({ stores }: MapHubDirectoryProps) {
  const t = useTranslations("mapHub");
  const tStores = useTranslations("stores");
  const tTiers = useTranslations("storeTiers");
  const [query, setQuery] = useState("");
  const [tier, setTier] = useState<"all" | StoreTier>("all");
  const [status, setStatus] = useState<"all" | StoreStatus>("all");
  const [gps, setGps] = useState<GpsFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const firstMapped = stores.find((s) => s.latitude != null && s.longitude != null);
    return firstMapped?.id ?? stores[0]?.id ?? null;
  });

  const mappedCount = useMemo(
    () => stores.filter((s) => s.latitude != null && s.longitude != null).length,
    [stores],
  );
  const missingCount = stores.length - mappedCount;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((store) => {
      if (tier !== "all" && store.tier !== tier) return false;
      if (status !== "all" && store.status !== status) return false;
      const hasGps = store.latitude != null && store.longitude != null;
      if (gps === "mapped" && !hasGps) return false;
      if (gps === "missing" && hasGps) return false;
      if (!q) return true;
      return (
        store.storeName.toLowerCase().includes(q) ||
        (store.ownerName?.toLowerCase().includes(q) ?? false) ||
        store.phone.includes(q) ||
        (store.address?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [stores, query, tier, status, gps]);

  const selected =
    filtered.find((s) => s.id === selectedId) ??
    filtered[0] ??
    stores.find((s) => s.id === selectedId) ??
    null;

  const googleAllUrl = useMemo(() => {
    const pins = filtered.filter((s) => s.latitude != null && s.longitude != null).slice(0, 9);
    if (pins.length === 0) return null;
    if (pins.length === 1) {
      return `https://www.google.com/maps/search/?api=1&query=${pins[0].latitude},${pins[0].longitude}`;
    }
    const dest = pins
      .map((s) => `${s.latitude},${s.longitude}`)
      .join("/");
    return `https://www.google.com/maps/dir/${dest}`;
  }, [filtered]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label={t("statTotal")}
          value={String(stores.length)}
          icon={Store}
        />
        <StatCard
          label={t("statMapped")}
          value={String(mappedCount)}
          icon={MapPinned}
        />
        <StatCard
          label={t("statMissing")}
          value={String(missingCount)}
          icon={MapPin}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
        <label className="relative min-w-[12rem] flex-1 text-start">
          <span className="sr-only">{t("search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-canvas pe-3 ps-10 text-fg"
          />
        </label>
        <label className="block space-y-1 text-start">
          <span className="text-xs font-medium text-fg-muted">{t("filterTier")}</span>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value as "all" | StoreTier)}
            className="min-h-touch rounded-xl border border-line-strong bg-canvas px-3 text-fg"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="WHOLESALE">{tTiers("WHOLESALE")}</option>
            <option value="SUPERMARKET">{tTiers("SUPERMARKET")}</option>
            <option value="MINIMARKET">{tTiers("MINIMARKET")}</option>
          </select>
        </label>
        <label className="block space-y-1 text-start">
          <span className="text-xs font-medium text-fg-muted">{t("filterStatus")}</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as "all" | StoreStatus)}
            className="min-h-touch rounded-xl border border-line-strong bg-canvas px-3 text-fg"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="ACTIVE">{tStores("accountStatuses.ACTIVE")}</option>
            <option value="INACTIVE">{tStores("accountStatuses.INACTIVE")}</option>
            <option value="PROSPECT">{tStores("accountStatuses.PROSPECT")}</option>
          </select>
        </label>
        <label className="block space-y-1 text-start">
          <span className="text-xs font-medium text-fg-muted">{t("filterGps")}</span>
          <select
            value={gps}
            onChange={(e) => setGps(e.target.value as GpsFilter)}
            className="min-h-touch rounded-xl border border-line-strong bg-canvas px-3 text-fg"
          >
            <option value="all">{t("filterAll")}</option>
            <option value="mapped">{t("gpsMapped")}</option>
            <option value="missing">{t("gpsMissing")}</option>
          </select>
        </label>
        {googleAllUrl ? (
          <a
            href={googleAllUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-important"
          >
            <Navigation className="size-4 shrink-0" aria-hidden />
            {t("openFiltered")}
          </a>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <section
          className="max-h-[min(70vh,36rem)] space-y-2 overflow-y-auto rounded-2xl border border-line bg-surface p-2 shadow-sm"
          aria-label={t("listLabel")}
        >
          {filtered.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-fg-muted">{t("empty")}</p>
          ) : (
            filtered.map((store) => {
              const active = selected?.id === store.id;
              const hasGps = store.latitude != null && store.longitude != null;
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => setSelectedId(store.id)}
                  className={`flex w-full min-h-touch items-center gap-3 rounded-xl px-3 py-2 text-start transition-colors ${
                    active
                      ? "bg-accent-soft text-judi-950 dark:text-judi-50"
                      : "hover:bg-muted"
                  }`}
                >
                  <Thumb kind="store" size="sm" src={store.thumbUrl} alt="" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fg">
                      {store.storeName}
                    </span>
                    <span className="block truncate text-xs text-fg-muted">
                      {store.address || store.phone}
                    </span>
                  </span>
                  {hasGps ? (
                    <MapPinned
                      className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
                      aria-label={t("gpsMapped")}
                    />
                  ) : (
                    <MapPin
                      className="size-4 shrink-0 text-fg-subtle"
                      aria-label={t("gpsMissing")}
                    />
                  )}
                </button>
              );
            })
          )}
        </section>

        <section className="space-y-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          {selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3 text-start">
                <div className="flex min-w-0 items-start gap-3">
                  <Thumb kind="store" size="md" src={selected.thumbUrl} alt="" />
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-fg break-words">
                      {selected.storeName}
                    </h2>
                    {selected.ownerName ? (
                      <p className="text-sm text-fg-muted">{selected.ownerName}</p>
                    ) : null}
                    <p className="mt-1 text-sm tabular-nums text-fg-muted">
                      {selected.phone}
                    </p>
                    {selected.address ? (
                      <p className="mt-0.5 text-sm text-fg-muted break-words">
                        {selected.address}
                      </p>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={`/dashboard/stores?focus=${selected.id}`}
                  className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-line px-3 text-sm font-medium text-fg hover:bg-muted"
                >
                  <ExternalLink className="size-4 shrink-0" aria-hidden />
                  {t("openStore")}
                </Link>
              </div>
              <StoreLocationMap
                latitude={selected.latitude}
                longitude={selected.longitude}
                label={selected.storeName}
                height={320}
              />
            </>
          ) : (
            <div className="flex min-h-[16rem] flex-col items-center justify-center gap-2 text-center">
              <MapPin className="size-8 text-fg-subtle" aria-hidden />
              <p className="text-sm text-fg-muted">{t("empty")}</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Store;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-sm text-start">
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-judi-800 dark:text-judi-100">
        <Icon className="size-5" aria-hidden />
      </span>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
          {label}
        </p>
        <p className="text-xl font-bold tabular-nums text-fg">{value}</p>
      </div>
    </div>
  );
}
