import { ArrowLeft, Camera } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { InvoiceDocument, type InvoiceDocumentLine } from "@/components/invoice-document";
import { InvoiceShareBar } from "@/components/invoice-share";
import { MediaGallery } from "@/components/media-gallery";
import { PrintReceiptButtons } from "@/components/print-receipt-buttons";
import {
  companyDisplayName,
  companyTagline,
  getCompanyProfile,
} from "@/lib/company-profile";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { groupInvoiceLines, thermalQuantityLabel } from "@/lib/invoice-view";
import { formatMoney, formatNumber } from "@/lib/money";
import { toBaghdadYmd } from "@/lib/reports/date";

export default async function OfficeInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const canCreate =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";
  const company = await getCompanyProfile();
  const companyName = companyDisplayName(company, locale);

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      store: { include: { primaryMedia: { select: { url: true } } } },
      warehouse: true,
      createdBy: { include: { primaryMedia: { select: { url: true } } } },
      items: {
        include: {
          product: { include: { primaryMedia: { select: { url: true } } } },
          productUnit: true,
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const currency = invoice.currency;
  const typeLabel = t(`invoices.types.${invoice.invoiceType}`);
  const grouped = groupInvoiceLines(
    invoice.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productUnitId: item.productUnitId,
      quantity: item.quantity.toString(),
      isGift: item.isGift,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
      productName: localized(item.product.name, locale),
      sku: item.product.sku,
      unitName: localized(item.productUnit.unitName, locale),
      productThumbUrl: item.product.primaryMedia?.url ?? null,
    })),
  );

  const lines: InvoiceDocumentLine[] = grouped.lines.map((line) => ({
    id: line.id,
    productName: line.productName,
    sku: line.sku,
    unitName: line.unitName,
    soldQty: line.soldQty,
    giftQty: line.giftQty,
    unitPriceLabel: formatMoney(line.unitPrice, currency),
    lineTotalLabel: formatMoney(line.lineTotal, currency),
    productThumbUrl: line.productThumbUrl,
  }));
  const giftQtyTotal = grouped.giftQtyTotal;

  const receipt = {
    brand: companyName,
    invoiceNumber: invoice.invoiceNumber,
    storeName: invoice.store.storeName,
    invoiceType: typeLabel,
    currency,
    lines: lines.map((line) => ({
      name: `${line.productName} ${line.unitName}`,
      quantity: thermalQuantityLabel(
        line.soldQty,
        line.giftQty,
        t("invoices.giftQty", { qty: formatNumber(line.giftQty) }),
        formatNumber,
      ),
      total: line.lineTotalLabel,
    })),
    subTotal: formatMoney(invoice.subTotal.toString(), currency),
    discountAmount: formatMoney(invoice.discountAmount.toString(), currency),
    totalAmount: formatMoney(invoice.totalAmount.toString(), currency),
    paidAmount: formatMoney(invoice.paidAmount.toString(), currency),
    debtAmount: formatMoney(invoice.debtAmount.toString(), currency),
  };

  const thermalLabels = {
    subtotal: t("invoices.subtotal"),
    discount: t("invoices.discountAmount"),
    total: t("invoices.total"),
    paid: t("invoices.paid"),
    debt: t("invoices.debt"),
  };

  const sharePayload = {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    storeName: invoice.store.storeName,
    storePhone: invoice.store.phone,
    invoiceType: invoice.invoiceType,
    dateYmd: toBaghdadYmd(invoice.createdAt),
    totalLabel: formatMoney(invoice.totalAmount.toString(), currency),
    paidLabel: formatMoney(invoice.paidAmount.toString(), currency),
    debtLabel: formatMoney(invoice.debtAmount.toString(), currency),
  };

  return (
    <main className="mx-auto w-full max-w-content space-y-4 pb-28 lg:pb-4">
      <header className="no-print flex flex-wrap items-start gap-3">
        <Link
          href="/dashboard/invoices"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("invoices.backToList")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-medium text-judi-800 dark:text-judi-200">
            {t("invoices.detailTitle")}
          </p>
          <h1 className="text-xl font-bold tabular-nums tracking-tight text-fg sm:text-2xl">
            {invoice.invoiceNumber}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {invoice.store.storeName} · {toBaghdadYmd(invoice.createdAt)}
          </p>
        </div>
        <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
          {canCreate ? (
            <Link
              href="/dashboard/invoices/new"
              className="btn btn-important"
            >
              {t("invoices.another")}
            </Link>
          ) : null}
          <InvoiceShareBar payload={sharePayload} />
          <PrintReceiptButtons receipt={receipt} labels={thermalLabels} />
        </div>
      </header>

      <InvoiceDocument
        invoice={{
          invoiceNumber: invoice.invoiceNumber,
          invoiceType: invoice.invoiceType,
          status: invoice.status,
          currency,
          dateYmd: toBaghdadYmd(invoice.createdAt),
          warehouseName: localized(invoice.warehouse.name, locale),
          storeName: invoice.store.storeName,
          storeThumbUrl: invoice.store.primaryMedia?.url ?? null,
          storePhone: invoice.store.phone,
          storeAddress: invoice.store.address,
          delegateName: invoice.createdBy.fullName,
          delegateThumbUrl: invoice.createdBy.primaryMedia?.url ?? null,
          lines,
          subTotalLabel: formatMoney(invoice.subTotal.toString(), currency),
          discountPercent: invoice.discountPercent.toString(),
          discountAmountLabel: formatMoney(invoice.discountAmount.toString(), currency),
          totalAmountLabel: formatMoney(invoice.totalAmount.toString(), currency),
          paidAmountLabel: formatMoney(invoice.paidAmount.toString(), currency),
          debtAmountLabel: formatMoney(invoice.debtAmount.toString(), currency),
          giftQtyTotal: giftQtyTotal.toString(),
          companyName,
          companyTagline: companyTagline(company, locale),
          companyAddress: company.address,
          companyPhone: company.phone,
          companyTaxId: company.taxId,
          companyLogoUrl: company.logoUrl,
        }}
      />

      <section className="no-print surface-panel space-y-3 p-3 sm:p-4">
        <div className="flex items-start gap-2 text-start">
          <Camera
            className="mt-0.5 size-5 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold text-fg">{t("invoices.proofPhotos")}</h2>
            <p className="text-sm text-fg-muted">{t("invoices.proofPhotosHint")}</p>
          </div>
        </div>
        <MediaGallery kind="STOCK" entityType="Invoice" entityId={invoice.id} />
      </section>

      <div className="sticky-form-actions no-print flex flex-col gap-2 md:hidden">
        <div className="min-w-0 text-start">
          <p className="text-xs font-medium text-fg-subtle">{t("invoices.grandTotal")}</p>
          <p className="truncate text-lg font-bold tabular-nums text-fg">
            {formatMoney(invoice.totalAmount.toString(), currency)}
          </p>
        </div>
        <InvoiceShareBar payload={sharePayload} />
        <PrintReceiptButtons receipt={receipt} labels={thermalLabels} />
        {canCreate ? (
          <Link
            href="/dashboard/invoices/new"
            className="btn btn-important w-full"
          >
            {t("invoices.another")}
          </Link>
        ) : null}
      </div>
    </main>
  );
}
