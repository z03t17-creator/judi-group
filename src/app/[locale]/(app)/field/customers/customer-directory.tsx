"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Boxes,
  Building2,
  CircleAlert,
  FileText,
  LayoutGrid,
  List,
  MapPin,
  Navigation,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Store,
  UserPlus,
  Wallet,
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
import { creditStatus, remainingCredit, type CreditStatus } from "@/lib/credit";
import { formatDualMoney, formatMoney } from "@/lib/money";
import { sortStoresByDistance } from "@/lib/geo";
import {
  captureStoreGpsAction,
  updateFieldStoreAction,
} from "./actions";

export type FieldStore = {
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
  creditLimit: string;
  currentDebt: string;
  creditLimitUsd: string;
  currentDebtUsd: string;
  primaryMediaUrl: string | null;
};

type ViewMode = "grid" | "list";
type ChannelFilter = "all" | StoreChannel;
type CreditFilter = "all" | CreditStatus;

const CREDIT_STATUSES: CreditStatus[] = ["ok", "warn", "blocked"];

const CREDIT_ICONS: Record<CreditStatus, LucideIcon> = {
  ok: BadgeCheck,
  warn: CircleAlert,
  blocked: ShieldAlert,
};

const CHANNEL_ICONS: Record<StoreChannel, LucideIcon> = {
  WHOLESALE: Building2,
  RETAIL: ShoppingBag,
};

