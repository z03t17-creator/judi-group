"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  LayoutGrid,
  List,
  MapPin,
  Navigation,
  Search,
  ShoppingBag,
  Store,
  ExternalLink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import {
  STORE_CHANNELS,
  storeChannel,
  type StoreChannel,
  type StoreTier,
} from "@/lib/constants";
import { sortStoresByDistance } from "@/lib/geo";
import { captureStoreGpsAction } from "../customers/actions";

export type SiteSettingsStore = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  address: string | null;
  tier: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  primaryMediaUrl: string | null;
};

type ViewMode = "grid" | "list";
type ChannelFilter = "all" | StoreChannel;
type GpsFilter = "all" | "pinned" | "missing";
type StatusFilter = "all" | "ACTIVE" | "INACTIVE" | "PROSPECT";

const CHANNEL_ICONS: Record<StoreChannel, LucideIcon> = {
  WHOLESALE: Building2,
  RETAIL: ShoppingBag,
};

export function SiteSettingsDirectory({
  stores,
  focusId = null,
}: {
  stores: SiteSettingsStore[];
  focusId?: string | null;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [gpsFilter, setGpsFilter] = useState<GpsFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [gpsError, setGpsError] = useState<string | null>(null);

  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`site-${focusId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, [focusId]);

  const enriched = useMemo(
    () =>
      stores.map((store) => ({
        ...store,
        channel: storeChannel(store.tier),
        hasGps: store.latitude != null && store.longitude != null,
      })),
    [stores],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = enriched.filter((store) => {
      if (channelFilter !== "all" && store.channel !== channelFilter) return false;
      if (gpsFilter === "pinned" && !store.hasGps) return false;
      if (gpsFilter === "missing" && store.hasGps) return false;
      if (statusFilter !== "all" && store.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        store.storeName.toLowerCase().includes(needle) ||
        store.phone.includes(needle) ||
        (store.ownerName ?? "").toLowerCase().includes(needle) ||
        (store.address ?? "").toLowerCase().includes(needle)
      );
    });

    if (!origin) {
      return [...matches].sort((a, b) => a.storeName.localeCompare(b.storeName));
    }
    return sortStoresByDistance(matches, origin);
  }, [channelFilter, enriched, gpsFilter, origin, query, statusFilter]);

  function locateMe() {
    if (!navigator.geolocation) {
      setGpsError(t("stores.gpsUnavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsError(null);
        setOrigin({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => setGpsError(t("stores.gpsDenied")),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function clearFilters() {
    setQuery("");
    setChannelFilter("all");
    setGpsFilter("all");
    setStatusFilter("all");
  }

  const gpsCounts = useMemo(() => {
    let pinned = 0;
    let missing = 0;
    for (const store of enriched) {
      if (store.hasGps) pinned += 1;
      else missing += 1;
    }
    return { pinned, missing, all: enriched.length };
  }, [enriched]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === stores.length
            ? t("field.siteSettingsListHint", { count: stores.length })
            : t("field.siteSettingsMatched", {
                matched: filtered.length,
                total: stores.length,
              })}
        </p>
        <ViewToggle view={view} onChange={setView} />
      </div>

      <section
        aria-labelledby="field-site-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="field-site-filters-heading" className="sr-only">
          {t("field.siteSettingsFiltersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("stores.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("stores.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div role="group" aria-label={t("field.gpsFilter")} className="chip-scroll">
          <FilterChip
            pressed={gpsFilter === "all"}
            onClick={() => setGpsFilter("all")}
            label={t("field.gpsAll")}
            count={gpsCounts.all}
          />
          <FilterChip
            pressed={gpsFilter === "pinned"}
            onClick={() => setGpsFilter("pinned")}
            label={t("field.gpsPinned")}
            icon={MapPin}
            count={gpsCounts.pinned}
          />
          <FilterChip
            pressed={gpsFilter === "missing"}
            onClick={() => setGpsFilter("missing")}
            label={t("field.gpsMissing")}
            icon={Navigation}
            count={gpsCounts.missing}
          />
        </div>

        <div role="group" aria-label={t("stores.filterChannel")} className="chip-scroll">
          <FilterChip
            pressed={channelFilter === "all"}
            onClick={() => setChannelFilter("all")}
            label={t("stores.allChannels")}
          />
          {STORE_CHANNELS.map((channel) => {
            const Icon = CHANNEL_ICONS[channel];
            return (
              <FilterChip
                key={channel}
                pressed={channelFilter === channel}
                onClick={() => setChannelFilter(channel)}
                label={t(`stores.channels.${channel}`)}
                icon={Icon}
              />
            );
          })}
        </div>

        <div role="group" aria-label={t("stores.filterAccountStatus")} className="chip-scroll">
          <FilterChip
            pressed={statusFilter === "all"}
            onClick={() => setStatusFilter("all")}
            label={t("stores.allAccountStatuses")}
          />
          {(["ACTIVE", "PROSPECT", "INACTIVE"] as const).map((status) => (
            <FilterChip
              key={status}
              pressed={statusFilter === status}
              onClick={() => setStatusFilter(status)}
              label={t(`stores.accountStatuses.${status}`)}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={locateMe}
            className="btn btn-regular"
          >
            <Navigation className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            {t("stores.sortByDistance")}
          </button>
          {query ||
          channelFilter !== "all" ||
          gpsFilter !== "all" ||
          statusFilter !== "all" ? (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("stores.clearFilters")}
            </button>
          ) : null}
        </div>
        {gpsError ? (
          <p className="text-sm text-red-700 text-start dark:text-red-300" role="alert">
            {gpsError}
          </p>
        ) : null}
        {origin ? (
          <p className="text-sm text-fg-muted text-start">{t("stores.sortedByDistance")}</p>
        ) : null}
      </section>

      {stores.length === 0 ? (
        <EmptyState
          title={t("field.siteSettingsEmpty")}
          hint={t("field.siteSettingsEmptyHint")}
          action={
            <Link
              href="/field/customers/new"
              className="btn btn-important"
            >
              {t("field.addCustomer")}
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("stores.noMatches")}
          hint={t("stores.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("stores.clearFilters")}
            </button>
          }
        />
      ) : (
        <ul
          className={
            view === "grid"
              ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "space-y-3"
          }
          role="list"
        >
          {filtered.map((store) => {
            const dist =
              origin && store.latitude != null && store.longitude != null
                ? sortStoresByDistance([store], origin)[0]?.distanceKm
                : null;
            return (
              <li key={store.id}>
                <SiteCard store={store} distanceKm={dist} listLayout={view === "list"} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SiteCard({
  store,
  distanceKm,
  listLayout,
}: {
  store: SiteSettingsStore & { channel: StoreChannel; hasGps: boolean };
  distanceKm: number | null | undefined;
  listLayout: boolean;
}) {
  const t = useTranslations();
  const tier = store.tier as StoreTier;
  const mapsHref =
    store.hasGps
      ? `https://www.google.com/maps?q=${store.latitude},${store.longitude}`
      : null;
  const customerHref =
    store.status === "PROSPECT"
      ? `/field/prospects?focus=${store.id}`
      : `/field/customers?focus=${store.id}`;

  return (
    <article
      id={`site-${store.id}`}
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        listLayout ? "sm:p-5" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Thumb kind="store" size="md" src={store.primaryMediaUrl} alt="" />
        <div className="min-w-0 flex-1 text-start">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-fg">{store.storeName}</h2>
              <p className="text-sm text-fg-muted">
                {store.phone}
                {store.ownerName ? ` · ${store.ownerName}` : ""}
              </p>
              <p className="mt-1 text-sm text-fg-subtle">
                {t(`stores.channels.${store.channel}`)} · {t(`storeTiers.${tier}`)}
                {distanceKm != null
                  ? ` · ${distanceKm.toFixed(1)} ${t("stores.km")}`
                  : ""}
              </p>
            </div>
            <span
              className={`inline-flex min-h-touch items-center rounded-xl px-3 text-sm font-semibold ${
                store.status === "PROSPECT"
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                  : store.status === "INACTIVE"
                    ? "bg-muted text-fg-muted"
                    : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
              }`}
            >
              {t(`stores.accountStatuses.${store.status as "ACTIVE" | "INACTIVE" | "PROSPECT"}`)}
            </span>
          </div>
          <p className="mt-2 text-sm text-fg">
            {t("field.gpsCoords")}:{" "}
            <span className="font-medium tabular-nums" dir="ltr">
              {store.hasGps
                ? `${store.latitude!.toFixed(5)}, ${store.longitude!.toFixed(5)}`
                : t("field.noCoords")}
            </span>
          </p>
          {store.address ? (
            <p className="mt-1 text-sm text-fg-muted">{store.address}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <GpsCapture storeId={store.id} />
        {mapsHref ? (
          <a
            href={mapsHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-muted px-3 text-sm font-medium text-fg hover:bg-surface"
          >
            <ExternalLink className="size-4 shrink-0" aria-hidden />
            {t("stores.openInMaps")}
          </a>
        ) : null}
        <Link
          href={customerHref}
          className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-muted px-3 text-sm font-medium text-fg hover:bg-surface"
        >
          {t("field.openCustomer")}
        </Link>
      </div>
    </article>
  );
}

function GpsCapture({ storeId }: { storeId: string }) {
  const t = useTranslations();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function capture(form: HTMLFormElement) {
    if (!navigator.geolocation) {
      setError(t("stores.gpsUnavailable"));
      return;
    }
    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = form.elements.namedItem("latitude") as HTMLInputElement;
        const lng = form.elements.namedItem("longitude") as HTMLInputElement;
        lat.value = String(position.coords.latitude);
        lng.value = String(position.coords.longitude);
        form.requestSubmit();
      },
      () => {
        setPending(false);
        setError(t("stores.gpsDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form action={captureStoreGpsAction} className="inline" onSubmit={() => setPending(false)}>
      <input type="hidden" name="id" value={storeId} />
      <input type="hidden" name="returnTo" value="settings" />
      <input type="hidden" name="latitude" defaultValue="" />
      <input type="hidden" name="longitude" defaultValue="" />
      {error ? (
        <p className="mb-2 text-sm text-red-700 text-start dark:text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={(event) => capture(event.currentTarget.form!)}
        className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-judi-300 px-3 text-sm font-semibold text-judi-900 dark:border-judi-700 dark:text-judi-200"
      >
        <MapPin className="size-4 shrink-0" aria-hidden />
        {pending ? t("stores.capturing") : t("stores.captureGps")}
      </button>
    </form>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const t = useTranslations();
  return (
    <div
      role="group"
      aria-label={t("stores.viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("stores.viewGrid")}
        onClick={() => onChange("grid")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 transition-colors ${
          view === "grid"
            ? "seg-on"
            : "text-fg-muted hover:bg-muted hover:text-fg"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        aria-label={t("stores.viewList")}
        onClick={() => onChange("list")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 transition-colors ${
          view === "list"
            ? "seg-on"
            : "text-fg-muted hover:bg-muted hover:text-fg"
        }`}
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function FilterChip({
  label,
  pressed,
  onClick,
  icon: Icon,
  count,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: LucideIcon;
  count?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors ${
        pressed
          ? "seg-on"
          : "border border-line-strong bg-muted text-fg hover:bg-surface"
      }`}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      <span>{label}</span>
      {count != null ? (
        <span className={`tabular-nums text-xs ${pressed ? "opacity-90" : "text-fg-muted"}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-10 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-muted text-judi-800 dark:text-judi-200">
        <Store className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}
