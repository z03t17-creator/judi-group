import { CircleDollarSign } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { formatMoney } from "@/lib/money";
import { loadDebtsDirectory } from "@/lib/reports/debts-load";
import { requireOfficeSession } from "@/lib/rbac";
import { COLLECTOR_ROLES } from "@/lib/constants";
import { DebtsDirectory } from "./debts-directory";

export default async function OfficeDebtsPage() {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const { stores, summary } = await loadDebtsDirectory();
  const canCollect = (COLLECTOR_ROLES as readonly string[]).includes(session.user.role);

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-lg tone-rose">
          <CircleDollarSign className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("debts.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("debts.subtitle")}</p>
        </div>
      </header>

      <section className="kpi-grid" aria-label={t("debts.kpiSection")}>
        <KpiCard
          label={t("debts.totalIqd")}
          value={formatMoney(summary.totalIqd, "IQD")}
        />
        <KpiCard
          label={t("debts.totalUsd")}
          value={formatMoney(summary.totalUsd, "USD")}
        />
        <KpiCard
          label={t("debts.withDebt")}
          value={String(summary.withDebtCount)}
        />
        <KpiCard
          label={t("debts.overLimit")}
          value={String(summary.overLimitCount)}
        />
      </section>

      <section className="space-y-3" aria-labelledby="debts-list-heading">
        <div className="text-start">
          <h2 id="debts-list-heading" className="text-lg font-semibold text-fg">
            {t("debts.listTitle")}
          </h2>
        </div>
        <DebtsDirectory canCollect={canCollect} stores={stores} />
      </section>
    </main>
  );
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="surface-panel p-4 text-start">
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-fg">
        {value}
      </p>
    </article>
  );
}
