import Decimal from "decimal.js";
import { MONEY_DP } from "@/lib/invoice";
import { toDecimal, type DecimalValue } from "@/lib/uom";

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHECK"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export class CollectionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "CollectionError";
    this.code = code;
  }
}

export function nextReceiptNumber(lastNumber: string | null): string {
  const current = lastNumber ? Number(lastNumber.replace(/^TRX-/, "")) : 0;
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  return `TRX-${String(next).padStart(6, "0")}`;
}

export function assertCollectionAmount(debt: DecimalValue, amount: DecimalValue): Decimal {
  const debtValue = toDecimal(debt).toDecimalPlaces(MONEY_DP);
  const pay = toDecimal(amount).toDecimalPlaces(MONEY_DP);

  if (!pay.isFinite() || pay.lte(0)) {
    throw new CollectionError("invalid_amount", "Collection amount must be greater than zero.");
  }
  if (!debtValue.isFinite() || debtValue.lt(0)) {
    throw new CollectionError("invalid_debt", "Store debt must be a finite value >= 0.");
  }
  if (debtValue.lte(0)) {
    throw new CollectionError("no_debt", "This store has no outstanding debt in this currency.");
  }
  if (pay.gt(debtValue)) {
    throw new CollectionError("overpay", "Collection amount exceeds the outstanding debt.");
  }

  return pay;
}

export function nextDebtAfterCollection(debt: DecimalValue, amount: DecimalValue): Decimal {
  const pay = assertCollectionAmount(debt, amount);
  return toDecimal(debt).minus(pay).toDecimalPlaces(MONEY_DP);
}

export function isPaymentMethod(value: string): value is PaymentMethod {
  return (PAYMENT_METHODS as readonly string[]).includes(value);
}

export type CollectionActionResult =
  | { ok: true; transactionId: string }
  | { ok: false; error: string };
