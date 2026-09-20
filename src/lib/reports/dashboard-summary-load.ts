import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { type CurrencyCode } from "@/lib/money";
import { localized } from "@/lib/i18n";
import { rangeBounds } from "@/lib/reports/date";
import { summarizeDashboard } from "@/lib/reports/dashboard-summary";

async function loadDashboardSummaryUncached(input: {
  from: string;
  to: string;
  currency: CurrencyCode;
  locale: string;
}) {
  const { start, end } = rangeBounds(input.from, input.to);

  const [invoices, payments, stores] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        currency: input.currency,
        status: "COMPLETED",
        createdAt: { gte: start, lt: end },
      },
      select: {
        id: true,
        invoiceType: true,
        status: true,
        subTotal: true,
        totalAmount: true,
        createdAt: true,
        storeId: true,
        store: { select: { storeName: true } },
        items: {
          select: {
            productId: true,
            baseUnitQuantity: true,
            totalPrice: true,
            isGift: true,
            product: {
              select: { sku: true, name: true, baseCost: true },
            },
          },
        },
      },
    }),
    prisma.transaction.findMany({
      where: {
        currency: input.currency,
        type: { in: ["SALE_PAYMENT", "COLLECTION"] },
        createdAt: { gte: start, lt: end },
      },
      select: { amount: true, createdAt: true },
    }),
    prisma.store.findMany({
      select: {
        id: true,
        storeName: true,
        currentDebt: true,
        currentDebtUsd: true,
      },
    }),
  ]);

  return {
    dateRange: { from: input.from, to: input.to },
    currency: input.currency,
    ...summarizeDashboard({
      from: start,
      to: end,
      invoices: invoices.map((inv) => ({
        id: inv.id,
        invoiceType: inv.invoiceType,
        status: inv.status,
        subTotal: inv.subTotal.toString(),
        totalAmount: inv.totalAmount.toString(),
        createdAt: inv.createdAt,
        storeId: inv.storeId,
        storeName: inv.store.storeName,
        items: inv.items.map((item) => ({
          productId: item.productId,
          sku: item.product.sku,
          name: localized(item.product.name, input.locale),
          baseUnitQuantity: item.baseUnitQuantity.toString(),
          totalPrice: item.totalPrice.toString(),
          isGift: item.isGift,
          baseCost: item.product.baseCost.toString(),
        })),
      })),
      payments: payments.map((p) => ({
        amount: p.amount.toString(),
        createdAt: p.createdAt,
      })),
      storeDebts: stores.map((s) => ({
        storeId: s.id,
        storeName: s.storeName,
        debt: (input.currency === "USD" ? s.currentDebtUsd : s.currentDebt).toString(),
      })),
    }),
  };
}

export async function loadDashboardSummary(input: {
  from: string;
  to: string;
  currency: CurrencyCode;
  locale?: string;
}) {
  const locale = input.locale ?? "en";
  return unstable_cache(
    () =>
      loadDashboardSummaryUncached({
        from: input.from,
        to: input.to,
        currency: input.currency,
        locale,
      }),
    ["dashboard-summary", input.from, input.to, input.currency, locale],
    { revalidate: 20 },
  )();
}
