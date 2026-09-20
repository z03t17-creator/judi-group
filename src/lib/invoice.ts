import Decimal from "decimal.js";
import { canSellOnDebt } from "@/lib/credit";
import { type CurrencyCode } from "@/lib/money";
import { toBaseQuantity, toDecimal, type DecimalValue } from "@/lib/uom";

export const MONEY_DP = 2;

export type InvoiceKind = "CASH" | "DEBT";

export class InvoiceError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "InvoiceError";
    this.code = code;
  }
}

export function resolveUnitPrice(
  sellingPrice: DecimalValue,
  customPrice: DecimalValue | null | undefined,
): Decimal {
  if (customPrice != null && customPrice !== "") {
    return toDecimal(customPrice);
  }
  return toDecimal(sellingPrice);
}

export function pickUnitPrice(
  unit: { sellingPrice: DecimalValue; sellingPriceUsd: DecimalValue },
  custom: { customPrice?: DecimalValue | null; customPriceUsd?: DecimalValue | null } | null | undefined,
  currency: CurrencyCode,
): Decimal {
  if (currency === "USD") {
    return resolveUnitPrice(unit.sellingPriceUsd, custom?.customPriceUsd ?? null);
  }
  return resolveUnitPrice(unit.sellingPrice, custom?.customPrice ?? null);
}

export function lineTotal(quantity: DecimalValue, unitPrice: DecimalValue): Decimal {
  const qty = toDecimal(quantity);
  if (!qty.isFinite() || qty.lte(0)) {
    throw new InvoiceError("invalid_quantity", "Quantity must be a finite value greater than 0.");
  }
  return qty.times(unitPrice).toDecimalPlaces(MONEY_DP);
}

export function lineBaseQuantity(quantity: DecimalValue, conversionRatio: DecimalValue): Decimal {
  const qty = toDecimal(quantity);
  if (!qty.isFinite() || qty.lte(0)) {
    throw new InvoiceError("invalid_quantity", "Quantity must be a finite value greater than 0.");
  }
  return toBaseQuantity(qty, conversionRatio);
}

/** Sold + gift units that leave the van for one invoice line. */
export function lineStockQuantity(soldQty: DecimalValue, giftQty: DecimalValue = 0): Decimal {
  const sold = toDecimal(soldQty);
  const gift = toDecimal(giftQty);
  if (!sold.isFinite() || !gift.isFinite() || sold.lt(0) || gift.lt(0)) {
    throw new InvoiceError("invalid_quantity", "Quantity must be a finite value greater than 0.");
  }
  const total = sold.plus(gift);
  if (total.lte(0)) {
    throw new InvoiceError("invalid_quantity", "Quantity must be a finite value greater than 0.");
  }
  return total;
}

export function assertDiscountPercent(percent: DecimalValue, maxAllowed: DecimalValue): Decimal {
  const value = toDecimal(percent);
  const cap = toDecimal(maxAllowed);
  if (!value.isFinite() || value.lt(0) || value.gt(100)) {
    throw new InvoiceError("invalid_discount", "Discount percent must be between 0 and 100.");
  }
  if (!cap.isFinite() || cap.lt(0) || cap.gt(100)) {
    throw new InvoiceError("invalid_discount", "Discount cap must be between 0 and 100.");
  }
  if (value.gt(cap)) {
    throw new InvoiceError("discount_cap", "Discount exceeds the allowed cap.");
  }
  return value.toDecimalPlaces(MONEY_DP);
}

export function invoiceTotals(subTotal: DecimalValue, discountPercent: DecimalValue) {
  const sub = toDecimal(subTotal).toDecimalPlaces(MONEY_DP);
  if (sub.lt(0)) {
    throw new InvoiceError("invalid_quantity", "Subtotal must be >= 0.");
  }
  const percent = toDecimal(discountPercent);
  const discountAmount = sub.times(percent).div(100).toDecimalPlaces(MONEY_DP);
  const totalAmount = sub.minus(discountAmount).toDecimalPlaces(MONEY_DP);
  return { subTotal: sub, discountAmount, totalAmount };
}

export function splitPayment(type: InvoiceKind, total: DecimalValue) {
  const amount = toDecimal(total).toDecimalPlaces(MONEY_DP);
  if (type === "CASH") {
    return { paidAmount: amount, debtAmount: new Decimal(0) };
  }
  return { paidAmount: new Decimal(0), debtAmount: amount };
}

export function nextStoreDebt(
  currentDebt: DecimalValue,
  type: InvoiceKind,
  total: DecimalValue,
): Decimal {
  const debt = toDecimal(currentDebt).toDecimalPlaces(MONEY_DP);
  if (type === "CASH") {
    return debt;
  }
  return debt.plus(total).toDecimalPlaces(MONEY_DP);
}

/** Apply a return credit against AR — never goes below zero. */
export function nextStoreDebtAfterReturn(
  currentDebt: DecimalValue,
  returnTotal: DecimalValue,
): Decimal {
  const debt = toDecimal(currentDebt).toDecimalPlaces(MONEY_DP);
  const credit = toDecimal(returnTotal).toDecimalPlaces(MONEY_DP);
  if (!credit.isFinite() || credit.lt(0)) {
    throw new InvoiceError("invalid_quantity", "Return total must be >= 0.");
  }
  const next = debt.minus(credit).toDecimalPlaces(MONEY_DP);
  return next.lt(0) ? new Decimal(0) : next;
}

export function assertCanSellOnDebt(
  limit: DecimalValue,
  debt: DecimalValue,
  amount: DecimalValue,
): void {
  if (!canSellOnDebt(limit, debt, amount)) {
    throw new InvoiceError("credit_blocked", "This sale exceeds the store credit limit.");
  }
}

export type InvoiceNumberOptions = {
  /** Alphanumeric prefix (default INV). */
  prefix?: string;
  /** Zero-pad width for the numeric part (3–10, default 6). */
  padWidth?: number;
};

function sanitizePrefix(raw: string | undefined): string {
  const cleaned = (raw ?? "INV").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return cleaned.slice(0, 12) || "INV";
}

function clampPad(raw: number | undefined): number {
  if (raw == null || !Number.isFinite(raw)) return 6;
  return Math.min(10, Math.max(3, Math.round(raw)));
}

/** Next invoice number from the last one, using configurable prefix + pad. */
export function nextInvoiceNumber(
  lastNumber: string | null,
  options: InvoiceNumberOptions = {},
): string {
  const prefix = sanitizePrefix(options.prefix);
  const padWidth = clampPad(options.padWidth);
  const digits = lastNumber?.match(/(\d+)\s*$/)?.[1];
  const current = digits ? Number(digits) : 0;
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  return `${prefix}-${String(next).padStart(padWidth, "0")}`;
}
