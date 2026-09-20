"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  CircleDollarSign,
  Filter,
  LayoutGrid,
  List,
  Search,
  ShieldAlert,
  ShoppingBag,
  Wallet,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { DataExportButtons } from "@/components/data-export-buttons";
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
import type { CreditStatus } from "@/lib/credit";
import { formatDualMoney, formatMoney } from "@/lib/money";
import {
  addAgingBuckets,
  EMPTY_AGING,
  type AgingBand,
  type AgingBuckets,
} from "@/lib/reports/statement";

const CREDIT_STATUSES: CreditStatus[] = ["ok", "warn", "blocked"];
const AGING_BANDS: AgingBand[] = ["current", "days31to60", "days61to90", "over90"];
const CURRENCIES = ["IQD", "USD"] as const;

const CREDIT_ICONS: Record<CreditStatus, LucideIcon> = {
  ok: BadgeCheck,
  warn: CircleAlert,
  blocked: ShieldAlert,
};

const CHANNEL_ICONS: Record<StoreChannel, LucideIcon> = {
  WHOLESALE: Building2,
  RETAIL: ShoppingBag,
};

const STATUS_ICONS: Record<StoreStatus, LucideIcon> = {
  ACTIVE: BadgeCheck,
  INACTIVE: CircleDashed,
  PROSPECT: CircleDashed,
};

export type DebtListItem = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  tier: StoreTier;
  status: StoreStatus;
  primaryMediaUrl: string | null;
  currentDebt: string;
  currentDebtUsd: string;
  creditLimit: string;
  creditLimitUsd: string;
  remainingIqd: string;
  remainingUsd: string;
  creditStatus: CreditStatus;
  hasDebt: boolean;
  agingIqd: AgingBuckets;
  agingUsd: AgingBuckets;
  agingBand: AgingBand;
};

type ViewMode = "grid" | "list";
type ChannelFilter = "all" | StoreChannel;
type AccountFilter = "all" | StoreStatus;
type BalanceFilter = "all" | "hasDebt" | "cleared" | "overLimit";
type CreditFilter = "all" | CreditStatus;
type AgingFilter = "all" | AgingBand;
type AgingCurrency = (typeof CURRENCIES)[number];

