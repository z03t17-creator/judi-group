"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  CircleDashed,
  CircleDollarSign,
  FileText,
  Filter,
  LayoutGrid,
  List,
  Receipt,
  Search,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/thumb";
import { Link } from "@/i18n/navigation";
import {
  STORE_CHANNELS,
  STORE_STATUSES,
  storeChannel,
  type StoreChannel,
  type StoreStatus,
  type StoreTier,
} from "@/lib/constants";

const CHANNEL_ICONS: Record<StoreChannel, LucideIcon> = {
  WHOLESALE: Building2,
  RETAIL: ShoppingBag,
};

const STATUS_ICONS: Record<StoreStatus, LucideIcon> = {
  ACTIVE: BadgeCheck,
  INACTIVE: CircleDashed,
  PROSPECT: CircleDashed,
};

export type ReportsHubStore = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  tier: StoreTier;
  status: StoreStatus;
  primaryMediaUrl: string | null;
};

export type ReportsHubVan = {
  id: string;
  name: string;
  licensePlate: string | null;
  driverName: string | null;
  driverMediaUrl: string | null;
};

type ViewMode = "grid" | "list";
type ChannelFilter = "all" | StoreChannel;
type AccountFilter = "all" | StoreStatus;
type VanFilter = "all" | "withDriver" | "noDriver";
type HubSection = "statements" | "vans";

