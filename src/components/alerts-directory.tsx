"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import type { LucideIcon } from "lucide-react";
import type { NotificationKind } from "@prisma/client";
import {
  Bell,
  BellOff,
  BellRing,
  CheckCheck,
  FileText,
  LayoutGrid,
  List,
  Package,
  Search,
  Truck,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import { enablePushNotifications, notificationsSupported } from "@/lib/push-client";
import {
  pickLocaleText,
  type LocaleText,
  type NotificationDto,
} from "@/lib/notification-types";

type ViewMode = "grid" | "list";
type ReadFilter = "all" | "unread" | "read";
type KindFilter = "all" | NotificationKind;

const KIND_ICONS: Record<NotificationKind, LucideIcon> = {
  SYSTEM: Bell,
  INVOICE: FileText,
  COLLECTION: Wallet,
  TRANSFER: Truck,
  STOCK: Package,
  DEBT: Wallet,
  USER: UserRound,
};

function localized(text: LocaleText | null | undefined, locale: string) {
  return pickLocaleText(text ?? undefined, locale);
}

function formatWhen(iso: string, locale: string) {
  try {
    return new Intl.DateTimeFormat(locale === "ckb" ? "en" : locale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function AlertsDirectory({
  initialItems,
  homeHref,
}: {
  initialItems: NotificationDto[];
  homeHref: "/field" | "/dashboard";
}) {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [view, setView] = useState<ViewMode>("list");
  const [pushState, setPushState] = useState<
    "idle" | "loading" | "on" | "denied" | "unsupported" | "error"
  >("idle");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    if (!notificationsSupported()) {
      setPushState("unsupported");
      return;
    }
    if (Notification.permission === "granted") setPushState("on");
    else if (Notification.permission === "denied") setPushState("denied");
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (kindFilter !== "all" && item.kind !== kindFilter) return false;
      if (readFilter === "unread" && item.readAt) return false;
      if (readFilter === "read" && !item.readAt) return false;
      if (!needle) return true;
      const title = localized(item.title, locale).toLowerCase();
      const body = localized(item.body, locale).toLowerCase();
      const actor = (item.actorName ?? "").toLowerCase();
      return title.includes(needle) || body.includes(needle) || actor.includes(needle);
    });
  }, [items, kindFilter, locale, query, readFilter]);

  const unreadCount = items.filter((item) => !item.readAt).length;

  function clearFilters() {
    setQuery("");
    setKindFilter("all");
    setReadFilter("all");
  }

  async function enablePush() {
    setPushState("loading");
    try {
      const result = await enablePushNotifications();
      setPushState(
        result === "granted" ? "on" : result === "unsupported" ? "unsupported" : "denied",
      );
    } catch {
      setPushState("error");
    }
  }

  function markRead(ids?: string[]) {
    startTransition(async () => {
      const body = ids?.length ? { ids } : { all: true };
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return;
      const now = new Date().toISOString();
      setItems((prev) =>
        prev.map((item) => {
          if (item.readAt) return item;
          if (!ids || ids.includes(item.id)) return { ...item, readAt: now };
          return item;
        }),
      );
    });
  }

  function openItem(item: NotificationDto) {
    if (!item.readAt) markRead([item.id]);
    if (!item.href) return;
    router.push(item.href as "/dashboard");
  }

  return (
    <div className="space-y-4">
      <PushBanner state={pushState} onEnable={enablePush} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === items.length
            ? t("field.alertsListHint", { count: items.length })
            : t("field.alertsMatched", {
                matched: filtered.length,
                total: items.length,
              })}
          {unreadCount > 0 ? ` · ${t("field.alertsUnread", { count: unreadCount })}` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          {unreadCount > 0 ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => markRead()}
              className="btn btn-regular disabled:opacity-60"
            >
              <CheckCheck className="size-4 shrink-0" aria-hidden />
              {t("field.alertsMarkAllRead")}
            </button>
          ) : null}
        </div>
      </div>

      <section
        aria-labelledby="field-alerts-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="field-alerts-filters-heading" className="sr-only">
          {t("field.alertsFiltersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("field.alertsSearch")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("field.alertsSearchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line bg-canvas pe-3 ps-10 text-fg placeholder:text-fg-subtle"
          />
        </label>

        <div className="chip-scroll flex gap-2 overflow-x-auto pb-1">
          <FilterChip
            active={readFilter === "all"}
            onClick={() => setReadFilter("all")}
            label={t("field.alertsReadAll")}
          />
          <FilterChip
            active={readFilter === "unread"}
            onClick={() => setReadFilter("unread")}
            label={t("field.alertsUnreadFilter")}
          />
          <FilterChip
            active={readFilter === "read"}
            onClick={() => setReadFilter("read")}
            label={t("field.alertsReadFilter")}
          />
        </div>

        <div className="chip-scroll flex gap-2 overflow-x-auto pb-1">
          {(
            [
              "all",
              "SYSTEM",
              "INVOICE",
              "COLLECTION",
              "TRANSFER",
              "STOCK",
              "DEBT",
              "USER",
            ] as const
          ).map((kind) => (
            <FilterChip
              key={kind}
              active={kindFilter === kind}
              onClick={() => setKindFilter(kind)}
              label={
                kind === "all" ? t("field.alertsKindAll") : t(`field.alertsKinds.${kind}`)
              }
            />
          ))}
        </div>

        {query || kindFilter !== "all" || readFilter !== "all" ? (
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex min-h-touch items-center gap-2 rounded-xl px-3 text-sm font-medium text-judi-800 hover:bg-muted dark:text-judi-200"
          >
            <X className="size-4" aria-hidden />
            {t("field.alertsClearFilters")}
          </button>
        ) : null}
      </section>

      {filtered.length === 0 ? (
        <EmptyState homeHref={homeHref} hasItems={items.length > 0} />
      ) : view === "grid" ? (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <AlertCard item={item} locale={locale} view="grid" onOpen={() => openItem(item)} />
            </li>
          ))}
        </ul>
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <AlertCard item={item} locale={locale} view="list" onOpen={() => openItem(item)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PushBanner({
  state,
  onEnable,
}: {
  state: "idle" | "loading" | "on" | "denied" | "unsupported" | "error";
  onEnable: () => void;
}) {
  const t = useTranslations();

  if (state === "on") {
    return (
      <div className="flex min-h-touch items-start gap-3 rounded-2xl border border-judi-200 bg-judi-50 px-4 py-3 text-start dark:border-judi-800 dark:bg-judi-950/40">
        <Thumb kind="stock" size="sm" src={null} icon={BellRing} alt="" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-judi-950 dark:text-judi-50">
            {t("field.alertsPushOnTitle")}
          </p>
          <p className="mt-0.5 text-sm text-judi-800 dark:text-judi-200">
            {t("field.alertsPushOnBody")}
          </p>
        </div>
      </div>
    );
  }

  if (state === "unsupported") {
    return (
      <div className="flex min-h-touch items-start gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-start">
        <Thumb kind="stock" size="sm" src={null} icon={BellOff} alt="" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">{t("field.alertsPushUnsupportedTitle")}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.alertsPushUnsupportedBody")}</p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-touch items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-start dark:border-amber-900 dark:bg-amber-950/30">
        <Thumb kind="stock" size="sm" src={null} icon={BellOff} alt="" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-fg">{t("field.alertsPushDeniedTitle")}</p>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.alertsPushDeniedBody")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-3 text-start shadow-sm sm:p-4">
      <Thumb kind="stock" size="md" src={null} icon={Bell} alt="" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-fg">{t("field.alertsPushEnableTitle")}</p>
        <p className="mt-0.5 text-sm text-fg-muted">{t("field.alertsPushEnableBody")}</p>
        {state === "error" ? (
          <p className="mt-1 text-sm text-red-700 dark:text-red-300" role="alert">
            {t("field.alertsPushError")}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onEnable}
        disabled={state === "loading"}
        className="btn btn-important shrink-0"
      >
        {state === "loading" ? t("field.alertsPushEnabling") : t("field.alertsPushEnable")}
      </button>
    </div>
  );
}

function AlertCard({
  item,
  locale,
  view,
  onOpen,
}: {
  item: NotificationDto;
  locale: string;
  view: ViewMode;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const Icon = KIND_ICONS[item.kind];
  const title = localized(item.title, locale);
  const body = localized(item.body, locale);
  const thumbSrc = item.thumbUrl || item.actorThumbUrl;
  const unread = !item.readAt;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full gap-3 rounded-2xl border p-4 text-start shadow-sm transition-colors ${
        unread
          ? "border-judi-300 bg-accent-soft/40 hover:border-judi-500 dark:border-judi-700"
          : "border-line bg-surface hover:border-judi-500 hover:bg-accent-soft/40"
      } ${view === "grid" ? "min-h-[8.5rem] flex-col sm:flex-row" : "min-h-touch items-center"}`}
    >
      <Thumb
        kind="person"
        size={view === "grid" ? "md" : "sm"}
        src={thumbSrc}
        icon={Icon}
        alt=""
      />
      <div className="min-w-0 flex-1 text-start">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`font-semibold text-fg ${unread ? "" : "text-fg-muted"}`}>{title}</p>
          {unread ? (
            <span className="rounded-md bg-judi-700 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white dark:bg-judi-500 dark:text-judi-950">
              {t("field.alertsNewBadge")}
            </span>
          ) : null}
        </div>
        {body ? <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{body}</p> : null}
        <p className="mt-1 text-xs text-fg-subtle">
          {t(`field.alertsKinds.${item.kind}`)}
          {item.actorName ? ` · ${item.actorName}` : ""}
          {` · ${formatWhen(item.createdAt, locale)}`}
        </p>
      </div>
    </button>
  );
}

function EmptyState({
  homeHref,
  hasItems,
}: {
  homeHref: "/field" | "/dashboard";
  hasItems: boolean;
}) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <Thumb kind="stock" size="lg" src={null} icon={Bell} alt="" />
      <div className="max-w-sm space-y-1">
        <p className="text-lg font-semibold text-fg">
          {hasItems ? t("field.alertsNoMatch") : t("field.alertsEmpty")}
        </p>
        <p className="text-sm text-fg-muted">
          {hasItems ? t("field.alertsNoMatchHint") : t("field.alertsEmptyHint")}
        </p>
      </div>
      <Link
        href={homeHref}
        className="btn btn-important"
      >
        {t("field.alertsBackHome")}
      </Link>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-touch shrink-0 items-center rounded-xl px-3 text-sm font-medium ${
        active
          ? "seg-on"
          : "border border-line bg-canvas text-fg hover:bg-muted"
      }`}
    >
      {label}
    </button>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (view: ViewMode) => void;
}) {
  const t = useTranslations();
  return (
    <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="group">
      <ToggleBtn
        active={view === "list"}
        onClick={() => onChange("list")}
        label={t("field.viewList")}
        icon={List}
      />
      <ToggleBtn
        active={view === "grid"}
        onClick={() => onChange("grid")}
        label={t("field.viewGrid")}
        icon={LayoutGrid}
      />
    </div>
  );
}

function ToggleBtn({
  active,
  onClick,
  label,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: LucideIcon;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={label}
      className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg ${
        active ? "seg-on" : "text-fg-muted"
      }`}
    >
      <Icon className="size-4" aria-hidden />
      <span className="sr-only">{label}</span>
    </button>
  );
}
