"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Building2,
  LayoutGrid,
  List,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  Search,
  ShoppingBag,
  Store,
  UserCheck,
  UserRoundSearch,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { StoreMediaPanel } from "@/components/store-media-panel";
import { Thumb } from "@/components/thumb";
import {
  STORE_CHANNELS,
  STORE_TIERS,
  storeChannel,
  type StoreChannel,
  type StoreTier,
} from "@/lib/constants";
import { sortStoresByDistance } from "@/lib/geo";
import {
  captureStoreGpsAction,
  convertProspectAction,
  createFieldStoreAction,
  updateFieldStoreAction,
} from "../customers/actions";

export type ProspectStore = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  email: string | null;
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

const CHANNEL_ICONS: Record<StoreChannel, LucideIcon> = {
  WHOLESALE: Building2,
  RETAIL: ShoppingBag,
};

export function ProspectsDirectory({
  stores,
  focusId = null,
}: {
  stores: ProspectStore[];
  focusId?: string | null;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [gpsFilter, setGpsFilter] = useState<GpsFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(focusId);
  const [creating, setCreating] = useState(false);
  const [thumbByStoreId, setThumbByStoreId] = useState<Record<string, string | null>>(
    () => Object.fromEntries(stores.map((store) => [store.id, store.primaryMediaUrl])),
  );

  useEffect(() => {
    setThumbByStoreId((prev) => {
      const next = { ...prev };
      for (const store of stores) {
        if (!(store.id in next)) next[store.id] = store.primaryMediaUrl;
      }
      return next;
    });
  }, [stores]);

  useEffect(() => {
    if (!focusId) return;
    setEditingId(focusId);
    document.getElementById(`prospect-${focusId}`)?.scrollIntoView({
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
      if (!needle) return true;
      return (
        store.storeName.toLowerCase().includes(needle) ||
        store.phone.includes(needle) ||
        (store.email ?? "").toLowerCase().includes(needle) ||
        (store.ownerName ?? "").toLowerCase().includes(needle) ||
        (store.address ?? "").toLowerCase().includes(needle)
      );
    });

    if (!origin) {
      return [...matches].sort((a, b) => a.storeName.localeCompare(b.storeName));
    }
    return sortStoresByDistance(matches, origin);
  }, [channelFilter, enriched, gpsFilter, origin, query]);

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
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === stores.length
            ? t("field.prospectsListHint", { count: stores.length })
            : t("field.prospectsMatched", {
                matched: filtered.length,
                total: stores.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="btn btn-important"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            {t("field.addProspect")}
          </button>
        </div>
      </div>

      <section
        aria-labelledby="field-prospects-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="field-prospects-filters-heading" className="sr-only">
          {t("field.prospectsFiltersTitle")}
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

        <div role="group" aria-label={t("field.gpsFilter")} className="chip-scroll">
          <FilterChip
            pressed={gpsFilter === "all"}
            onClick={() => setGpsFilter("all")}
            label={t("field.gpsAll")}
          />
          <FilterChip
            pressed={gpsFilter === "pinned"}
            onClick={() => setGpsFilter("pinned")}
            label={t("field.gpsPinned")}
            icon={MapPin}
          />
          <FilterChip
            pressed={gpsFilter === "missing"}
            onClick={() => setGpsFilter("missing")}
            label={t("field.gpsMissing")}
            icon={Navigation}
          />
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
          {query || channelFilter !== "all" || gpsFilter !== "all" ? (
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
          title={t("field.prospectsEmpty")}
          hint={t("field.prospectsEmptyHint")}
          action={
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("field.addProspect")}
            </button>
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
                <ProspectCard
                  store={store}
                  thumbSrc={thumbByStoreId[store.id] ?? store.primaryMediaUrl}
                  distanceKm={dist}
                  expanded={editingId === store.id}
                  focusPhotos={focusId === store.id}
                  listLayout={view === "list"}
                  onToggleExpand={() =>
                    setEditingId(editingId === store.id ? null : store.id)
                  }
                  onPrimaryUrlChange={(url) =>
                    setThumbByStoreId((prev) => ({ ...prev, [store.id]: url }))
                  }
                />
              </li>
            );
          })}
        </ul>
      )}

      {creating ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/50 dark:bg-black/70"
            aria-label={t("stores.dismissOverlay")}
            onClick={() => setCreating(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-line px-4 py-4 text-start sm:px-5">
              <span className="icon-badge icon-badge-md tone-sky">
                <UserRoundSearch className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-fg">{t("field.addProspect")}</h2>
                <p className="text-sm text-fg-subtle">{t("stores.photosAfterSave")}</p>
              </div>
              <button
                type="button"
                onClick={() => setCreating(false)}
                className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
                aria-label={t("common.cancel")}
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>
            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              <ProspectForm action={createFieldStoreAction} submitLabel={t("stores.save")} />
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ProspectCard({
  store,
  thumbSrc,
  distanceKm,
  expanded,
  focusPhotos,
  listLayout,
  onToggleExpand,
  onPrimaryUrlChange,
}: {
  store: ProspectStore & { channel: StoreChannel; hasGps: boolean };
  thumbSrc: string | null;
  distanceKm: number | null | undefined;
  expanded: boolean;
  focusPhotos: boolean;
  listLayout: boolean;
  onToggleExpand: () => void;
  onPrimaryUrlChange: (url: string | null) => void;
}) {
  const t = useTranslations();
  const tier = store.tier as StoreTier;

  return (
    <article
      id={`prospect-${store.id}`}
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        listLayout ? "sm:p-5" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <Thumb kind="store" size="md" src={thumbSrc} alt="" />
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
            <span className="inline-flex min-h-touch items-center rounded-xl bg-amber-50 px-3 text-sm font-semibold text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {t("stores.accountStatuses.PROSPECT")}
            </span>
          </div>
          <p className="mt-2 text-sm text-fg-muted">
            {store.hasGps
              ? `${store.latitude!.toFixed(5)}, ${store.longitude!.toFixed(5)}`
              : t("field.noCoords")}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <form action={convertProspectAction}>
          <input type="hidden" name="id" value={store.id} />
          <button
            type="submit"
            className="btn btn-important"
          >
            <UserCheck className="size-4 shrink-0" aria-hidden />
            {t("field.convertToCustomer")}
          </button>
        </form>
        <button
          type="button"
          onClick={onToggleExpand}
          className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-muted px-3 text-sm font-medium text-fg hover:bg-surface"
        >
          <Pencil className="size-4 shrink-0" aria-hidden />
          {expanded ? t("common.cancel") : t("stores.edit")}
        </button>
        <GpsCapture storeId={store.id} />
      </div>

      {expanded ? (
        <div className="mt-4 space-y-4 border-t border-line pt-4">
          <StoreMediaPanel
            storeId={store.id}
            storeName={store.storeName}
            initialPrimaryUrl={thumbSrc}
            canEdit
            defaultOpen={focusPhotos}
            size="md"
            onPrimaryUrlChange={onPrimaryUrlChange}
          />
          <ProspectForm
            action={updateFieldStoreAction}
            submitLabel={t("stores.update")}
            values={store}
          />
        </div>
      ) : null}
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
      <input type="hidden" name="returnTo" value="prospects" />
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

function ProspectForm({
  action,
  submitLabel,
  values,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  values?: ProspectStore;
}) {
  const t = useTranslations();
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="returnTo" value="prospects" />
      <input type="hidden" name="status" value="PROSPECT" />
      <label className="block text-start md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-fg">{t("stores.storeName")}</span>
        <input
          name="storeName"
          required
          defaultValue={values?.storeName}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      </label>
      <label className="block text-start">
        <span className="mb-1 block text-sm font-medium text-fg">{t("stores.ownerName")}</span>
        <input
          name="ownerName"
          defaultValue={values?.ownerName ?? ""}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      </label>
      <label className="block text-start">
        <span className="mb-1 block text-sm font-medium text-fg">{t("stores.phone")}</span>
        <input
          name="phone"
          required
          defaultValue={values?.phone}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      </label>
      <label className="block text-start">
        <span className="mb-1 block text-sm font-medium text-fg">{t("stores.email")}</span>
        <input
          name="email"
          type="email"
          defaultValue={values?.email ?? ""}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      </label>
      <label className="block text-start">
        <span className="mb-1 block text-sm font-medium text-fg">{t("stores.address")}</span>
        <input
          name="address"
          defaultValue={values?.address ?? ""}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      </label>
      <label className="block text-start md:col-span-2">
        <span className="mb-1 block text-sm font-medium text-fg">{t("stores.tier")}</span>
        <select
          name="tier"
          defaultValue={values?.tier ?? "SUPERMARKET"}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        >
          {STORE_TIERS.map((tier) => (
            <option key={tier} value={tier}>
              {t(`storeTiers.${tier}`)}
            </option>
          ))}
        </select>
      </label>
      <input type="hidden" name="latitude" defaultValue={values?.latitude ?? ""} />
      <input type="hidden" name="longitude" defaultValue={values?.longitude ?? ""} />
      <button
        type="submit"
        className="btn btn-important text-lg md:col-span-2"
      >
        {submitLabel}
      </button>
      {!values ? (
        <p className="text-sm text-fg-muted text-start md:col-span-2">
          <Link href="/field/customers/new" className="font-medium text-judi-800 underline dark:text-judi-200">
            {t("field.addCustomerTitle")}
          </Link>
        </p>
      ) : null}
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
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: LucideIcon;
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
      {label}
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
