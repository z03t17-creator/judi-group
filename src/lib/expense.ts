import { Prisma, type ExpenseCategory } from "@prisma/client";
import { toBaghdadYmd } from "@/lib/reports/date";
import type { DecimalValue } from "@/lib/uom";
import { toDecimal } from "@/lib/uom";

export const EXPENSE_CATEGORIES = [
  "RENT",
  "FUEL",
  "SALARIES",
  "SPOILAGE",
  "PURCHASE_FREIGHT",
  "OTHER",
] as const satisfies readonly ExpenseCategory[];

export type AppExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Parse YYYY-MM-DD into a UTC date suitable for Prisma `@db.Date`. */
export function parseExpenseDate(ymd: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (![y, m, d].every((n) => Number.isFinite(n))) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

export function expenseDateToYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Default filter window: first day of current Baghdad month → today. */
export function defaultExpensePeriod(): { from: string; to: string } {
  const to = toBaghdadYmd(new Date());
  const [y, m] = to.split("-");
  return { from: `${y}-${m}-01`, to };
}

export function normalizeExpenseCurrency(value: string | null | undefined): "IQD" | "USD" {
  return value === "USD" ? "USD" : "IQD";
}

/**
 * Create a PURCHASE_FREIGHT expense when receiving a supplier order
 * (optional side-cost — amount must be > 0).
 */
export async function createPurchaseFreightExpenseInTx(
  tx: Prisma.TransactionClient,
  input: {
    amount: DecimalValue;
    currency?: string | null;
    warehouseId: string;
    createdById: string;
    orderNumber: string;
    receiptNumber?: string | null;
    note?: string | null;
    date?: Date;
  },
) {
  const amount = toDecimal(input.amount);
  if (!amount.isFinite() || amount.lte(0)) return null;

  const currency = normalizeExpenseCurrency(input.currency);
  const date =
    input.date ??
    parseExpenseDate(toBaghdadYmd(new Date())) ??
    new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));

  const noteParts = [
    `Purchase freight · PO ${input.orderNumber}`,
    input.receiptNumber ? `PR ${input.receiptNumber}` : null,
    input.note?.trim() || null,
  ].filter(Boolean);

  return tx.expense.create({
    data: {
      date,
      category: "PURCHASE_FREIGHT",
      amount: new Prisma.Decimal(amount.toDecimalPlaces(2).toString()),
      currency,
      note: noteParts.join(" · "),
      warehouseId: input.warehouseId,
      createdById: input.createdById,
    },
  });
}
