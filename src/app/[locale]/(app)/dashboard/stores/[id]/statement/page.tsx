import {
  ArrowLeft,
  BarChart3,
  CalendarRange,
  FileText,
  Printer,
  Store,
  Wallet,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BrowserPrintButton } from "@/components/browser-print-button";
import { Thumb } from "@/components/thumb";
import { storeChannel, type StoreTier } from "@/lib/constants";
import { formatMoney, isCurrency, type CurrencyCode } from "@/lib/money";
import { loadCustomerStatement } from "@/lib/reports/statement-load";
import { requireOfficeSession } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { toBaghdadYmd } from "@/lib/reports/date";
import { StatementLedger } from "./statement-ledger";

export default async function StoreStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; currency?: string }>;
}) {
  await requireOfficeSession();
  const t = await getTranslations();
  const { id } = await params;
  const query = await searchParams;

  const today = toBaghdadYmd(new Date());
  const monthAgo = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 30);
    return toBaghdadYmd(d);
  })();

  const from =
    query.from && /^\d{4}-\d{2}-\d{2}$/.test(query.from) ? query.from : monthAgo;
  const to = query.to && /^\d{4}-\d{2}-\d{2}$/.test(query.to) ? query.to : today;
  const currency: CurrencyCode =
    query.currency && isCurrency(query.currency) ? query.currency : "IQD";

  const store = await prisma.store.findUnique({
    where: { id },
    include: { primaryMedia: { select: { url: true } } },
  });

  if (!store) {
    return (
      <main className="mx-auto w-full max-w-content space-y-4">
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {t("reports.storeNotFound")}
        </p>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/reports"
            className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
          >
            <BarChart3 className="size-4" aria-hidden />
            {t("nav.reports")}
          </Link>
          <Link
            href="/dashboard/stores"
            className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t("nav.stores")}
          </Link>
        </div>
      </main>
    );
  }

  const statement = await loadCustomerStatement({
    storeId: id,
    from,
    to,
    currency,
  });
  if (!statement) {
    return (
      <main className="mx-auto w-full max-w-content">
        <p className="text-fg-muted">{t("reports.storeNotFound")}</p>
      </main>
    );
  }

  const channel = storeChannel(store.tier);
  const tier = store.tier as StoreTier;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="no-print flex flex-wrap items-start gap-3">
        <Thumb
          kind="store"
          size="lg"
          src={store.primaryMedia?.url}
          alt={store.storeName}
        />
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-medium text-judi-800 dark:text-judi-200">
            {t("reports.statement")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {store.storeName}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {t(`stores.channels.${channel}`)} · {t(`storeTiers.${tier}`)}
            {store.phone ? ` · ${store.phone}` : ""}
            {store.email ? ` · ${store.email}` : ""}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
          <BrowserPrintButton label={t("reports.printStatement")} />
          <Link
            href="/dashboard/reports"
            className="btn btn-regular"
          >
            <BarChart3 className="size-4" aria-hidden />
            {t("nav.reports")}
          </Link>
          <Link
            href="/dashboard/stores"
            className="btn btn-regular"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
            {t("nav.stores")}
          </Link>
        </div>
      </header>

      <form
        method="get"
        className="no-print space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4"
      >
        <div className="flex items-start gap-2 text-start">
          <CalendarRange
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-fg">
              {t("reports.periodFilters")}
            </h2>
            <p className="text-xs text-fg-muted">{t("reports.periodFiltersHint")}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1.5 text-start">
            <span className="text-sm font-medium text-fg">{t("reports.from")}</span>
            <input
              type="date"
              name="from"
              defaultValue={from}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <label className="block space-y-1.5 text-start">
            <span className="text-sm font-medium text-fg">{t("reports.to")}</span>
            <input
              type="date"
              name="to"
              defaultValue={to}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <fieldset className="space-y-1.5 text-start">
            <legend className="text-sm font-medium text-fg">
              {t("invoices.currency")}
            </legend>
            <div
              role="group"
              aria-label={t("invoices.currency")}
              className="chip-scroll"
            >
              <CurrencyChip
                name="currency"
                value="IQD"
                defaultChecked={currency === "IQD"}
                label={t("invoices.currencies.IQD")}
              />
              <CurrencyChip
                name="currency"
                value="USD"
                defaultChecked={currency === "USD"}
                label={t("invoices.currencies.USD")}
              />
            </div>
          </fieldset>
          <div className="hidden items-end lg:flex">
            <button
              type="submit"
              className="btn btn-important w-full"
            >
              {t("reports.apply")}
            </button>
          </div>
        </div>
        <div className="sticky-form-actions -mx-3 sm:-mx-4 lg:hidden">
          <button
            type="submit"
            className="btn btn-important w-full"
          >
            {t("reports.apply")}
          </button>
        </div>
      </form>

      <section className="statement-print space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <header className="flex flex-wrap items-start gap-3 border-b border-line pb-4 text-start">
          <span className="icon-badge icon-badge-md tone-orange print:hidden">
            <FileText className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-fg sm:text-xl">
              {t("reports.statementTitle")}
            </h2>
            <p className="mt-0.5 text-sm text-fg-muted">
              {store.storeName} · {from} → {to} · {currency}
            </p>
          </div>
          <span className="hidden print:inline-flex items-center gap-1 text-sm text-stone-600">
            <Printer className="size-4" aria-hidden />
            {t("reports.printStatement")}
          </span>
        </header>

        <div className="kpi-grid">
          <Metric
            icon={Wallet}
            label={t("stores.creditLimit")}
            value={formatMoney(statement.creditLimit, currency)}
          />
          <Metric
            label={t("reports.openingBalance")}
            value={formatMoney(statement.openingBalance, currency)}
          />
          <Metric
            label={t("reports.closingBalance")}
            value={formatMoney(statement.closingBalance, currency)}
          />
          <Metric
            icon={Store}
            label={t("stores.debt")}
            value={formatMoney(statement.currentDebt, currency)}
            emphasize
          />
        </div>

        <div className="space-y-2">
          <h3 className="text-start text-sm font-semibold text-fg">
            {t("reports.aging")}
          </h3>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <Metric
              label={t("reports.agingCurrent")}
              value={formatMoney(statement.aging.current, currency)}
              compact
            />
            <Metric
              label={t("reports.aging31")}
              value={formatMoney(statement.aging.days31to60, currency)}
              compact
            />
            <Metric
              label={t("reports.aging61")}
              value={formatMoney(statement.aging.days61to90, currency)}
              compact
            />
            <Metric
              label={t("reports.aging90")}
              value={formatMoney(statement.aging.over90, currency)}
              compact
            />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-start text-sm font-semibold text-fg">
            {t("reports.ledgerTitle")}
          </h3>
          <StatementLedger
            currency={currency}
            entries={statement.ledgerEntries.map((entry) => ({
              id: entry.id,
              date: entry.date,
              type: entry.type,
              reference: entry.reference,
              debit: entry.debit,
              credit: entry.credit,
              runningBalance: entry.runningBalance,
            }))}
          />
        </div>
      </section>
    </main>
  );
}

