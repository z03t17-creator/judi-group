"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Building2,
  Boxes,
  ChevronRight,
  CircleAlert,
  CircleDashed,
  FileText,
  LayoutGrid,
  List,
  Mail,
  MapPin,
  Phone,
  Plus,
  Save,
  Search,
  ShieldAlert,
  ShoppingBag,
  Store,
  Trash2,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AmountInput } from "@/components/amount-input";
import { StoreMediaPanel } from "@/components/store-media-panel";
import { StoreLocationFields, StoreLocationMap } from "@/components/store-location-map";
import { Thumb } from "@/components/thumb";
import {
  STORE_CHANNELS,
  STORE_STATUSES,
  STORE_TIERS,
  storeChannel,
  type StoreChannel,
  type StoreStatus,
  type StoreTier,
} from "@/lib/constants";
import type { CreditStatus } from "@/lib/credit";
import { formatDualMoney, formatMoney, formatNumber } from "@/lib/money";
import {
  createStoreAction,
  deleteStoreAction,
  updateStoreAction,
} from "./actions";

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

export type StoresDirectoryItem = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  tier: StoreTier;
  status: StoreStatus;
  creditLimit: string;
  creditLimitUsd: string;
  currentDebt: string;
  currentDebtUsd: string;
  remainingIqd: string;
  remainingUsd: string;
  creditStatus: CreditStatus;
  latitude: string;
  longitude: string;
  primaryMediaUrl: string | null;
};

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; storeId: string };

type ViewMode = "grid" | "list";
type ChannelFilter = "all" | StoreChannel;
type AccountFilter = "all" | StoreStatus;
type CreditFilter = "all" | CreditStatus;