export function ReportsHub({
  stores,
  vans,
}: {
  stores: ReportsHubStore[];
  vans: ReportsHubVan[];
}) {
  const t = useTranslations();
  const [section, setSection] = useState<HubSection>("statements");
  const [storeQuery, setStoreQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("ACTIVE");
  const [storeView, setStoreView] = useState<ViewMode>("grid");
  const [vanQuery, setVanQuery] = useState("");
  const [vanFilter, setVanFilter] = useState<VanFilter>("all");
  const [vanView, setVanView] = useState<ViewMode>("grid");

  const filteredStores = useMemo(() => {
    const q = storeQuery.trim().toLowerCase();
    return stores.filter((store) => {
      const channel = storeChannel(store.tier);
      if (channelFilter !== "all" && channel !== channelFilter) return false;
      if (accountFilter !== "all" && store.status !== accountFilter) return false;
      if (!q) return true;
      return (
        store.storeName.toLowerCase().includes(q) ||
        store.phone.toLowerCase().includes(q) ||
        (store.email?.toLowerCase().includes(q) ?? false) ||
        (store.ownerName?.toLowerCase().includes(q) ?? false) ||
        (store.address?.toLowerCase().includes(q) ?? false) ||
        t(`storeTiers.${store.tier}`).toLowerCase().includes(q) ||
        t(`stores.channels.${channel}`).toLowerCase().includes(q)
      );
    });
  }, [accountFilter, channelFilter, storeQuery, stores, t]);

  const filteredVans = useMemo(() => {
    const q = vanQuery.trim().toLowerCase();
    return vans.filter((van) => {
      if (vanFilter === "withDriver" && !van.driverName) return false;
      if (vanFilter === "noDriver" && van.driverName) return false;
      if (!q) return true;
      return (
        van.name.toLowerCase().includes(q) ||
        (van.licensePlate?.toLowerCase().includes(q) ?? false) ||
        (van.driverName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [vanFilter, vanQuery, vans]);

  function clearStoreFilters() {
    setStoreQuery("");
    setChannelFilter("all");
    setAccountFilter("all");
  }

  function clearVanFilters() {
    setVanQuery("");
    setVanFilter("all");
  }

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="reports-hub-links-heading"
        className="space-y-3"
      >
        <div className="text-start">
          <h2
            id="reports-hub-links-heading"
            className="text-lg font-semibold text-fg"
          >
            {t("reports.hubTitle")}
          </h2>
          <p className="text-sm text-fg-muted">{t("reports.hubHint")}</p>
        </div>
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
          role="list"
        >
          <li>
            <HubTile
              pressed={section === "statements"}
              onClick={() => setSection("statements")}
              icon={FileText}
              title={t("reports.customerStatements")}
              hint={t("reports.customerStatementsHint")}
              count={stores.length}
            />
          </li>
          <li>
            <HubTile
              pressed={section === "vans"}
              onClick={() => setSection("vans")}
              icon={Truck}
              title={t("reports.vanReconciliation")}
              hint={t("reports.vanReconciliationHint")}
              count={vans.length}
            />
          </li>
          <li>
            <HubLinkTile
              href="/dashboard/debts"
              icon={CircleDollarSign}
              title={t("nav.debts")}
              hint={t("reports.debtsLinkHint")}
            />
          </li>
          <li>
            <HubLinkTile
              href="/dashboard/collections"
              icon={Wallet}
              title={t("nav.collections")}
              hint={t("reports.collectionsLinkHint")}
            />
          </li>
          <li>
            <HubLinkTile
              href="/dashboard/expenses"
              icon={Receipt}
              title={t("nav.expenses")}
              hint={t("reports.expensesLinkHint")}
            />
          </li>
        </ul>
      </section>

      {section === "statements" ? (
        <section
          aria-labelledby="reports-statements-heading"
          className="space-y-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 text-start">
              <h2
                id="reports-statements-heading"
                className="text-lg font-semibold text-fg"
              >
                {t("reports.customerStatements")}
              </h2>
              <p className="text-sm text-fg-muted">
                {filteredStores.length === stores.length
                  ? t("reports.storesHint", { count: stores.length })
                  : t("reports.storesMatched", {
                      matched: filteredStores.length,
                      total: stores.length,
                    })}
              </p>
            </div>
            <ViewToggle
              view={storeView}
              onChange={setStoreView}
              label={t("reports.viewMode")}
              gridLabel={t("reports.viewGrid")}
              listLabel={t("reports.viewList")}
            />
          </div>

          <section
            aria-labelledby="reports-store-filters-heading"
            className="surface-panel space-y-3 p-3 sm:p-4"
          >
            <div className="flex items-start gap-2 text-start">
              <Filter
                className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <div className="min-w-0">
                <h3
                  id="reports-store-filters-heading"
                  className="text-sm font-semibold text-fg"
                >
                  {t("reports.storeFiltersTitle")}
                </h3>
                <p className="text-xs text-fg-muted">
                  {t("reports.storeFiltersHint")}
                </p>
              </div>
            </div>

            <label className="relative block text-start">
              <span className="sr-only">{t("reports.searchStores")}</span>
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <input
                type="search"
                value={storeQuery}
                onChange={(event) => setStoreQuery(event.target.value)}
                placeholder={t("reports.searchStoresPlaceholder")}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
              />
            </label>

            <div
              role="group"
              aria-label={t("stores.filterChannel")}
              className="chip-scroll"
            >
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
              aria-label={t("stores.filterAccountStatus")}
              className="chip-scroll"
            >
              <FilterChip
                pressed={accountFilter === "all"}
                onClick={() => setAccountFilter("all")}
                label={t("stores.allAccountStatuses")}
              />
              {STORE_STATUSES.map((status) => {
                const Icon = STATUS_ICONS[status];
                return (
                  <FilterChip
                    key={status}
                    pressed={accountFilter === status}
                    onClick={() => setAccountFilter(status)}
                    label={t(`stores.accountStatuses.${status}`)}
                    icon={Icon}
                  />
                );
              })}
            </div>
          </section>

          {stores.length === 0 ? (
            <EmptyState
              icon={Store}
              title={t("reports.noStores")}
              hint={t("reports.noStoresHint")}
            />
          ) : filteredStores.length === 0 ? (
            <EmptyState
              icon={Store}
              title={t("reports.noStoreMatches")}
              hint={t("reports.noStoreMatchesHint")}
              action={
                <button
                  type="button"
                  onClick={clearStoreFilters}
                  className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
                >
                  <X className="size-4" aria-hidden />
                  {t("reports.clearFilters")}
                </button>
              }
            />
          ) : storeView === "grid" ? (
            <ul
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
            >
              {filteredStores.map((store) => (
                <li key={store.id}>
                  <StoreGridCard store={store} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2" role="list">
              {filteredStores.map((store) => (
                <li key={store.id}>
                  <StoreListCard store={store} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-labelledby="reports-vans-heading" className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 text-start">
              <h2
                id="reports-vans-heading"
                className="text-lg font-semibold text-fg"
              >
                {t("reports.vanReconciliation")}
              </h2>
              <p className="text-sm text-fg-muted">
                {filteredVans.length === vans.length
                  ? t("reports.vansHint", { count: vans.length })
                  : t("reports.vansMatched", {
                      matched: filteredVans.length,
                      total: vans.length,
                    })}
              </p>
            </div>
            <ViewToggle
              view={vanView}
              onChange={setVanView}
              label={t("reports.viewMode")}
              gridLabel={t("reports.viewGrid")}
              listLabel={t("reports.viewList")}
            />
          </div>

          <section
            aria-labelledby="reports-van-filters-heading"
            className="surface-panel space-y-3 p-3 sm:p-4"
          >
            <div className="flex items-start gap-2 text-start">
              <Filter
                className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <div className="min-w-0">
                <h3
                  id="reports-van-filters-heading"
                  className="text-sm font-semibold text-fg"
                >
                  {t("reports.vanFiltersTitle")}
                </h3>
                <p className="text-xs text-fg-muted">
                  {t("reports.vanFiltersHint")}
                </p>
              </div>
            </div>

            <label className="relative block text-start">
              <span className="sr-only">{t("reports.searchVans")}</span>
              <Search
                className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <input
                type="search"
                value={vanQuery}
                onChange={(event) => setVanQuery(event.target.value)}
                placeholder={t("reports.searchVansPlaceholder")}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
              />
            </label>

            <div
              role="group"
              aria-label={t("reports.filterDriver")}
              className="chip-scroll"
            >
              <FilterChip
                pressed={vanFilter === "all"}
                onClick={() => setVanFilter("all")}
                label={t("reports.allVans")}
              />
              <FilterChip
                pressed={vanFilter === "withDriver"}
                onClick={() => setVanFilter("withDriver")}
                label={t("reports.withDriver")}
                icon={UserRound}
              />
              <FilterChip
                pressed={vanFilter === "noDriver"}
                onClick={() => setVanFilter("noDriver")}
                label={t("reports.noDriverFilter")}
                icon={CircleDashed}
              />
            </div>
          </section>

          {vans.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={t("reports.noVans")}
              hint={t("reports.noVansHint")}
            />
          ) : filteredVans.length === 0 ? (
            <EmptyState
              icon={Truck}
              title={t("reports.noVanMatches")}
              hint={t("reports.noVanMatchesHint")}
              action={
                <button
                  type="button"
                  onClick={clearVanFilters}
                  className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
                >
                  <X className="size-4" aria-hidden />
                  {t("reports.clearFilters")}
                </button>
              }
            />
          ) : vanView === "grid" ? (
            <ul
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
              role="list"
            >
              {filteredVans.map((van) => (
                <li key={van.id}>
                  <VanGridCard van={van} />
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2" role="list">
              {filteredVans.map((van) => (
                <li key={van.id}>
                  <VanListCard van={van} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function HubTile({
  pressed,
  onClick,
  icon: Icon,
  title,
  hint,
  count,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: LucideIcon;
  title: string;
  hint: string;
  count: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`flex min-h-touch w-full items-start gap-3 rounded-2xl border p-3 text-start shadow-sm transition-colors sm:p-4 ${
        pressed
          ? "border-judi-500 bg-judi-50 dark:border-judi-400 dark:bg-judi-950/40"
          : "border-line bg-surface hover:border-judi-400 hover:bg-muted"
      }`}
    >
      <span
        className={`inline-flex size-11 shrink-0 items-center justify-center rounded-xl ${
          pressed
            ? "seg-on"
            : "bg-judi-100 text-judi-800 dark:bg-judi-950/50 dark:text-judi-200"
        }`}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <span
            className="shrink-0 rounded-lg bg-muted px-1.5 py-0.5 text-xs font-medium tabular-nums text-fg-muted"
            dir="ltr"
          >
            {count}
          </span>
        </span>
        <span className="mt-0.5 block text-xs text-fg-muted">{hint}</span>
      </span>
    </button>
  );
}

function HubLinkTile({
  href,
  icon: Icon,
  title,
  hint,
}: {
  href: "/dashboard/debts" | "/dashboard/collections" | "/dashboard/expenses";
  icon: LucideIcon;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex min-h-touch w-full items-start gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-sm transition-colors hover:border-judi-400 hover:bg-muted sm:p-4"
    >
      <span className="icon-badge icon-badge-lg tone-sky">
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="block text-sm font-semibold text-fg">{title}</span>
          <ChevronRight
            className="size-5 shrink-0 text-fg-subtle rtl:rotate-180"
            aria-hidden
          />
        </span>
        <span className="mt-0.5 block text-xs text-fg-muted">{hint}</span>
      </span>
    </Link>
  );
}

function ViewToggle({
  view,
  onChange,
  label,
  gridLabel,
  listLabel,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
  label: string;
  gridLabel: string;
  listLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={gridLabel}
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
        aria-label={listLabel}
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
  icon: Icon,
  title,
  hint,
  action,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-8 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-muted text-judi-800 dark:text-judi-200">
        <Icon className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function StoreMeta({ store }: { store: ReportsHubStore }) {
  const t = useTranslations();
  const channel = storeChannel(store.tier);
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span>{t(`stores.channels.${channel}`)}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span>{t(`storeTiers.${store.tier}`)}</span>
      {store.phone ? (
        <>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="tabular-nums" dir="ltr">
            {store.phone}
          </span>
        </>
      ) : null}
    </span>
  );
}

function StoreGridCard({ store }: { store: ReportsHubStore }) {
  const t = useTranslations();
  return (
    <Link
      href={`/dashboard/stores/${store.id}/statement`}
      className="flex h-full min-h-touch flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm transition-colors hover:border-judi-400 hover:bg-muted"
    >
      <span className="flex items-start gap-3 text-start">
        <Thumb
          kind="store"
          size="md"
          src={store.primaryMediaUrl}
          alt={store.storeName}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">
            {store.storeName}
          </span>
          <StoreMeta store={store} />
          {store.ownerName ? (
            <span className="mt-1 block truncate text-xs text-fg-muted">
              {store.ownerName}
            </span>
          ) : null}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-fg-subtle rtl:rotate-180"
          aria-hidden
        />
      </span>
      <span className="inline-flex min-h-touch items-center justify-center rounded-xl border border-judi-300 bg-judi-50 px-3 text-sm font-medium text-judi-800 dark:border-judi-700 dark:bg-judi-950/40 dark:text-judi-100">
        {t("reports.openStatement")}
      </span>
    </Link>
  );
}

function StoreListCard({ store }: { store: ReportsHubStore }) {
  const t = useTranslations();
  return (
    <Link
      href={`/dashboard/stores/${store.id}/statement`}
      className="flex min-h-touch items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-sm transition-colors hover:border-judi-400 hover:bg-muted"
    >
      <Thumb
        kind="store"
        size="sm"
        src={store.primaryMediaUrl}
        alt={store.storeName}
      />
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-sm font-semibold text-fg">
          {store.storeName}
        </span>
        <StoreMeta store={store} />
      </span>
      <span className="hidden shrink-0 rounded-lg border border-judi-300 px-3 py-1.5 text-xs font-medium text-judi-800 sm:inline-flex dark:border-judi-700 dark:text-judi-100">
        {t("reports.openStatement")}
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-fg-subtle rtl:rotate-180"
        aria-hidden
      />
      <span className="sr-only">{t("reports.openStatement")}</span>
    </Link>
  );
}

function VanMeta({ van }: { van: ReportsHubVan }) {
  const t = useTranslations();
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span className="tabular-nums" dir="ltr">
        {van.licensePlate ?? "—"}
      </span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span>
        {van.driverName
          ? t("reports.driver", { name: van.driverName })
          : t("reports.noDriver")}
      </span>
    </span>
  );
}

function VanGridCard({ van }: { van: ReportsHubVan }) {
  const t = useTranslations();
  return (
    <Link
      href={`/dashboard/reports/van/${van.id}`}
      className="flex h-full min-h-touch flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm transition-colors hover:border-judi-400 hover:bg-muted"
    >
      <span className="flex items-start gap-3 text-start">
        <Thumb kind="warehouse" size="md" icon={Truck} alt={van.name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">
            {van.name}
          </span>
          <VanMeta van={van} />
          {van.driverName ? (
            <span className="mt-2 inline-flex items-center gap-2">
              <Thumb
                kind="person"
                size="xs"
                src={van.driverMediaUrl}
                alt={van.driverName}
              />
              <span className="truncate text-xs text-fg-muted">
                {van.driverName}
              </span>
            </span>
          ) : null}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-fg-subtle rtl:rotate-180"
          aria-hidden
        />
      </span>
      <span className="inline-flex min-h-touch items-center justify-center rounded-xl border border-judi-300 bg-judi-50 px-3 text-sm font-medium text-judi-800 dark:border-judi-700 dark:bg-judi-950/40 dark:text-judi-100">
        {t("reports.openRecon")}
      </span>
    </Link>
  );
}

function VanListCard({ van }: { van: ReportsHubVan }) {
  const t = useTranslations();
  return (
    <Link
      href={`/dashboard/reports/van/${van.id}`}
      className="flex min-h-touch items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-3 shadow-sm transition-colors hover:border-judi-400 hover:bg-muted"
    >
      <Thumb kind="warehouse" size="sm" icon={Truck} alt={van.name} />
      <span className="min-w-0 flex-1 text-start">
        <span className="block truncate text-sm font-semibold text-fg">
          {van.name}
        </span>
        <VanMeta van={van} />
      </span>
      {van.driverName ? (
        <span className="hidden sm:inline-flex">
          <Thumb
            kind="person"
            size="xs"
            src={van.driverMediaUrl}
            alt={van.driverName}
          />
        </span>
      ) : null}
      <span className="hidden shrink-0 rounded-lg border border-judi-300 px-3 py-1.5 text-xs font-medium text-judi-800 sm:inline-flex dark:border-judi-700 dark:text-judi-100">
        {t("reports.openRecon")}
      </span>
      <ChevronRight
        className="size-5 shrink-0 text-fg-subtle rtl:rotate-180"
        aria-hidden
      />
      <span className="sr-only">{t("reports.openRecon")}</span>
    </Link>
  );
}