function creditTone(status: CreditStatus) {
  if (status === "blocked") {
    return "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }
  if (status === "warn") {
    return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
  }
  return "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200";
}

export function CustomerDirectory({
  stores,
  focusId = null,
}: {
  stores: FieldStore[];
  focusId?: string | null;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [creditFilter, setCreditFilter] = useState<CreditFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(focusId);
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
    const el = document.getElementById(`store-${focusId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [focusId]);

  const enriched = useMemo(
    () =>
      stores.map((store) => {
        const status = creditStatus(store.creditLimit, store.currentDebt);
        return {
          ...store,
          channel: storeChannel(store.tier),
          creditStatus: status,
          remainingIqd: remainingCredit(store.creditLimit, store.currentDebt).toString(),
          remainingUsd: remainingCredit(store.creditLimitUsd, store.currentDebtUsd).toString(),
        };
      }),
    [stores],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = enriched.filter((store) => {
      if (channelFilter !== "all" && store.channel !== channelFilter) return false;
      if (creditFilter !== "all" && store.creditStatus !== creditFilter) return false;
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
  }, [channelFilter, creditFilter, enriched, origin, query]);

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

  function thumbUrl(store: FieldStore) {
    return thumbByStoreId[store.id] ?? store.primaryMediaUrl;
  }

  function clearFilters() {
    setQuery("");
    setChannelFilter("all");
    setCreditFilter("all");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === stores.length
            ? t("stores.listHint", { count: stores.length })
            : t("stores.matchedHint", {
                matched: filtered.length,
                total: stores.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <Link
            href="/field/customers/new"
            className="btn btn-important"
          >
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t("field.addCustomer")}
          </Link>
        </div>
      </div>

      <section
        aria-labelledby="field-customers-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="field-customers-filters-heading" className="sr-only">
          {t("field.customersFiltersTitle")}
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

        <div
          role="group"
          aria-label={t("stores.filterCreditStatus")}
          className="chip-scroll"
        >
          <FilterChip
            pressed={creditFilter === "all"}
            onClick={() => setCreditFilter("all")}
            label={t("stores.allCreditStatuses")}
          />
          {CREDIT_STATUSES.map((status) => {
            const Icon = CREDIT_ICONS[status];
            return (
              <FilterChip
                key={status}
                pressed={creditFilter === status}
                onClick={() => setCreditFilter(status)}
                label={t(`stores.creditStatus.${status}`)}
                icon={Icon}
              />
            );
          })}
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
          {query || channelFilter !== "all" || creditFilter !== "all" ? (
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
          title={t("stores.empty")}
          hint={t("field.customersEmptyHint")}
          action={
            <Link
              href="/field/customers/new"
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
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
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
          role="list"
        >
          {filtered.map((store) => {
            const dist =
              origin && store.latitude != null && store.longitude != null
                ? sortStoresByDistance([store], origin)[0]?.distanceKm
                : null;
            return (
              <li key={store.id}>
                <CustomerCard
                  store={store}
                  thumbSrc={thumbUrl(store)}
                  distanceKm={dist}
                  expanded={editingId === store.id}
                  focusPhotos={focusId === store.id}
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
      ) : (
        <ul className="space-y-3" role="list">
          {filtered.map((store) => {
            const dist =
              origin && store.latitude != null && store.longitude != null
                ? sortStoresByDistance([store], origin)[0]?.distanceKm
                : null;
            return (
              <li key={store.id}>
                <CustomerCard
                  store={store}
                  thumbSrc={thumbUrl(store)}
                  distanceKm={dist}
                  expanded={editingId === store.id}
                  focusPhotos={focusId === store.id}
                  listLayout
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
    </div>
  );
}

function CustomerCard({
  store,
  thumbSrc,
  distanceKm,
  expanded,
  focusPhotos,
  listLayout = false,
  onToggleExpand,
  onPrimaryUrlChange,
}: {
  store: FieldStore & {
    channel: StoreChannel;
    creditStatus: CreditStatus;
    remainingIqd: string;
    remainingUsd: string;
  };
  thumbSrc: string | null;
  distanceKm: number | null | undefined;
  expanded: boolean;
  focusPhotos: boolean;
  listLayout?: boolean;
  onToggleExpand: () => void;
  onPrimaryUrlChange: (url: string | null) => void;
}) {
  const t = useTranslations();
  const tier = store.tier as StoreTier;

  return (
    <article
      id={`store-${store.id}`}
      className={`rounded-2xl border border-line bg-surface p-4 shadow-sm ${
        listLayout ? "sm:p-5" : ""
      }`}
    >
      <div className={`flex gap-3 ${listLayout ? "sm:items-start" : "flex-col"}`}>
        <div className={`flex min-w-0 flex-1 items-start gap-3 ${listLayout ? "" : ""}`}>
          <Thumb kind="store" size={listLayout ? "md" : "md"} src={thumbSrc} alt="" />
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
                className={`inline-flex min-h-touch items-center rounded-xl px-3 text-sm font-semibold ${creditTone(
                  store.creditStatus,
                )}`}
              >
                {t(`stores.status.${store.creditStatus}`)}
              </span>
            </div>
            <p className="mt-2 text-sm text-fg">
              {t("stores.debtShort")}:{" "}
              <span className="font-semibold tabular-nums">
                {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
              </span>
            </p>
            <p className="text-sm text-fg-muted">
              {t("stores.remaining")}:{" "}
              <span className="tabular-nums">
                {formatMoney(store.remainingIqd, "IQD")} ·{" "}
                {formatMoney(store.remainingUsd, "USD")}
              </span>
            </p>
          </div>
        </div>
      </div>

      <div
        role="group"
        aria-label={t("field.customerActions")}
        className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"
      >
        <ActionLink
          href={`/field/invoice?storeId=${store.id}`}
          icon={ShoppingCart}
          label={t("field.actionOrder")}
        />
        <ActionLink
          href={`/field/collection?storeId=${store.id}`}
          icon={Wallet}
          label={t("field.actionPay")}
        />
        <ActionLink
          href={`/field/return?storeId=${store.id}`}
          icon={RotateCcw}
          label={t("field.actionReturn")}
        />
        <ActionLink
          href={`/field/customers/${store.id}/statement`}
          icon={FileText}
          label={t("field.actionStatement")}
        />
        <ActionLink
          href={`/field/customers/${store.id}/stock`}
          icon={Boxes}
          label={t("field.actionStoreStock")}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
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
          <ContactForm
            action={updateFieldStoreAction}
            submitLabel={t("stores.update")}
            values={store}
          />
        </div>
      ) : null}
    </article>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-touch flex-col items-center justify-center gap-1 rounded-xl border border-line bg-muted/40 px-2 py-2 text-center text-xs font-semibold text-fg hover:border-judi-500 hover:bg-accent-soft/50 sm:text-sm"
    >
      <Icon className="size-5 text-judi-700 dark:text-judi-300" aria-hidden />
      {label}
    </Link>
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
      <input type="hidden" name="returnTo" value="customers" />
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

function ContactForm({
  action,
  submitLabel,
  values,
}: {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  values?: FieldStore;
}) {
  const t = useTranslations();
  return (
    <form action={action} className="grid gap-3 md:grid-cols-2">
      {values ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="returnTo" value="customers" />
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
      <input type="hidden" name="status" value={values?.status ?? "ACTIVE"} />
      <input type="hidden" name="latitude" defaultValue={values?.latitude ?? ""} />
      <input type="hidden" name="longitude" defaultValue={values?.longitude ?? ""} />
      <button
        type="submit"
        className="btn btn-important text-lg md:col-span-2"
      >
        {submitLabel}
      </button>
    </form>
  );
}