export function DebtsDirectory({
  stores,
  canCollect,
}: {
  stores: DebtListItem[];
  canCollect: boolean;
}) {
  const t = useTranslations();
  const [query, setQuery] = useState("");
  const [balanceFilter, setBalanceFilter] = useState<BalanceFilter>("hasDebt");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("ACTIVE");
  const [creditFilter, setCreditFilter] = useState<CreditFilter>("all");
  const [agingFilter, setAgingFilter] = useState<AgingFilter>("all");
  const [agingCurrency, setAgingCurrency] = useState<AgingCurrency>("IQD");
  const [view, setView] = useState<ViewMode>("list");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((store) => {
      if (balanceFilter === "hasDebt" && !store.hasDebt) return false;
      if (balanceFilter === "cleared" && store.hasDebt) return false;
      if (balanceFilter === "overLimit" && store.creditStatus !== "blocked") {
        return false;
      }
      const channel = storeChannel(store.tier);
      if (channelFilter !== "all" && channel !== channelFilter) return false;
      if (accountFilter !== "all" && store.status !== accountFilter) return false;
      if (creditFilter !== "all" && store.creditStatus !== creditFilter) {
        return false;
      }
      if (agingFilter !== "all" && store.agingBand !== agingFilter) return false;
      if (!q) return true;
      return (
        store.storeName.toLowerCase().includes(q) ||
        store.phone.toLowerCase().includes(q) ||
        (store.email?.toLowerCase().includes(q) ?? false) ||
        (store.ownerName?.toLowerCase().includes(q) ?? false) ||
        (store.address?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [
    accountFilter,
    agingFilter,
    balanceFilter,
    channelFilter,
    creditFilter,
    query,
    stores,
  ]);

  const agingTotals = useMemo(() => {
    return filtered.reduce(
      (acc, store) =>
        addAgingBuckets(acc, agingCurrency === "USD" ? store.agingUsd : store.agingIqd),
      EMPTY_AGING,
    );
  }, [agingCurrency, filtered]);

  function clearFilters() {
    setQuery("");
    setBalanceFilter("all");
    setChannelFilter("all");
    setAccountFilter("all");
    setCreditFilter("all");
    setAgingFilter("all");
  }

  const exportHeaders = [
    t("debts.store"),
    t("stores.phone"),
    t("debts.debtIqd"),
    t("debts.debtUsd"),
    t("debts.credit"),
    t("debts.aging"),
    t("stores.filterChannel"),
    t("stores.filterAccountStatus"),
  ];

  const exportRows = filtered.map((store) => {
    const channel = storeChannel(store.tier);
    return [
      store.storeName,
      store.phone,
      formatMoney(store.currentDebt, "IQD"),
      formatMoney(store.currentDebtUsd, "USD"),
      formatDualMoney(store.creditLimit, store.creditLimitUsd),
      store.agingBand === "none"
        ? t("debts.noAging")
        : t(`debts.bands.${store.agingBand}`),
      t(`stores.channels.${channel}`),
      t(`stores.accountStatuses.${store.status}`),
    ];
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === stores.length
            ? t("debts.listHint", { count: stores.length })
            : t("debts.matchedHint", {
                matched: filtered.length,
                total: stores.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <DataExportButtons
            title={t("debts.title")}
            fileBase="judi-debts"
            headers={exportHeaders}
            rows={exportRows}
          />
          <ViewToggle view={view} onChange={setView} />
        </div>
      </div>

      <section
        aria-labelledby="debts-filters-heading"
        className="surface-panel space-y-3 p-3 sm:p-4"
      >
        <div className="flex items-start gap-2 text-start">
          <Filter
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div className="min-w-0">
            <h2 id="debts-filters-heading" className="text-sm font-semibold text-fg">
              {t("debts.filtersTitle")}
            </h2>
            <p className="text-xs text-fg-muted">{t("debts.filtersHint")}</p>
          </div>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("debts.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("debts.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div role="group" aria-label={t("debts.filterBalance")} className="chip-scroll">
          <FilterChip
            pressed={balanceFilter === "all"}
            onClick={() => setBalanceFilter("all")}
            label={t("debts.allBalances")}
          />
          <FilterChip
            pressed={balanceFilter === "hasDebt"}
            onClick={() => setBalanceFilter("hasDebt")}
            label={t("debts.hasDebt")}
            icon={CircleDollarSign}
          />
          <FilterChip
            pressed={balanceFilter === "cleared"}
            onClick={() => setBalanceFilter("cleared")}
            label={t("debts.cleared")}
            icon={BadgeCheck}
          />
          <FilterChip
            pressed={balanceFilter === "overLimit"}
            onClick={() => setBalanceFilter("overLimit")}
            label={t("debts.overLimitFilter")}
            icon={ShieldAlert}
          />
        </div>

        <div role="group" aria-label={t("debts.filterChannel")} className="chip-scroll">
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
          aria-label={t("debts.filterAccountStatus")}
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

        <div role="group" aria-label={t("debts.filterCredit")} className="chip-scroll">
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

        <div role="group" aria-label={t("debts.filterAging")} className="chip-scroll">
          <FilterChip
            pressed={agingFilter === "all"}
            onClick={() => setAgingFilter("all")}
            label={t("debts.allAging")}
          />
          {AGING_BANDS.map((band) => (
            <FilterChip
              key={band}
              pressed={agingFilter === band}
              onClick={() => setAgingFilter(band)}
              label={t(`debts.bands.${band}`)}
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="debts-aging-heading"
        className="surface-panel space-y-3 p-3 sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="debts-aging-heading" className="text-sm font-semibold text-fg text-start">
            {agingCurrency === "USD" ? t("debts.agingTitleUsd") : t("debts.agingTitle")}
          </h3>
          <div role="group" aria-label={t("invoices.currency")} className="chip-scroll">
            {CURRENCIES.map((currency) => (
              <FilterChip
                key={currency}
                pressed={agingCurrency === currency}
                onClick={() => setAgingCurrency(currency)}
                label={currency}
              />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <AgingMetric
            label={t("debts.bands.current")}
            value={formatMoney(agingTotals.current, agingCurrency)}
          />
          <AgingMetric
            label={t("debts.bands.days31to60")}
            value={formatMoney(agingTotals.days31to60, agingCurrency)}
          />
          <AgingMetric
            label={t("debts.bands.days61to90")}
            value={formatMoney(agingTotals.days61to90, agingCurrency)}
          />
          <AgingMetric
            label={t("debts.bands.over90")}
            value={formatMoney(agingTotals.over90, agingCurrency)}
          />
        </div>
      </section>

      {stores.length === 0 ? (
        <EmptyState title={t("debts.empty")} hint={t("debts.emptyHint")} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("debts.noMatches")}
          hint={t("debts.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("debts.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
          role="list"
        >
          {filtered.map((store) => (
            <li key={store.id}>
              <DebtGridCard canCollect={canCollect} store={store} />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="money-cards-mobile" role="list">
            {filtered.map((store) => (
              <li key={store.id}>
                <DebtListCard canCollect={canCollect} store={store} />
              </li>
            ))}
          </ul>
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface shadow-sm md:block">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("debts.store")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("debts.debtIqd")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("debts.debtUsd")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("debts.credit")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell" scope="col">
                    {t("debts.remainingCredit")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium xl:table-cell" scope="col">
                    {t("debts.aging")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("debts.openStatement")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((store) => (
                  <DebtTableRow
                    key={store.id}
                    canCollect={canCollect}
                    store={store}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
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
      aria-label={t("debts.viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("debts.viewGrid")}
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
        aria-label={t("debts.viewList")}
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-8 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-xl bg-muted text-judi-800 dark:text-judi-200">
        <CircleDollarSign className="size-6" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function AgingMetric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-xl border border-line bg-muted/40 px-3 py-2 text-start">
      <p className="text-xs font-medium text-fg-subtle">{label}</p>
      <p className="mt-1 text-sm font-bold tabular-nums text-fg sm:text-base" dir="ltr">
        {value}
      </p>
    </article>
  );
}

function CreditBadge({ status }: { status: CreditStatus }) {
  const t = useTranslations();
  const Icon = CREDIT_ICONS[status];
  const tone =
    status === "blocked"
      ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
      : status === "warn"
        ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        : "bg-judi-50 text-judi-900 dark:bg-judi-950/40 dark:text-judi-100";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-lg px-1.5 py-0.5 text-[11px] font-medium ${tone}`}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {t(`stores.creditStatus.${status}`)}
    </span>
  );
}

function AgingBadge({ band }: { band: AgingBand }) {
  const t = useTranslations();
  if (band === "none") {
    return (
      <span className="inline-flex items-center rounded-lg bg-muted px-1.5 py-0.5 text-[11px] font-medium text-fg-muted">
        {t("debts.noAging")}
      </span>
    );
  }
  const tone =
    band === "over90"
      ? "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200"
      : band === "days61to90"
        ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
        : "bg-muted text-fg-muted";
  return (
    <span className={`inline-flex items-center rounded-lg px-1.5 py-0.5 text-[11px] font-medium ${tone}`}>
      {t(`debts.bands.${band}`)}
    </span>
  );
}

function DebtMeta({ store }: { store: DebtListItem }) {
  const t = useTranslations();
  const channel = storeChannel(store.tier);
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span>{t(`stores.channels.${channel}`)}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span>{t(`storeTiers.${store.tier}`)}</span>
      {store.ownerName ? (
        <>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="truncate">{store.ownerName}</span>
        </>
      ) : null}
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

function RemainingCredit({ store }: { store: DebtListItem }) {
  const t = useTranslations();
  return (
    <span className="block text-xs text-fg-muted">
      <span className="me-1">{t("debts.remainingCredit")}:</span>
      <span className="font-medium tabular-nums text-fg" dir="ltr">
        {formatDualMoney(store.remainingIqd, store.remainingUsd)}
      </span>
    </span>
  );
}

function DebtGridCard({
  store,
  canCollect,
}: {
  store: DebtListItem;
  canCollect: boolean;
}) {
  const t = useTranslations();
  return (
    <article className="flex h-full flex-col gap-3 rounded-2xl border border-line bg-surface p-3 shadow-sm">
      <Link
        href={`/dashboard/stores/${store.id}/statement`}
        className="flex min-h-touch items-start gap-3 text-start"
      >
        <Thumb kind="store" size="md" src={store.primaryMediaUrl} alt={store.storeName} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">
            {store.storeName}
          </span>
          <DebtMeta store={store} />
          <span
            className="mt-2 block text-base font-bold tabular-nums text-fg"
            dir="ltr"
          >
            {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
          </span>
          <span className="mt-1 block">
            <RemainingCredit store={store} />
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <CreditBadge status={store.creditStatus} />
            <AgingBadge band={store.agingBand} />
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />
        <span className="sr-only">{t("debts.openStatement")}</span>
      </Link>
      {canCollect ? <RowActions storeId={store.id} /> : null}
    </article>
  );
}

function DebtListCard({
  store,
  canCollect,
}: {
  store: DebtListItem;
  canCollect: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 shadow-sm">
      <Link
        href={`/dashboard/stores/${store.id}/statement`}
        className="flex min-h-touch items-center gap-3"
      >
        <Thumb kind="store" size="sm" src={store.primaryMediaUrl} alt={store.storeName} />
        <span className="min-w-0 flex-1 text-start">
          <span className="flex items-start justify-between gap-2">
            <span className="truncate text-sm font-semibold text-fg">
              {store.storeName}
            </span>
            <span className="shrink-0 text-base font-bold tabular-nums text-fg" dir="ltr">
              {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
            </span>
          </span>
          <DebtMeta store={store} />
          <span className="mt-1 block">
            <RemainingCredit store={store} />
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <CreditBadge status={store.creditStatus} />
            <AgingBadge band={store.agingBand} />
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-fg-subtle rtl:rotate-180" aria-hidden />
        <span className="sr-only">{t("debts.openStatement")}</span>
      </Link>
      {canCollect ? (
        <div className="mt-2">
          <RowActions storeId={store.id} />
        </div>
      ) : null}
    </div>
  );
}

function DebtTableRow({
  store,
  canCollect,
}: {
  store: DebtListItem;
  canCollect: boolean;
}) {
  const t = useTranslations();
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        <Link
          href={`/dashboard/stores/${store.id}/statement`}
          className="flex min-h-touch items-center gap-2.5 font-medium text-fg hover:text-judi-800 dark:hover:text-judi-200"
        >
          <Thumb
            kind="store"
            size="xs"
            src={store.primaryMediaUrl}
            alt=""
            desktopOnly
          />
          <span className="min-w-0">
            <span className="block truncate">{store.storeName}</span>
            <span className="block truncate text-xs text-fg-subtle">
              {store.ownerName || store.phone}
            </span>
          </span>
        </Link>
      </td>
      <td className="px-4 py-2 font-semibold tabular-nums text-fg whitespace-nowrap" dir="ltr">
        {formatMoney(store.currentDebt, "IQD")}
      </td>
      <td className="px-4 py-2 font-semibold tabular-nums text-fg whitespace-nowrap" dir="ltr">
        {formatMoney(store.currentDebtUsd, "USD")}
      </td>
      <td className="hidden px-4 py-2 lg:table-cell">
        <div className="flex min-h-touch items-center">
          <CreditBadge status={store.creditStatus} />
        </div>
      </td>
      <td className="hidden px-4 py-2 xl:table-cell">
        <div className="flex min-h-touch items-center">
          <span className="tabular-nums text-fg-muted" dir="ltr">
            {formatDualMoney(store.remainingIqd, store.remainingUsd)}
          </span>
        </div>
      </td>
      <td className="hidden px-4 py-2 xl:table-cell">
        <div className="flex min-h-touch items-center">
          <AgingBadge band={store.agingBand} />
        </div>
      </td>
      <td className="px-4 py-2">
        <div className="flex items-center justify-end gap-1">
          {canCollect ? (
            <Link
              href={`/dashboard/collections?storeId=${store.id}`}
              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
              aria-label={t("debts.recordPayment")}
            >
              <Wallet className="size-4" aria-hidden />
            </Link>
          ) : null}
          <Link
            href={`/dashboard/stores/${store.id}/statement`}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
            aria-label={t("debts.openStatement")}
          >
            <ChevronRight className="size-5 rtl:rotate-180" aria-hidden />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function RowActions({ storeId }: { storeId: string }) {
  const t = useTranslations();
  return (
    <Link
      href={`/dashboard/collections?storeId=${storeId}`}
      className="btn btn-important w-full"
    >
      <Wallet className="size-4 shrink-0" aria-hidden />
      {t("debts.recordPayment")}
    </Link>
  );
}
