import Decimal from "decimal.js";
import { BASE_QTY_DP, toDecimal, type DecimalValue } from "@/lib/uom";

export type StorePlacementDirection = "TO_STORE" | "FROM_STORE";

export class StoreStockError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StoreStockError";
    this.code = code;
  }
}

export function nextStoreBaseQty(current: DecimalValue, delta: DecimalValue): Decimal {
  const currentQty = toDecimal(current);
  const change = toDecimal(delta);

  if (!currentQty.isFinite() || currentQty.lt(0)) {
    throw new StoreStockError(
      "invalid_quantity",
      "Current store on-hand quantity must be a finite value >= 0.",
    );
  }
  if (!change.isFinite()) {
    throw new StoreStockError("invalid_quantity", "Store stock delta must be finite.");
  }

  const next = currentQty.plus(change).toDecimalPlaces(BASE_QTY_DP);
  if (next.lt(0)) {
    throw new StoreStockError("insufficient_store_stock", "Quantity exceeds store on-hand stock.");
  }

  return next;
}
