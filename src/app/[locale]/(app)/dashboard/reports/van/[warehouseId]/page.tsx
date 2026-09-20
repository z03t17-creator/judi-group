import {
  BarChart3,
  CalendarRange,
  CheckCircle2,
  CircleAlert,
  Truck,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Thumb } from "@/components/thumb";
import { requireOfficeSession } from "@/lib/rbac";
import { loadVanReconciliation } from "@/lib/reports/van-reconciliation-load";
import { toBaghdadYmd } from "@/lib/reports/date";
import { VanReconTable } from "./van-recon-table";

export default async function VanReconPage({
  params,
  searchParams,
}: {
  params: Promise<{ warehouseId: string }>;
  searchParams: Promise<{ date?: string; ok?: string; error?: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const { warehouseId } = await params;
  const query = await searchParams;

  const date =
    query.date && /^\d{4}-\d{2}-\d{2}$/.test(query.date)
      ? query.date
      : toBaghdadYmd(new Date());

  const report = await loadVanReconciliation({ vanId: warehouseId, date, locale });
  if (!report) {
    return (
      <main className="mx-auto w-full max-w-content space-y-4">
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {t("reports.vanNotFound")}
        </p>
        <Link
          href="/dashboard/reports"
          className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
        >
          <BarChart3 className="size-4" aria-hidden />
          {t("nav.reports")}
        </Link>
      </main>
    );
  }

  const canEdit =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const mismatchCount = report.auditItems.filter(
    (item) => Number(item.discrepancy) !== 0,
  ).length;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <Thumb kind="warehouse" size="lg" icon={Truck} alt={report.warehouseName} />
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-medium text-judi-800 dark:text-judi-200">
            {t("reports.vanReconciliation")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {report.warehouseName}
          </h1>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-muted">
            {report.licensePlate ? (
              <span className="tabular-nums" dir="ltr">
                {report.licensePlate}
              </span>
            ) : null}
            {report.licensePlate ? (
              <span aria-hidden className="text-line-strong">
                ·
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <Thumb
                kind="person"
                size="xs"
                src={report.driverMediaUrl}
                alt={report.driverName ?? ""}
              />
              {report.driverName
                ? t("reports.driver", { name: report.driverName })
                : t("reports.noDriver")}
            </span>
          </p>
        </div>
        <Link
          href="/dashboard/reports"
          className="btn btn-regular"
        >
          <BarChart3 className="size-4" aria-hidden />
          {t("nav.reports")}
        </Link>
      </header>

      {query.ok ? (
        <p
          className="flex items-start gap-2 rounded-2xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 dark:border-judi-800 dark:bg-judi-950/40 dark:text-judi-100"
          role="status"
        >
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("reports.countsSaved")}
        </p>
      ) : null}
      {query.error ? (
        <p
          className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("common.error")}
        </p>
      ) : null}

      <form method="get" className="space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
        <div className="flex items-start gap-2 text-start">
          <CalendarRange
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-fg">{t("reports.reconDate")}</h2>
            <p className="text-xs text-fg-muted">{t("reports.reconDateHint")}</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
          <label className="block space-y-1.5 text-start">
            <span className="text-sm font-medium text-fg">{t("reports.reconDate")}</span>
            <input
              type="date"
              name="date"
              defaultValue={date}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-fg focus:border-judi-500 focus:bg-surface"
            />
          </label>
          <div className="hidden items-end sm:flex">
            <button
              type="submit"
              className="btn btn-important"
            >
              {t("reports.apply")}
            </button>
          </div>
        </div>
        <div className="sticky-form-actions -mx-3 sm:hidden sm:-mx-4">
          <button
            type="submit"
            className="btn btn-important w-full"
          >
            {t("reports.apply")}
          </button>
        </div>
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Metric
          label={t("reports.reconProducts")}
          value={String(report.auditItems.length)}
        />
        <Metric
          label={t("reports.reconMatched")}
          value={String(report.auditItems.length - mismatchCount)}
        />
        <Metric
          label={t("reports.reconMismatches")}
          value={String(mismatchCount)}
          emphasize={mismatchCount > 0}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      <VanReconTable
        warehouseId={warehouseId}
        auditDate={date}
        canEdit={canEdit}
        rows={report.auditItems.map((item) => ({
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          primaryMediaUrl: item.primaryMediaUrl,
          openingQty: item.openingQty,
          loadedQty: item.loadedQty,
          soldQty: item.soldQty,
          giftQty: item.giftQty,
          returnedQty: item.returnedQty,
          expectedClosingQty: item.expectedClosingQty,
          actualClosingQty: item.actualClosingQty,
          discrepancy: item.discrepancy,
        }))}
      />
    </main>
  );
}

function Metric({
  label,
  value,
  emphasize,
  className = "",
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  className?: string;
}) {
  return (
    <article
      className={`rounded-xl border border-line px-3 py-3 text-start ${
        emphasize ? "bg-amber-50/80 dark:bg-amber-950/30" : "bg-muted/40"
      } ${className}`}
    >
      <p className="text-xs font-medium text-fg-subtle">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums text-fg">{value}</p>
    </article>
  );
}
