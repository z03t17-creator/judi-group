import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { rangeBounds, toBaghdadYmd } from "@/lib/reports/date";

/** Shift a YYYY-MM-DD calendar date by whole days (Baghdad business calendar). */
export function shiftYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Invalid date: ${ymd}`);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export type FieldActivityInvoice = {
  id: string;
  invoiceNumber: string;
  storeId: string;
  storeName: string;
  storeThumbUrl: string | null;
  invoiceType: "CASH" | "DEBT" | "GIFT_PROMOTION" | "RETURN";
  currency: string;
  totalAmount: string;
  totalLabel: string;
  dateYmd: string;
  createdAtIso: string;
};

export type FieldActivityCollection = {
  id: string;
  receiptNumber: string;
  storeId: string;
  storeName: string;
  storeThumbUrl: string | null;
  currency: string;
  amount: string;
  amountLabel: string;
  paymentMethod: string;
  dateYmd: string;
  createdAtIso: string;
};

export type FieldActivityStockMove = {
  id: string;
  type:
    | "RECEIVE"
    | "WRITE_OFF"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "SALE"
    | "GIFT"
    | "RETURN"
    | "STORE_OUT"
    | "STORE_IN";
  productLabel: string;
  productThumbUrl: string | null;
  qtyLabel: string;
  notes: string | null;
  dateYmd: string;
  createdAtIso: string;
};

/**
 * Load the signed-in delegate’s invoices, collections, and van stock movements
 * for a Baghdad date window (inclusive from / exclusive end-of-to).
 */
export async function loadFieldActivity(input: {
  userId: string;
  warehouseId: string | null;
  fromYmd: string;
  toYmd: string;
  locale: string;
}) {
  const { start, end } = rangeBounds(input.fromYmd, input.toYmd);

  const [invoices, collections, stockMoves] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        createdById: input.userId,
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
      include: {
        store: { include: { primaryMedia: { select: { url: true } } } },
      },
    }),
    prisma.transaction.findMany({
      where: {
        recordedById: input.userId,
        type: "COLLECTION",
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "desc" },
      include: {
        store: { include: { primaryMedia: { select: { url: true } } } },
      },
    }),
    input.warehouseId
      ? prisma.stockMovement.findMany({
          where: {
            warehouseId: input.warehouseId,
            createdAt: { gte: start, lt: end },
            type: {
              in: [
                "RECEIVE",
                "WRITE_OFF",
                "TRANSFER_IN",
                "TRANSFER_OUT",
                "STORE_OUT",
                "STORE_IN",
              ],
            },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
          include: {
            product: { include: { primaryMedia: { select: { url: true } } } },
            productUnit: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const invoiceRows: FieldActivityInvoice[] = invoices.map((row) => ({
    id: row.id,
    invoiceNumber: row.invoiceNumber,
    storeId: row.storeId,
    storeName: row.store.storeName,
    storeThumbUrl: row.store.primaryMedia?.url ?? null,
    invoiceType: row.invoiceType,
    currency: row.currency,
    totalAmount: row.totalAmount.toString(),
    totalLabel: formatMoney(row.totalAmount.toString(), row.currency),
    dateYmd: toBaghdadYmd(row.createdAt),
    createdAtIso: row.createdAt.toISOString(),
  }));

  const collectionRows: FieldActivityCollection[] = collections.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    storeId: row.storeId,
    storeName: row.store.storeName,
    storeThumbUrl: row.store.primaryMedia?.url ?? null,
    currency: row.currency,
    amount: row.amount.toString(),
    amountLabel: formatMoney(row.amount.toString(), row.currency),
    paymentMethod: row.paymentMethod,
    dateYmd: toBaghdadYmd(row.createdAt),
    createdAtIso: row.createdAt.toISOString(),
  }));

  const stockRows: FieldActivityStockMove[] = stockMoves.map((row) => ({
    id: row.id,
    type: row.type,
    productLabel: localized(row.product.name, input.locale),
    productThumbUrl: row.product.primaryMedia?.url ?? null,
    qtyLabel: `${row.quantity.toString()} ${localized(row.productUnit.unitName, input.locale)}`,
    notes: row.notes,
    dateYmd: toBaghdadYmd(row.createdAt),
    createdAtIso: row.createdAt.toISOString(),
  }));

  return { invoices: invoiceRows, collections: collectionRows, stockMoves: stockRows };
}