function CurrencyChip({
  name,
  value,
  defaultChecked,
  label,
}: {
  name: string;
  value: string;
  defaultChecked: boolean;
  label: string;
}) {
  return (
    <label className="cursor-pointer">
      <input
        type="radio"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-muted px-3 text-sm font-medium text-fg peer-checked:border-transparent peer-checked:bg-judi-700 peer-checked:text-white dark:peer-checked:bg-judi-500 dark:peer-checked:text-judi-950">
        {label}
      </span>
    </label>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
  emphasize,
  compact,
}: {
  label: string;
  value: string;
  icon?: typeof Wallet;
  emphasize?: boolean;
  compact?: boolean;
}) {
  return (
    <article
      className={`rounded-xl border border-line text-start ${
        emphasize ? "bg-judi-50/80 dark:bg-judi-950/30" : "bg-muted/40"
      } ${compact ? "px-3 py-2" : "px-3 py-3"}`}
    >
      <div className="flex items-center gap-1.5">
        {Icon ? (
          <Icon
            className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
        ) : null}
        <p className="text-xs font-medium text-fg-subtle">{label}</p>
      </div>
      <p
        className={`mt-1 font-bold tabular-nums text-fg ${
          compact ? "text-sm" : "text-base sm:text-lg"
        }`}
      >
        {value}
      </p>
    </article>
  );
}
