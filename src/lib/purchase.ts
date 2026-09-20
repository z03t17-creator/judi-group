import Decimal from "decimal.js";
import { BASE_QTY_DP, toDecimal, type DecimalValue } from "@/lib/uom";

export class PurchaseError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PurchaseError";
    this.code = code;
  }
}

/** Cost per base unit = unitCost / conversionRatio. */
export function costPerBaseUnit(
  unitCost: DecimalValue,
  conversionRatio: DecimalValue,
): Decimal {
  const cost = toDecimal(unitCost);
  const ratio = toDecimal(conversionRatio);
  if (!cost.isFinite() || cost.lt(0)) {
    throw new PurchaseError("invalid_cost", "Unit cost must be a finite value >= 0.");
  }
  if (!ratio.isFinite() || ratio.lte(0)) {
    throw new PurchaseError("invalid_unit", "Conversion ratio must be a finite value > 0.");
  }
  return cost.div(ratio).toDecimalPlaces(BASE_QTY_DP);
}

/**
 * Weighted-average product base cost after receiving `receivedBaseQty` at `incomingCostPerBase`.
 * When on-hand is zero, the new cost is the incoming cost.
 */
export function weightedAverageBaseCost(
  currentBaseQty: DecimalValue,
  currentBaseCost: DecimalValue,
  receivedBaseQty: DecimalValue,
  incomingCostPerBase: DecimalValue,
): Decimal {
  const onHand = toDecimal(currentBaseQty);
  const oldCost = toDecimal(currentBaseCost);
  const incomingQty = toDecimal(receivedBaseQty);
  const incomingCost = toDecimal(incomingCostPerBase);

  if (!onHand.isFinite() || onHand.lt(0)) {
    throw new PurchaseError("invalid_quantity", "On-hand quantity must be finite and >= 0.");
  }
  if (!oldCost.isFinite() || oldCost.lt(0)) {
    throw new PurchaseError("invalid_cost", "Current base cost must be finite and >= 0.");
  }
  if (!incomingQty.isFinite() || incomingQty.lte(0)) {
    throw new PurchaseError("invalid_quantity", "Received quantity must be finite and > 0.");
  }
  if (!incomingCost.isFinite() || incomingCost.lt(0)) {
    throw new PurchaseError("invalid_cost", "Incoming cost must be finite and >= 0.");
  }

  if (onHand.eq(0)) {
    return incomingCost.toDecimalPlaces(BASE_QTY_DP);
  }

  const existingValue = onHand.times(oldCost);
  const incomingValue = incomingQty.times(incomingCost);
  const nextQty = onHand.plus(incomingQty);
  return existingValue.plus(incomingValue).div(nextQty).toDecimalPlaces(BASE_QTY_DP);
}

export function nextPurchaseOrderNumber(lastNumber: string | null): string {
  const current = lastNumber ? Number(lastNumber.replace(/^PO-/, "")) : 0;
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  return `PO-${String(next).padStart(6, "0")}`;
}

export function nextPurchaseReceiptNumber(lastNumber: string | null): string {
  const current = lastNumber ? Number(lastNumber.replace(/^PR-/, "")) : 0;
  const next = Number.isFinite(current) && current >= 0 ? current + 1 : 1;
  return `PR-${String(next).padStart(6, "0")}`;
}

/** Parse HTML date input (YYYY-MM-DD) as a UTC calendar date for Prisma @db.Date. */
export function parsePurchaseExpiryDate(value: string | null | undefined): Date | null {
  if (value == null) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const [y, m, d] = trimmed.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== m - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}
