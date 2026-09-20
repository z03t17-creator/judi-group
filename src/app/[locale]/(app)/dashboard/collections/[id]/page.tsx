import { ArrowLeft, Camera } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import {
  CollectionReceipt,
  type CollectionReceiptData,
} from "@/components/collection-receipt";
import { MediaGallery } from "@/components/media-gallery";
import { PrintReceiptButtons } from "@/components/print-receipt-buttons";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { isPaymentMethod } from "@/lib/collection";
import { formatMoney } from "@/lib/money";
import { toBaghdadYmd } from "@/lib/reports/date";

export default async function OfficeCollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ recorded?: string; error?: string }>;
}) {
  await requireRole(["ADMIN", "COLLECTOR_ACCOUNTANT"]);
  const t = await getTranslations();
  const { id } = await params;
  const query = await searchParams;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      store: { include: { primaryMedia: { select: { url: true } } } },
      recordedBy: { include: { primaryMedia: { select: { url: true } } } },
    },
  });

  if (!transaction || transaction.type !== "COLLECTION") {
    notFound();
  }

  const methodKnown = isPaymentMethod(transaction.paymentMethod)
    ? transaction.paymentMethod
    : null;
  const methodLabel = methodKnown
    ? t(`collection.methods.${methodKnown}`)
    : transaction.paymentMethod;
  const amountLabel = formatMoney(transaction.amount.toString(), transaction.currency);

  const receipt: CollectionReceiptData = {
    receiptNumber: transaction.receiptNumber,
    paymentMethod: transaction.paymentMethod,
    currency: transaction.currency,
    dateYmd: toBaghdadYmd(transaction.createdAt),
    amountLabel,
    storeName: transaction.store.storeName,
    storeThumbUrl: transaction.store.primaryMedia?.url ?? null,
    storePhone: transaction.store.phone,
    storeAddress: transaction.store.address,
    collectorName: transaction.recordedBy.fullName,
    collectorThumbUrl: transaction.recordedBy.primaryMedia?.url ?? null,
    notes: transaction.notes,
    outstandingIqdLabel: formatMoney(transaction.store.currentDebt.toString(), "IQD"),
    outstandingUsdLabel: formatMoney(transaction.store.currentDebtUsd.toString(), "USD"),
  };

  const thermalReceipt = {
    brand: t("app.name"),
    invoiceNumber: transaction.receiptNumber,
    storeName: transaction.store.storeName,
    invoiceType: methodLabel,
    currency: transaction.currency,
    lines: [
      {
        name: t("collection.receiptTitle"),
        quantity: "1",
        total: amountLabel,
      },
    ],
    subTotal: amountLabel,
    discountAmount: formatMoney(0, transaction.currency),
    totalAmount: amountLabel,
    paidAmount: amountLabel,
    debtAmount: formatMoney(
      transaction.currency === "USD"
        ? transaction.store.currentDebtUsd.toString()
        : transaction.store.currentDebt.toString(),
      transaction.currency,
    ),
  };

  const thermalLabels = {
    subtotal: t("collection.amount"),
    discount: t("invoices.discountAmount"),
    total: t("invoices.total"),
    paid: t("invoices.paid"),
    debt: t("collection.remaining"),
  };

  return (
    <main className="mx-auto w-full max-w-content space-y-4 pb-28 lg:pb-4">
      <header className="no-print flex flex-wrap items-start gap-3">
        <Link
          href="/dashboard/collections"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("collection.backToList")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-medium text-judi-800 dark:text-judi-200">
            {t("collection.detailTitle")}
          </p>
          <h1 className="text-xl font-bold tabular-nums tracking-tight text-fg sm:text-2xl">
            {transaction.receiptNumber}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {transaction.store.storeName} · {toBaghdadYmd(transaction.createdAt)}
          </p>
        </div>
        <div className="hidden md:block">
          <PrintReceiptButtons receipt={thermalReceipt} labels={thermalLabels} />
        </div>
      </header>

      {query.recorded ? (
        <p
          className="no-print rounded-xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-950 text-start dark:border-judi-800 dark:bg-judi-950/40 dark:text-judi-100"
          role="status"
        >
          {t("collection.recorded")}
        </p>
      ) : null}
      {query.error === "upload_failed" ? (
        <p
          className="no-print rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 text-start dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {t("collection.uploadFailed")}
        </p>
      ) : null}

      <CollectionReceipt receipt={receipt} />

      <section className="no-print surface-panel space-y-3 p-3 sm:p-4">
        <div className="flex items-start gap-2 text-start">
          <Camera
            className="mt-0.5 size-5 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold text-fg">{t("collection.proofPhotos")}</h2>
            <p className="text-sm text-fg-muted">{t("collection.proofPhotosHint")}</p>
          </div>
        </div>
        <MediaGallery
          kind="STOCK"
          entityType="Transaction"
          entityId={transaction.id}
        />
      </section>

      <div className="sticky-form-actions no-print flex flex-col gap-2 md:hidden">
        <div className="min-w-0 text-start">
          <p className="text-xs font-medium text-fg-subtle">{t("collection.amount")}</p>
          <p className="truncate text-lg font-bold tabular-nums text-fg">{amountLabel}</p>
        </div>
        <PrintReceiptButtons receipt={thermalReceipt} labels={thermalLabels} />
      </div>
    </main>
  );
}
