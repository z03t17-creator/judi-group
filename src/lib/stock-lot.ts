import Decimal from "decimal.js";
import { BASE_QTY_DP, toDecimal, type DecimalValue } from "@/lib/uom";
import { StockError } from "@/lib/stock";

export const EXPIRY_ALERT_WINDOWS_DAYS = [7, 14, 30] as const;
export type ExpiryAlertWindow = (typeof EXPIRY_ALERT_WINDOWS_DAYS)[number] | "expired";

export type LotLocation = {
  warehouseId?: string | null;
  storeId?: string | null;
};

export type LotIdentity = LotLocation & {
  productId: string;
  expiryDate?: Date | null;
  lotCode?: string | null;
  sourcePurchaseId?: string | null;
};

export type LotSlice = {
  lotId: string;
  baseQuantity: Decimal;
  expiryDate: Date | null;
  lotCode: string | null;
  sourcePurchaseId: string | null;
};

export type LotCandidate = {
  id: string;
  baseQty: DecimalValue;
  expiryDate: Date | null;
  lotCode: string | null;
  sourcePurchaseId: string | null;
};

/** Calendar-day difference (UTC date parts). Negative = already expired. */
export function daysUntilExpiry(expiryDate: Date, today: Date = new Date()): number {
  const exp = Date.UTC(
    expiryDate.getUTCFullYear(),
    expiryDate.getUTCMonth(),
    expiryDate.getUTCDate(),
  );
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((exp - now) / (24 * 60 * 60 * 1000));
}

export function expiryAlertWindowForDays(days: number): ExpiryAlertWindow | null {
  if (days < 0) return "expired";
  if (days <= 7) return 7;
  if (days <= 14) return 14;
  if (days <= 30) return 30;
  return null;
}

export function expiryAlertEntityId(lotId: string, window: ExpiryAlertWindow): string {
  return `${lotId}:w${window}`;
}

export function assertLotLocation(location: LotLocation): {
  warehouseId: string | null;
  storeId: string | null;
} {
  const warehouseId = location.warehouseId?.trim() || null;
  const storeId = location.storeId?.trim() || null;
  if (Boolean(warehouseId) === Boolean(storeId)) {
    throw new StockError(
      "invalid_lot_location",
      "A stock lot must belong to exactly one warehouse or store.",
    );
  }
  return { warehouseId, storeId };
}

export function normalizeLotCode(lotCode?: string | null): string | null {
  const trimmed = lotCode?.trim();
  return trimmed ? trimmed : null;
}

/** Null expiry sorts last (unknown shelf life treated as farthest). */
export function compareLotsFefo(
  a: { expiryDate: Date | null },
  b: { expiryDate: Date | null },
): number {
  if (a.expiryDate === null && b.expiryDate === null) return 0;
  if (a.expiryDate === null) return 1;
  if (b.expiryDate === null) return -1;
  return a.expiryDate.getTime() - b.expiryDate.getTime();
}

/**
 * Allocate outbound base qty FEFO from candidates with qty > 0.
 * Returns slices totaling min(needed, sum of lots). Remainder is untracked.
 */
export function allocateFefo(
  candidates: LotCandidate[],
  neededBaseQty: DecimalValue,
): LotSlice[] {
  const needed = toDecimal(neededBaseQty).toDecimalPlaces(BASE_QTY_DP);
  if (!needed.isFinite() || needed.lte(0)) {
    throw new StockError("invalid_quantity", "Lot allocation quantity must be greater than 0.");
  }

  const ordered = [...candidates]
    .filter((lot) => toDecimal(lot.baseQty).gt(0))
    .sort(compareLotsFefo);

  const slices: LotSlice[] = [];
  let remaining = needed;

  for (const lot of ordered) {
    if (remaining.lte(0)) break;
    const available = toDecimal(lot.baseQty).toDecimalPlaces(BASE_QTY_DP);
    if (available.lte(0)) continue;
    const take = Decimal.min(available, remaining).toDecimalPlaces(BASE_QTY_DP);
    if (take.lte(0)) continue;
    slices.push({
      lotId: lot.id,
      baseQuantity: take,
      expiryDate: lot.expiryDate,
      lotCode: lot.lotCode,
      sourcePurchaseId: lot.sourcePurchaseId,
    });
    remaining = remaining.minus(take).toDecimalPlaces(BASE_QTY_DP);
  }

  return slices;
}

export function totalAllocatedBase(slices: LotSlice[]): Decimal {
  return slices
    .reduce((sum, slice) => sum.plus(slice.baseQuantity), new Decimal(0))
    .toDecimalPlaces(BASE_QTY_DP);
}

export function suggestExpiryFromShelfLife(
  shelfLifeDays: number | null | undefined,
  fromDate: Date = new Date(),
): string | null {
  if (shelfLifeDays == null || !Number.isFinite(shelfLifeDays) || shelfLifeDays <= 0) {
    return null;
  }
  const days = Math.floor(shelfLifeDays);
  const exp = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate() + days),
  );
  return exp.toISOString().slice(0, 10);
}
