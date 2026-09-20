import {
  AlertCircle,
  CheckCircle2,
  Receipt,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import {
  defaultExpensePeriod,
  expenseDateToYmd,
  parseExpenseDate,
} from "@/lib/expense";
import {
  ExpensesDirectory,
  type ExpenseRow,
} from "./expenses-directory";
import { ExpensesPeriodForm } from "./expenses-period-form";

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    focus?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const defaults = defaultExpensePeriod();
  const from =
    typeof params.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
      ? params.from
      : defaults.from;
  const to =
    typeof params.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.to)
      ? params.to
      : defaults.to;
  const rangeFrom = from <= to ? from : to;
  const rangeTo = from <= to ? to : from;
  const dateFrom = parseExpenseDate(rangeFrom);
  const dateTo = parseExpenseDate(rangeTo);

  const [expenses, products, warehouses, stores] = await Promise.all([
    prisma.expense.findMany({
      where:
        dateFrom && dateTo
          ? { date: { gte: dateFrom, lte: dateTo } }
          : undefined,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: {
        product: { select: { sku: true, name: true } },
        warehouse: { select: { name: true } },
        store: { select: { storeName: true } },
        stockLot: { select: { lotCode: true, expiryDate: true } },
        createdBy: { select: { fullName: true } },
      },
    }),
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      select: { id: true, sku: true, name: true },
    }),
    prisma.warehouse.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    prisma.store.findMany({
      orderBy: { storeName: "asc" },
      select: { id: true, storeName: true },
    }),
  ]);

  const proofByExpense = new Map<string, string>();
  if (expenses.length > 0) {
    const proofs = await prisma.mediaAsset.findMany({
      where: {
        entityType: "Expense",
        entityId: { in: expenses.map((row) => row.id) },
        kind: "STOCK",
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: { entityId: true, url: true },
    });
    for (const proof of proofs) {
      if (!proofByExpense.has(proof.entityId)) {
        proofByExpense.set(proof.entityId, proof.url);
      }
    }
  }

  const rows: ExpenseRow[] = expenses.map((row) => {
    const productLabel = row.product
      ? `${row.product.sku} — ${localized(row.product.name as LocalizedText, locale)}`
      : null;
    const lotLabel = row.stockLot
      ? [
          row.stockLot.lotCode ? `lot ${row.stockLot.lotCode}` : "lot",
          row.stockLot.expiryDate
            ? `exp ${expenseDateToYmd(row.stockLot.expiryDate)}`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

    return {
      id: row.id,
      dateYmd: expenseDateToYmd(row.date),
      category: row.category,
      amount: row.amount.toString(),
      currency: row.currency,
      amountLabel: formatMoney(row.amount.toString(), row.currency),
      note: row.note,
      productId: row.productId,
      productLabel,
      warehouseId: row.warehouseId,
      warehouseLabel: row.warehouse
        ? localized(row.warehouse.name as LocalizedText, locale)
        : null,
      storeId: row.storeId,
      storeLabel: row.store?.storeName ?? null,
      stockLotId: row.stockLotId,
      lotLabel,
      createdByName: row.createdBy.fullName,
      primaryMediaUrl: proofByExpense.get(row.id) ?? null,
      stockLinked: Boolean(row.productId || row.stockLotId || row.warehouseId || row.storeId),
    };
  });

  const periodIqd = rows
    .filter((row) => row.currency === "IQD")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const periodUsd = rows
    .filter((row) => row.currency === "USD")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const spoilageCount = rows.filter((row) => row.category === "SPOILAGE").length;
  const freightCount = rows.filter((row) => row.category === "PURCHASE_FREIGHT").length;

  const errorMessage =
    params.error === "not_found"
      ? t("expenses.notFound")
      : params.error
        ? t("common.error")
        : null;

  const okMessage =
    params.ok === "updated"
      ? t("expenses.updated")
      : params.ok === "deleted"
        ? t("expenses.deleted")
        : params.ok === "created"
          ? t("expenses.created")
          : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-rose">
          <Receipt className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("expenses.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("expenses.subtitle")}</p>
        </div>
      </header>

      {errorMessage ? (
        <p
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </p>
      ) : null}
      {okMessage ? (
        <p className="flex items-start gap-3 rounded-2xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 text-start dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{okMessage}</span>
        </p>
      ) : null}

      <ExpensesPeriodForm from={rangeFrom} to={rangeTo} />

      <section
        className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
        aria-label={t("expenses.kpisTitle")}
      >
        <KpiCard label={t("expenses.kpiIqd")} value={formatMoney(periodIqd, "IQD")} />
        <KpiCard label={t("expenses.kpiUsd")} value={formatMoney(periodUsd, "USD")} />
        <KpiCard label={t("expenses.kpiCount")} value={String(rows.length)} />
        <KpiCard
          label={t("expenses.kpiLinked")}
          value={t("expenses.kpiLinkedValue", {
            spoilage: spoilageCount,
            freight: freightCount,
          })}
        />
      </section>

      <ExpensesDirectory
        canManage={canManage}
        focusId={typeof params.focus === "string" ? params.focus : null}
        products={products.map((product) => ({
          id: product.id,
          label: `${product.sku} — ${localized(product.name as LocalizedText, locale)}`,
        }))}
        warehouses={warehouses.map((warehouse) => ({
          id: warehouse.id,
          label: localized(warehouse.name as LocalizedText, locale),
        }))}
        stores={stores.map((store) => ({
          id: store.id,
          label: store.storeName,
        }))}
        expenses={rows}
      />
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
