import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { BrowserPrintButton } from "@/components/browser-print-button";
import { CollectionForm } from "@/components/collection-form";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";

export default async function FieldCollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string; storeId?: string }>;
}) {
  await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();
  const params = await searchParams;

  const stores = await prisma.store.findMany({
    orderBy: { storeName: "asc" },
    select: {
      id: true,
      storeName: true,
      ownerName: true,
      phone: true,
      currentDebt: true,
      currentDebtUsd: true,
      primaryMedia: { select: { url: true } },
    },
  });

  const successTx = params.ok
    ? await prisma.transaction.findUnique({
        where: { id: params.ok },
        include: { store: true },
      })
    : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="no-print flex flex-wrap items-start gap-3">
        <Link
          href="/field"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("field.back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="flex items-center gap-2 text-sm font-medium text-judi-800 dark:text-judi-200">
            <Wallet className="size-4 shrink-0" aria-hidden />
            {t("collection.title")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("collection.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("collection.subtitle")}</p>
        </div>
      </header>

      {successTx ? (
        <section className="receipt-print space-y-3 rounded-2xl border border-line bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-fg text-start">
            {t("collection.receiptTitle")}
          </h2>
          <dl className="space-y-1 text-sm text-fg">
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("collection.receiptNumber")}</dt>
              <dd className="font-medium tabular-nums">{successTx.receiptNumber}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("invoices.store")}</dt>
              <dd>{successTx.store.storeName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("collection.amount")}</dt>
              <dd className="font-semibold tabular-nums">
                {formatMoney(successTx.amount.toString(), successTx.currency)}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("collection.paymentMethod")}</dt>
              <dd>{t(`collection.methods.${successTx.paymentMethod}`)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-fg-muted">{t("invoices.date")}</dt>
              <dd className="tabular-nums">
                {successTx.createdAt.toISOString().slice(0, 16).replace("T", " ")}
              </dd>
            </div>
            {successTx.notes ? (
              <div className="flex justify-between gap-3">
                <dt className="text-fg-muted">{t("collection.notes")}</dt>
                <dd>{successTx.notes}</dd>
              </div>
            ) : null}
          </dl>
          <BrowserPrintButton label={t("invoices.printBrowser")} />
        </section>
      ) : null}

      <div className="no-print">
        <CollectionForm
          stores={stores.map((store) => ({
            id: store.id,
            storeName: store.storeName,
            ownerName: store.ownerName,
            phone: store.phone,
            currentDebt: store.currentDebt.toString(),
            currentDebtUsd: store.currentDebtUsd.toString(),
            primaryMediaUrl: store.primaryMedia?.url ?? null,
          }))}
          successId={params.ok}
          errorCode={params.error}
          surface="field"
          initialStoreId={params.storeId ?? null}
        />
      </div>
    </main>
  );
}
