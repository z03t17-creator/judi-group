import { FilePlus2, FileText } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { toBaghdadYmd } from "@/lib/reports/date";
import { InvoicesDirectory, type InvoiceListItem } from "./invoices-directory";
import { iconBadge } from "@/lib/ui-tones";

export default async function OfficeInvoicesPage() {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const canCreate =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      invoiceNumber: true,
      storeId: true,
      invoiceType: true,
      status: true,
      currency: true,
      totalAmount: true,
      paidAmount: true,
      debtAmount: true,
      createdAt: true,
      store: {
        select: {
          storeName: true,
          phone: true,
          primaryMedia: { select: { url: true } },
        },
      },
      warehouse: { select: { name: true } },
      createdBy: { select: { fullName: true } },
    },
  });

  const items: InvoiceListItem[] = invoices.map((invoice) => ({
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    storeId: invoice.storeId,
    storeName: invoice.store.storeName,
    storeThumbUrl: invoice.store.primaryMedia?.url ?? null,
    storePhone: invoice.store.phone,
    warehouseName: localized(invoice.warehouse.name, locale),
    delegateName: invoice.createdBy.fullName,
    invoiceType: invoice.invoiceType,
    status: invoice.status,
    currency: invoice.currency,
    totalLabel: formatMoney(invoice.totalAmount.toString(), invoice.currency),
    paidLabel: formatMoney(invoice.paidAmount.toString(), invoice.currency),
    debtLabel: formatMoney(invoice.debtAmount.toString(), invoice.currency),
    debtAmount: invoice.debtAmount.toString(),
    dateYmd: toBaghdadYmd(invoice.createdAt),
  }));

  const today = toBaghdadYmd(new Date());
  const todayRows = invoices.filter((invoice) => toBaghdadYmd(invoice.createdAt) === today);
  const todayIqd = todayRows
    .filter((invoice) => invoice.currency === "IQD")
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);
  const todayUsd = todayRows
    .filter((invoice) => invoice.currency === "USD")
    .reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0);

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className={iconBadge("sky")}>
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("invoices.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("invoices.subtitle")}</p>
        </div>
        {canCreate ? (
          <Link
            href="/dashboard/invoices/new"
            className="btn btn-important"
          >
            <FilePlus2 className="size-4 shrink-0" aria-hidden />
            {t("invoices.create")}
          </Link>
        ) : null}
      </header>

      <section className="kpi-grid" aria-label={t("invoices.today")}>
        <KpiCard
          label={t("invoices.todayCount")}
          value={String(todayRows.length)}
          tone="sky"
        />
        <KpiCard
          label={t("invoices.todayIqd")}
          value={formatMoney(todayIqd, "IQD")}
          tone="teal"
        />
        <KpiCard
          label={t("invoices.todayUsd")}
          value={formatMoney(todayUsd, "USD")}
          tone="emerald"
        />
      </section>

      <InvoicesDirectory invoices={items} canCreate={canCreate} />
    </main>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "sky" | "teal" | "emerald";
}) {
  return (
    <article className={`rounded-2xl border p-4 text-start shadow-sm card-tone-${tone}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-fg" dir="ltr">
        {value}
      </p>
    </article>
  );
}