export function StoresDirectory({
  stores,
  canManage,
  focusStoreId = null,
}: {
  stores: StoresDirectoryItem[];
  canManage: boolean;
  focusStoreId?: string | null;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>(() =>
    focusStoreId ? { mode: "edit", storeId: focusStoreId } : { mode: "closed" },
  );
  const [thumbByStoreId, setThumbByStoreId] = useState<
    Record<string, string | null>
  >(() =>
    Object.fromEntries(stores.map((store) => [store.id, store.primaryMediaUrl])),
  );
  const [focusPhotosStoreId, setFocusPhotosStoreId] = useState<string | null>(
    focusStoreId,
  );
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [accountFilter, setAccountFilter] = useState<AccountFilter>("all");
  const [creditFilter, setCreditFilter] = useState<CreditFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const titleId = useId();

  const editingStore =
    panel.mode === "edit"
      ? stores.find((store) => store.id === panel.storeId) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stores.filter((store) => {
      const channel = storeChannel(store.tier);
      if (channelFilter !== "all" && channel !== channelFilter) return false;
      if (accountFilter !== "all" && store.status !== accountFilter) return false;
      if (creditFilter !== "all" && store.creditStatus !== creditFilter) {
        return false;
      }
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
  }, [accountFilter, channelFilter, creditFilter, query, stores, t]);

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
    if (!focusStoreId) return;
    setPanel({ mode: "edit", storeId: focusStoreId });
    setFocusPhotosStoreId(focusStoreId);
  }, [focusStoreId]);

  useEffect(() => {
    if (panel.mode === "closed") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.mode]);

  useEffect(() => {
    if (panel.mode === "edit" && !editingStore) {
      setPanel({ mode: "closed" });
    }
  }, [editingStore, panel.mode]);

  function openEdit(storeId: string) {
    setFocusPhotosStoreId(null);
    setPanel({ mode: "edit", storeId });
  }

  function thumbUrl(store: StoresDirectoryItem) {
    return thumbByStoreId[store.id] ?? store.primaryMediaUrl;
  }

  return (
    <div className="space-y-3">
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
          {canManage ? (
            <button
              type="button"
              onClick={() => setPanel({ mode: "create" })}
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("stores.create")}
            </button>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="stores-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="stores-filters-heading" className="sr-only">
          {t("stores.filtersTitle")}
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
          {STORE_STATUSES.map((status) => (
            <FilterChip
              key={status}
              pressed={accountFilter === status}
              onClick={() => setAccountFilter(status)}
              label={t(`stores.accountStatuses.${status}`)}
              icon={
                status === "ACTIVE"
                  ? BadgeCheck
                  : status === "PROSPECT"
                    ? UserRound
                    : CircleDashed
              }
            />
          ))}
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
      </section>

      {stores.length === 0 ? (
        <EmptyState
          title={t("stores.empty")}
          hint={canManage ? t("stores.emptyHint") : undefined}
          action={
            canManage ? (
              <button
                type="button"
                onClick={() => setPanel({ mode: "create" })}
                className="btn btn-important"
              >
                <Plus className="size-4 shrink-0" aria-hidden />
                {t("stores.create")}
              </button>
            ) : null
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("stores.noMatches")}
          hint={t("stores.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setChannelFilter("all");
                setAccountFilter("all");
                setCreditFilter("all");
              }}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("stores.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          {filtered.map((store) => (
            <li key={store.id}>
              <StoreGridCard
                store={store}
                thumbSrc={thumbUrl(store)}
                onOpen={() => openEdit(store.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards" role="list">
            {filtered.map((store) => (
              <li key={store.id}>
                <StoreListCard
                  store={store}
                  thumbSrc={thumbUrl(store)}
                  onOpen={() => openEdit(store.id)}
                />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("stores.storeName")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("stores.email")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
                    {t("stores.channel")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("stores.accountStatus")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("stores.debt")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("stores.openProfile")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((store) => (
                  <StoreTableRow
                    key={store.id}
                    store={store}
                    thumbSrc={thumbUrl(store)}
                    onOpen={() => openEdit(store.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {panel.mode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/50 dark:bg-black/70"
            aria-label={t("stores.dismissOverlay")}
            onClick={() => setPanel({ mode: "closed" })}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-line px-4 py-4 text-start sm:px-5">
              <span className="icon-badge icon-badge-md tone-orange">
                <Store className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-semibold text-fg">
                  {panel.mode === "create"
                    ? t("stores.create")
                    : t("stores.profileTitle")}
                </h2>
                <p className="text-sm text-fg-subtle">
                  {panel.mode === "create"
                    ? t("stores.createHint")
                    : editingStore?.storeName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel({ mode: "closed" })}
                className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
                aria-label={t("stores.closeProfile")}
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              {panel.mode === "create" && canManage ? (
                <CreateStoreForm />
              ) : editingStore ? (
                <EditStoreForm
                  store={editingStore}
                  canManage={canManage}
                  primaryMediaUrl={thumbUrl(editingStore)}
                  defaultOpenPhotos={focusPhotosStoreId === editingStore.id}
                  onPrimaryUrlChange={(url) => {
                    setThumbByStoreId((prev) => ({
                      ...prev,
                      [editingStore.id]: url,
                    }));
                  }}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
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

function DualCurrencyPanel({
  debtIqd,
  debtUsd,
  remainingIqd,
  remainingUsd,
}: {
  debtIqd: string;
  debtUsd: string;
  remainingIqd: string;
  remainingUsd: string;
}) {
  const t = useTranslations();
  return (
    <div className="grid gap-2">
      <div className="rounded-xl border border-line bg-surface px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle text-start">
          {t("stores.debt")}
        </p>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          <div className="text-start">
            <p className="text-[11px] font-medium text-fg-muted">IQD</p>
            <p className="text-lg font-bold tabular-nums text-fg">
              {formatNumber(debtIqd, { fractionDigits: 0 })}
            </p>
          </div>
          <div className="text-start">
            <p className="text-[11px] font-medium text-fg-muted">USD</p>
            <p className="text-lg font-bold tabular-nums text-fg">
              {formatMoney(debtUsd, "USD")}
            </p>
          </div>
        </div>
        <p className="mt-1.5 text-xs tabular-nums text-fg-muted text-start">
          {formatDualMoney(debtIqd, debtUsd)}
        </p>
      </div>

      <div className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-2 text-start">
        <p className="text-xs font-medium text-fg-subtle">{t("stores.remaining")}</p>
        <p className="mt-0.5 text-sm font-semibold tabular-nums text-fg">
          {formatDualMoney(remainingIqd, remainingUsd)}
        </p>
      </div>
    </div>
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

function StoreMeta({ store }: { store: StoresDirectoryItem }) {
  const t = useTranslations();
  const channel = storeChannel(store.tier);
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span>{t(`stores.channels.${channel}`)}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span>{t(`storeTiers.${store.tier}`)}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span>{t(`stores.accountStatuses.${store.status}`)}</span>
      {store.email ? (
        <>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="truncate">{store.email}</span>
        </>
      ) : null}
    </span>
  );
}

function StoreGridCard({
  store,
  thumbSrc,
  onOpen,
}: {
  store: StoresDirectoryItem;
  thumbSrc: string | null;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const channel = storeChannel(store.tier);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-touch w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-2.5 py-2 text-start shadow-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <Thumb kind="store" size="md" src={thumbSrc} alt={store.storeName} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">
          {store.storeName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-judi-800 dark:text-judi-200">
          {t(`stores.channels.${channel}`)} · {t(`storeTiers.${store.tier}`)}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-fg-subtle">
          <CreditBadge status={store.creditStatus} />
          <span className="tabular-nums text-fg-muted">
            {t("stores.debtShort")}: {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
          </span>
        </span>
      </span>
    </button>
  );
}

function StoreListCard({
  store,
  thumbSrc,
  onOpen,
}: {
  store: StoresDirectoryItem;
  thumbSrc: string | null;
  onOpen: () => void;
}) {
  const t = useTranslations();
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-start shadow-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-4"
    >
      <Thumb kind="store" size="sm" src={thumbSrc} alt={store.storeName} />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="truncate font-semibold text-fg">{store.storeName}</span>
          <CreditBadge status={store.creditStatus} />
        </span>
        <StoreMeta store={store} />
        <span className="mt-0.5 block text-sm font-medium tabular-nums text-fg">
          {t("stores.debtShort")}: {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
        </span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-judi-800 dark:text-judi-200">
        {t("stores.openProfile")}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </span>
    </button>
  );
}

function StoreTableRow({
  store,
  thumbSrc,
  onOpen,
}: {
  store: StoresDirectoryItem;
  thumbSrc: string | null;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const channel = storeChannel(store.tier);
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-touch items-center gap-3 text-start font-medium text-fg hover:text-judi-800 focus-visible:outline-none dark:hover:text-judi-200"
        >
          <Thumb
            kind="store"
            size="xs"
            src={thumbSrc}
            alt=""
            desktopOnly
          />
          <span className="truncate">{store.storeName}</span>
        </button>
      </td>
      <td className="px-4 py-2 text-fg-muted">
        <span className="line-clamp-1">{store.email ?? "—"}</span>
      </td>
      <td className="hidden px-4 py-2 text-fg-muted md:table-cell">
        {t(`stores.channels.${channel}`)} · {t(`storeTiers.${store.tier}`)}
      </td>
      <td className="hidden px-4 py-2 text-fg-muted lg:table-cell">
        {t(`stores.accountStatuses.${store.status}`)}
      </td>
      <td className="px-4 py-2">
        <div className="flex flex-col gap-1">
          <span className="tabular-nums text-fg font-medium">
            {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
          </span>
          <CreditBadge status={store.creditStatus} />
        </div>
      </td>
      <td className="px-4 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
          aria-label={t("stores.openProfile")}
        >
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </button>
      </td>
    </tr>
  );
}

function CreateStoreForm() {
  const t = useTranslations();
  return (
    <form action={createStoreAction} className="grid gap-3">
      <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-3 text-sm text-fg-muted text-start">
        {t("stores.photosAfterSave")}
      </p>
      <Field
        icon={Store}
        label={t("stores.storeName")}
        name="storeName"
        hint={t("stores.storeNameHint")}
        required
      />
      <Field
        icon={UserRound}
        label={t("stores.ownerName")}
        name="ownerName"
        hint={t("stores.ownerNameHint")}
      />
      <Field
        icon={Phone}
        label={t("stores.phone")}
        name="phone"
        type="tel"
        hint={t("stores.phoneHint")}
        required
      />
      <Field
        icon={Mail}
        label={t("stores.email")}
        name="email"
        type="email"
        hint={t("stores.emailHint")}
        autoComplete="off"
      />
      <Field
        icon={MapPin}
        label={t("stores.address")}
        name="address"
        hint={t("stores.addressHint")}
      />
      <SelectField
        icon={ShoppingBag}
        label={t("stores.tier")}
        name="tier"
        hint={t("stores.tierHint")}
        defaultValue="SUPERMARKET"
      >
        {STORE_TIERS.map((tier) => (
          <option key={tier} value={tier}>
            {t(`storeTiers.${tier}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        icon={BadgeCheck}
        label={t("stores.accountStatus")}
        name="status"
        hint={t("stores.accountStatusHint")}
        defaultValue="ACTIVE"
      >
        {STORE_STATUSES.map((status) => (
          <option key={status} value={status}>
            {t(`stores.accountStatuses.${status}`)}
          </option>
        ))}
      </SelectField>
      <Field
        icon={Wallet}
        label={t("stores.creditLimit")}
        name="creditLimit"
        amount
        fractionDigits={0}
        defaultValue="0"
        required
      />
      <Field
        icon={Wallet}
        label={t("stores.creditLimitUsd")}
        name="creditLimitUsd"
        amount
        fractionDigits={2}
        defaultValue="0"
        required
      />
      <StoreLocationFields />
      <div className="sticky-form-actions -mx-4 mt-1 sm:-mx-5">
        <button
          type="submit"
          className="btn btn-important w-full"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          {t("stores.save")}
        </button>
      </div>
    </form>
  );
}

function EditStoreForm({
  store,
  canManage,
  primaryMediaUrl,
  defaultOpenPhotos = false,
  onPrimaryUrlChange,
}: {
  store: StoresDirectoryItem;
  canManage: boolean;
  primaryMediaUrl: string | null;
  defaultOpenPhotos?: boolean;
  onPrimaryUrlChange?: (url: string | null) => void;
}) {
  const t = useTranslations();
  const channel = storeChannel(store.tier);

  return (
    <div id={`store-${store.id}`} className="space-y-4">
      <StoreMediaPanel
        storeId={store.id}
        storeName={store.storeName}
        initialPrimaryUrl={primaryMediaUrl}
        canEdit={canManage}
        defaultOpen={defaultOpenPhotos}
        size="lg"
        onPrimaryUrlChange={onPrimaryUrlChange}
      />

      <div className="space-y-3 rounded-xl border border-line bg-muted/30 px-3 py-3 text-start">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium text-fg">
            {t(`stores.channels.${channel}`)} · {t(`storeTiers.${store.tier}`)}
          </p>
          <CreditBadge status={store.creditStatus} />
        </div>

        <DualCurrencyPanel
          debtIqd={store.currentDebt}
          debtUsd={store.currentDebtUsd}
          remainingIqd={store.remainingIqd}
          remainingUsd={store.remainingUsd}
        />
      </div>

      {canManage ? (
        <form action={updateStoreAction} className="grid gap-3">
          <input type="hidden" name="id" value={store.id} />
          <Field
            icon={Store}
            label={t("stores.storeName")}
            name="storeName"
            defaultValue={store.storeName}
            required
          />
          <Field
            icon={UserRound}
            label={t("stores.ownerName")}
            name="ownerName"
            defaultValue={store.ownerName ?? ""}
          />
          <Field
            icon={Phone}
            label={t("stores.phone")}
            name="phone"
            type="tel"
            defaultValue={store.phone}
            required
          />
          <Field
            icon={Mail}
            label={t("stores.email")}
            name="email"
            type="email"
            defaultValue={store.email ?? ""}
            hint={t("stores.emailHint")}
            autoComplete="off"
          />
          <Field
            icon={MapPin}
            label={t("stores.address")}
            name="address"
            defaultValue={store.address ?? ""}
          />
          <SelectField
            icon={ShoppingBag}
            label={t("stores.tier")}
            name="tier"
            defaultValue={store.tier}
          >
            {STORE_TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {t(`storeTiers.${tier}`)}
              </option>
            ))}
          </SelectField>
          <SelectField
            icon={BadgeCheck}
            label={t("stores.accountStatus")}
            name="status"
            defaultValue={store.status}
            hint={t("stores.accountStatusHint")}
          >
            {STORE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {t(`stores.accountStatuses.${status}`)}
              </option>
            ))}
          </SelectField>
          <Field
            icon={Wallet}
            label={t("stores.creditLimit")}
            name="creditLimit"
            amount
            fractionDigits={0}
            defaultValue={store.creditLimit}
            required
          />
          <Field
            icon={Wallet}
            label={t("stores.creditLimitUsd")}
            name="creditLimitUsd"
            amount
            fractionDigits={2}
            defaultValue={store.creditLimitUsd}
            required
          />
          <StoreLocationFields
            defaultLatitude={store.latitude}
            defaultLongitude={store.longitude}
            storeName={store.storeName}
          />
          <div className="sticky-form-actions -mx-4 mt-1 sm:-mx-5">
            <button
              type="submit"
              className="btn btn-important w-full"
            >
              <Save className="size-4 shrink-0" aria-hidden />
              {t("stores.update")}
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2 text-start text-sm text-fg-muted">
            <p>
              <span className="font-medium text-fg">{t("stores.phone")}: </span>
              {store.phone}
            </p>
            {store.email ? (
              <p>
                <span className="font-medium text-fg">{t("stores.email")}: </span>
                {store.email}
              </p>
            ) : null}
            {store.ownerName ? (
              <p>
                <span className="font-medium text-fg">{t("stores.ownerName")}: </span>
                {store.ownerName}
              </p>
            ) : null}
            {store.address ? (
              <p>
                <span className="font-medium text-fg">{t("stores.address")}: </span>
                {store.address}
              </p>
            ) : null}
            <p>
              <span className="font-medium text-fg">{t("stores.accountStatus")}: </span>
              {t(`stores.accountStatuses.${store.status}`)}
            </p>
          </div>
          <StoreLocationMap
            latitude={store.latitude}
            longitude={store.longitude}
            label={store.storeName}
            height={168}
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2 border-t border-line pt-4">
        <Link
          href={`/dashboard/stores/${store.id}/stock`}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl border border-judi-300 px-3 text-sm font-medium text-judi-800 hover:bg-judi-50 dark:border-judi-700 dark:text-judi-200 dark:hover:bg-judi-950/40 sm:flex-none"
        >
          <Boxes className="size-4 shrink-0" aria-hidden />
          {t("stores.storeStock")}
        </Link>
        <Link
          href={`/dashboard/stores/${store.id}/statement`}
          className="inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-xl border border-judi-300 px-3 text-sm font-medium text-judi-800 hover:bg-judi-50 dark:border-judi-700 dark:text-judi-200 dark:hover:bg-judi-950/40 sm:flex-none"
        >
          <FileText className="size-4 shrink-0" aria-hidden />
          {t("stores.statement")}
        </Link>
        {canManage ? (
          <form action={deleteStoreAction}>
            <input type="hidden" name="id" value={store.id} />
            <button
              type="submit"
              className="inline-flex min-h-touch items-center gap-2 rounded-xl px-3 text-sm font-medium text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              {t("stores.delete")}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  name,
  hint,
  required,
  defaultValue,
  type = "text",
  min,
  step,
  autoComplete,
  amount,
  fractionDigits = 0,
}: {
  icon?: LucideIcon;
  label: string;
  name: string;
  hint?: string;
  required?: boolean;
  defaultValue?: string;
  type?: string;
  min?: number;
  step?: string;
  autoComplete?: string;
  amount?: boolean;
  fractionDigits?: number;
}) {
  return (
    <label className="block space-y-1.5 text-start">
      <span className="flex items-center gap-2 text-sm font-medium text-fg">
        {Icon ? (
          <Icon
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
        ) : null}
        {label}
      </span>
      {amount ? (
        <AmountInput
          name={name}
          defaultValue={defaultValue}
          fractionDigits={fractionDigits}
          required={required}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg tabular-nums"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          defaultValue={defaultValue}
          min={min}
          step={step}
          autoComplete={autoComplete}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      )}
      {hint ? <span className="block text-xs text-fg-subtle">{hint}</span> : null}
    </label>
  );
}

function SelectField({
  icon: Icon,
  label,
  name,
  hint,
  defaultValue,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1.5 text-start">
      <span className="flex items-center gap-2 text-sm font-medium text-fg">
        {Icon ? (
          <Icon
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
        ) : null}
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
      >
        {children}
      </select>
      {hint ? <span className="block text-xs text-fg-subtle">{hint}</span> : null}
    </label>
  );
}
