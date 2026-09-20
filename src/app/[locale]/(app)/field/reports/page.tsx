import { ArrowLeft, BarChart3 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { loadFieldActivity, shiftYmd } from "@/lib/field-activity-load";
import { toBaghdadYmd } from "@/lib/reports/date";
import { requireRole } from "@/lib/rbac";
import { FieldReportsDirectory } from "./field-reports-directory";

export default async function FieldReportsPage() {
  const session = await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();
  const locale = await getLocale();
  const today = toBaghdadYmd(new Date());
  const from = shiftYmd(today, -89);

  const activity = await loadFieldActivity({
    userId: session.user.id,
    warehouseId: session.user.warehouseId,
    fromYmd: from,
    toYmd: today,
    locale,
  });

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          href="/field/more"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("field.back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="flex items-center gap-2 text-sm font-medium text-judi-800 dark:text-judi-200">
            <BarChart3 className="size-4 shrink-0" aria-hidden />
            {t("field.reportsTitle")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.reportsTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.reportsSubtitle")}</p>
        </div>
      </header>

      <FieldReportsDirectory
        invoices={activity.invoices}
        collections={activity.collections}
        todayYmd={today}
      />
    </main>
  );
}
