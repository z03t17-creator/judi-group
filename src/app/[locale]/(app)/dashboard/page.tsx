import type { LucideIcon } from "lucide-react";
import {
  BadgePercent,
  Boxes,
  CalendarClock,
  CalendarRange,
  CircleDollarSign,
  ClipboardList,
  Coins,
  FileText,
  LayoutDashboard,
  Package,
  Percent,
  Receipt,
  ShoppingBag,
  Store,
  TrendingUp,
  Truck,
  UserRound,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { InstantLink } from "@/components/instant-nav";
import { DailySalesChart, TopProductsChart } from "@/components/dashboard-charts-lazy";
import { Thumb } from "@/components/thumb";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { formatMoney, isCurrency, type CurrencyCode } from "@/lib/money";
import { loadDashboardSummary } from "@/lib/reports/dashboard-summary-load";
import { toBaghdadYmd } from "@/lib/reports/date";
import { syncExpiringLotAlerts } from "@/lib/expiry-alerts";
import {
  cardTone,
  DASHBOARD_SHORTCUT_TONES,
  iconBadge,
  tileTone,
  type UiTone,
} from "@/lib/ui-tones";

type ShortcutHref =
  | "/dashboard/users"
  | "/dashboard/warehouses"
  | "/dashboard/products"
  | "/dashboard/stock"
  | "/dashboard/expiry"
  | "/dashboard/expenses"
  | "/dashboard/transfers"
  | "/dashboard/stores"
  | "/dashboard/invoices"
  | "/dashboard/collections"
  | "/dashboard/debts"
  | "/dashboard/reports";

type Shortcut = {
  href: ShortcutHref;
  title: string;
  hint: string;
  icon: LucideIcon;
};

type KpiHref = ShortcutHref | null;

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; currency?: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const query = await searchParams;

  // Best-effort expiry window alerts (7 / 14 / 30 / expired).
  void syncExpiringLotAlerts(locale).catch(() => {
    /* non-blocking */
  });

  const today = toBaghdadYmd(new Date());
  const fromDefault = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 14);
    return toBaghdadYmd(d);
  })();
  const from =
    query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : fromDefault;
  const to = query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : today;
  const currency: CurrencyCode =
    query.currency && isCurrency(query.currency) ? query.currency : "IQD";

  const [warehouse, report] = await Promise.all([
    session.user.warehouseId
      ? prisma.warehouse.findUnique({
          where: { id: session.user.warehouseId },
          select: { name: true },
        })
      : Promise.resolve(null),
    loadDashboardSummary({ from, to, currency, locale }),
  ]);
  const warehouseName = warehouse
    ? localized(warehouse.name, locale)
    : t("dashboard.noWarehouse");
  const isCollector = session.user.role === "COLLECTOR_ACCOUNTANT";
  const isAdmin = session.user.role === "ADMIN";
  const canStock = !isCollector;
  const canCollections = isAdmin || isCollector;

  const topStoreIds = report.topMetrics.topStores.map((s) => s.storeId);
  const storeThumbs =
    topStoreIds.length > 0
      ? await prisma.store.findMany({
          where: { id: { in: topStoreIds } },
          select: {
            id: true,
            primaryMedia: { select: { url: true } },
          },
        })
      : [];
  const thumbByStoreId = new Map(
    storeThumbs.map((s) => [s.id, s.primaryMedia?.url ?? null] as const),
  );

  const shortcuts: Shortcut[] = [];

  if (isAdmin) {
    shortcuts.push({
      href: "/dashboard/users",
      title: t("nav.users"),
      hint: t("dashboard.usersCard"),
      icon: Users,
    });
  }

  if (!isCollector) {
    shortcuts.push(
      {
        href: "/dashboard/warehouses",
        title: t("nav.warehouses"),
        hint: t("dashboard.warehousesCard"),
        icon: Warehouse,
      },
      {
        href: "/dashboard/products",
        title: t("nav.products"),
        hint: t("dashboard.productsCard"),
        icon: Package,
      },
      {
        href: "/dashboard/stock",
        title: t("nav.stock"),
        hint: t("dashboard.stockCard"),
        icon: Boxes,
      },
      {
        href: "/dashboard/expiry",
        title: t("nav.expiry"),
        hint: t("dashboard.expiryCard"),
        icon: CalendarClock,
      },
      {
        href: "/dashboard/expenses",
        title: t("nav.expenses"),
        hint: t("dashboard.expensesCard"),
        icon: Receipt,
      },
      {
        href: "/dashboard/transfers",
        title: t("nav.transfers"),
        hint: t("dashboard.transfersCard"),
        icon: Truck,
      },
    );
  }

  shortcuts.push(
    {
      href: "/dashboard/stores",
      title: t("nav.stores"),
      hint: t("dashboard.storesCard"),
      icon: Store,
    },
    {
      href: "/dashboard/invoices",
      title: t("nav.invoices"),
      hint: t("dashboard.invoicesCard"),
      icon: FileText,
    },
  );

  if (canCollections) {
    shortcuts.push({
      href: "/dashboard/collections",
      title: t("nav.collections"),
      hint: t("dashboard.collectionsCard"),
      icon: Wallet,
    });
  }

  shortcuts.push(
    {
      href: "/dashboard/debts",
      title: t("nav.debts"),
      hint: t("dashboard.debtsCard"),
      icon: CircleDollarSign,
    },
    {
      href: "/dashboard/reports",
      title: t("nav.reports"),
      hint: t("dashboard.reportsCard"),
      icon: ClipboardList,
    },
  );

  const kpis: {
    label: string;
    value: string;
    hint?: string;
    icon: LucideIcon;
    tone: UiTone;
    href: KpiHref;
  }[] = [
    {
      label: t("dashboard.kpiGrossSales"),
      value: formatMoney(report.summary.grossSales, currency),
      icon: ShoppingBag,
      tone: "sky",
      href: "/dashboard/invoices",
    },
    {
      label: t("dashboard.kpiNetSales"),
      value: formatMoney(report.summary.netSales, currency),
      icon: TrendingUp,
      tone: "teal",
      href: "/dashboard/invoices",
    },
    {
      label: t("dashboard.kpiCash"),
      value: formatMoney(report.summary.totalCashCollected, currency),
      icon: Coins,
      tone: "emerald",
      href: canCollections ? "/dashboard/collections" : "/dashboard/invoices",
    },
    {
      label: t("dashboard.kpiDebt"),
      value: formatMoney(report.summary.totalOutstandingDebt, currency),
      icon: CircleDollarSign,
      tone: "rose",
      href: "/dashboard/debts",
    },
    {
      label: t("dashboard.kpiCogs"),
      value: formatMoney(report.summary.totalCostOfGoodsSold, currency),
      icon: Package,
      tone: "indigo",
      href: canStock ? "/dashboard/stock" : null,
    },
    {
      label: t("dashboard.kpiProfit"),
      value: formatMoney(report.summary.grossProfit, currency),
      hint: t("dashboard.kpiMarginHint", {
        percent: report.summary.profitMarginPercent,
      }),
      icon: Percent,
      tone: "amber",
      href: "/dashboard/reports",
    },
  ];

  return (
    <main className="space-y-6 sm:space-y-8">
      <header className="flex flex-wrap items-start gap-4 text-start">
        <span className={iconBadge("teal", "lg")}>
          <LayoutDashboard className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-fg">
            {t("dashboard.title")}
          </h1>
          <p className="mt-1 text-fg-muted">
            {t("dashboard.welcome", { name: session.user.name ?? "" })}
          </p>
        </div>
      </header>

      <section
        aria-label={t("dashboard.contextTitle")}
        className="grid gap-3 sm:grid-cols-3"
      >
        <ContextChip
          icon={UserRound}
          label={t("dashboard.role")}
          value={t(`roles.${session.user.role}`)}
        />
        <ContextChip
          icon={Warehouse}
          label={t("dashboard.warehouse")}
          value={warehouseName}
        />
        <ContextChip
          icon={BadgePercent}
          label={t("dashboard.discountCap")}
          value={`${session.user.maxDiscountAllowed}%`}
        />
      </section>

      <section
        aria-labelledby="dashboard-filters-heading"
        className="surface-panel p-4 sm:p-5"
      >
        <div className="mb-4 flex items-center gap-3 text-start">
          <span className={iconBadge("indigo")}>
            <CalendarRange className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="dashboard-filters-heading" className="font-semibold text-fg">
              {t("dashboard.filtersTitle")}
            </h2>
            <p className="text-sm text-fg-subtle">{t("dashboard.filtersHint")}</p>
          </div>
        </div>

        <form method="get" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5 text-start">
            <span className="flex items-center gap-2 text-sm font-medium text-fg">
              <CalendarRange className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
              {t("reports.from")}
            </span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-start">
            <span className="flex items-center gap-2 text-sm font-medium text-fg">
              <CalendarRange className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
              {t("reports.to")}
            </span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-start">
            <span className="flex items-center gap-2 text-sm font-medium text-fg">
              <Coins className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
              {t("invoices.currency")}
            </span>
            <select
              name="currency"
              defaultValue={currency}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
            >
              <option value="IQD">{t("invoices.currencies.IQD")}</option>
              <option value="USD">{t("invoices.currencies.USD")}</option>
            </select>
          </label>
          <div className="flex items-end">
            <button type="submit" className="btn btn-important w-full">
              {t("reports.apply")}
            </button>
          </div>
        </form>
      </section>

      <section aria-label={t("dashboard.kpiSection")} className="kpi-grid">
        {kpis.map((kpi) => (
          <KpiCard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            icon={kpi.icon}
            tone={kpi.tone}
            href={kpi.href}
          />
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="surface-panel p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2 text-start">
            <TrendingUp className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            <h2 className="font-semibold text-fg">{t("dashboard.chartDaily")}</h2>
          </div>
          <p className="mb-3 text-sm text-fg-subtle text-start">
            {t("dashboard.chartDailyHint")}
          </p>
          <DailySalesChart
            data={report.dailyNetSales}
            emptyLabel={t("dashboard.chartEmpty")}
            seriesLabel={t("dashboard.chartLegendNetSales")}
          />
        </article>
        <article className="surface-panel p-4 sm:p-5">
          <div className="mb-1 flex items-center gap-2 text-start">
            <Package className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            <h2 className="font-semibold text-fg">{t("dashboard.chartProducts")}</h2>
          </div>
          <p className="mb-3 text-sm text-fg-subtle text-start">
            {t("dashboard.chartProductsHint")}
          </p>
          <TopProductsChart
            data={report.topMetrics.topProducts.map((p) => ({
              name: p.sku,
              revenue: p.revenue,
            }))}
            emptyLabel={t("dashboard.chartEmpty")}
            seriesLabel={t("dashboard.chartLegendRevenue")}
          />
        </article>
      </section>

      <section className="surface-panel">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3 text-start">
          <Store className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
          <h2 className="font-semibold text-fg">{t("dashboard.topStores")}</h2>
        </div>
        {report.topMetrics.topStores.length === 0 ? (
          <p className="px-4 py-8 text-sm text-fg-subtle text-start">
            {t("dashboard.chartEmpty")}
          </p>
        ) : (
          <>
            <ul className="money-cards-mobile p-3" role="list">
              {report.topMetrics.topStores.map((store) => (
                <li key={store.storeId}>
                  <InstantLink
                    href="/dashboard/stores"
                    className="flex min-h-touch items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3 text-start transition-colors hover:bg-muted focus-visible:bg-muted"
                  >
                    <Thumb
                      kind="store"
                      size="sm"
                      src={thumbByStoreId.get(store.storeId)}
                      alt=""
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-fg">
                        {store.storeName}
                      </span>
                      <span className="mt-0.5 block text-sm text-fg-muted">
                        {t("dashboard.volume")}: {formatMoney(store.totalVolume, currency)}
                      </span>
                    </span>
                    <span className="shrink-0 text-end">
                      <span className="block text-xs text-fg-subtle">{t("stores.debt")}</span>
                      <span className="block text-base font-bold tabular-nums text-fg">
                        {formatMoney(store.debt, currency)}
                      </span>
                    </span>
                  </InstantLink>
                </li>
              ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-full text-sm">
                <thead className="border-b border-line bg-muted text-start">
                  <tr>
                    <th className="px-4 py-3 text-start font-medium text-fg-muted">
                      {t("invoices.store")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium text-fg-muted">
                      {t("dashboard.volume")}
                    </th>
                    <th className="px-4 py-3 text-start font-medium text-fg-muted">
                      {t("stores.debt")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.topMetrics.topStores.map((store) => (
                    <tr
                      key={store.storeId}
                      className="border-b border-line last:border-0"
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex min-h-touch items-center gap-3 text-start">
                          <Thumb
                            kind="store"
                            size="xs"
                            src={thumbByStoreId.get(store.storeId)}
                            alt=""
                          />
                          <span className="font-medium text-fg">{store.storeName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg text-start">
                        {formatMoney(store.totalVolume, currency)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-fg text-start">
                        {formatMoney(store.debt, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <section aria-labelledby="dashboard-shortcuts-heading" className="space-y-4">
        <div className="flex items-center gap-3 text-start">
          <span className={iconBadge("blue")}>
            <ClipboardList className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="dashboard-shortcuts-heading" className="font-semibold text-fg">
              {t("dashboard.shortcutsTitle")}
            </h2>
            <p className="text-sm text-fg-subtle">{t("dashboard.shortcutsHint")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((item) => {
            const Icon = item.icon;
            const tone = DASHBOARD_SHORTCUT_TONES[item.href] ?? "teal";
            return (
              <InstantLink
                key={item.href}
                href={item.href}
                className={`flex min-h-touch items-center gap-4 rounded-2xl border bg-surface p-4 text-start shadow-sm transition-colors ${tileTone(tone)}`}
              >
                <span className={iconBadge(tone, "lg")}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-fg">{item.title}</span>
                  <span className="mt-1 block text-sm text-fg-muted">{item.hint}</span>
                </span>
              </InstantLink>
            );
          })}
        </div>
      </section>
    </main>
  );
}

function ContextChip({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <article className="flex min-h-touch items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-start shadow-sm">
      <span className={iconBadge("slate")}>
        <Icon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-fg-subtle">{label}</p>
        <p className="mt-0.5 font-semibold text-fg">{value}</p>
      </div>
    </article>
  );
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone: UiTone;
  href: KpiHref;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-fg">{label}</p>
        <span className={`${iconBadge(tone)} size-11`}>
          <Icon className="size-5" aria-hidden />
        </span>
      </div>
      <p className="mt-3 text-xl font-bold tracking-tight tabular-nums text-fg sm:text-2xl">
        {value}
      </p>
      {hint ? <p className="mt-1 text-sm text-fg-subtle">{hint}</p> : null}
    </>
  );

  const className = `block min-h-[7.5rem] rounded-2xl border p-4 shadow-sm text-start sm:p-5 ${cardTone(tone)} ${
    href ? "transition-colors" : ""
  }`;

  if (href) {
    return (
      <InstantLink href={href} className={className}>
        {body}
      </InstantLink>
    );
  }

  return <article className={className}>{body}</article>;
}
