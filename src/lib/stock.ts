import Decimal from "decimal.js";
import { BASE_QTY_DP, toBaseQuantity, toDecimal, type DecimalValue } from "@/lib/uom";

export type StockMovementKind =
  | "RECEIVE"
  | "WRITE_OFF"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "SALE"
  | "GIFT"
  | "RETURN"
  | "STORE_OUT"
  | "STORE_IN";
export type TransferStatus = "PENDING" | "ACCEPTED" | "REJECTED";
export type TransferDecision = "ACCEPTED" | "REJECTED";

export class StockError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "StockError";
    this.code = code;
  }
}

const OUTBOUND_TYPES: readonly StockMovementKind[] = [
  "WRITE_OFF",
  "TRANSFER_OUT",
  "SALE",
  "GIFT",
  "STORE_OUT",
];

export function signedBaseDelta(type: StockMovementKind, baseQty: DecimalValue): Decimal {
  const qty = toDecimal(baseQty);
  if (!qty.isFinite() || qty.lte(0)) {
    throw new StockError("invalid_quantity", "Base quantity must be a finite value greater than 0.");
  }

  const positive = qty.toDecimalPlaces(BASE_QTY_DP);
  return OUTBOUND_TYPES.includes(type) ? positive.negated() : positive;
}

export function nextBaseQty(current: DecimalValue, delta: DecimalValue): Decimal {
  const currentQty = toDecimal(current);
  const change = toDecimal(delta);

  if (!currentQty.isFinite() || currentQty.lt(0)) {
    throw new StockError("invalid_quantity", "Current on-hand quantity must be a finite value >= 0.");
  }
  if (!change.isFinite()) {
    throw new StockError("invalid_quantity", "Stock delta must be finite.");
  }

  const next = currentQty.plus(change).toDecimalPlaces(BASE_QTY_DP);
  if (next.lt(0)) {
    throw new StockError("insufficient_stock", "Quantity exceeds on-hand stock.");
  }

  return next;
}

export function movementBaseQuantity(
  quantity: DecimalValue,
  conversionRatio: DecimalValue,
): Decimal {
  const qty = toDecimal(quantity);
  if (!qty.isFinite() || qty.lte(0)) {
    throw new StockError("invalid_quantity", "Quantity must be a finite value greater than 0.");
  }

  return toBaseQuantity(qty, conversionRatio);
}

export function assertTransferRoute(sourceId: string, destinationId: string): void {
  if (!sourceId || !destinationId) {
    throw new StockError("invalid_warehouse", "Source and destination warehouses are required.");
  }
  if (sourceId === destinationId) {
    throw new StockError("same_warehouse", "Source and destination cannot be the same warehouse.");
  }
}

export function assertCanDecide(status: TransferStatus, _next: TransferDecision): void {
  if (status !== "PENDING") {
    throw new StockError("transfer_not_pending", "Only a pending transfer can be accepted or rejected.");
  }
}

export type TransferLine = {
  baseQuantity: DecimalValue;
};

export function applyTransferDecision(
  status: TransferStatus,
  decision: TransferDecision,
  sourceQty: DecimalValue,
  destQty: DecimalValue,
  lines: TransferLine[],
): { sourceQty: Decimal; destQty: Decimal } {
  assertCanDecide(status, decision);

  if (decision === "REJECTED") {
    return {
      sourceQty: toDecimal(sourceQty).toDecimalPlaces(BASE_QTY_DP),
      destQty: toDecimal(destQty).toDecimalPlaces(BASE_QTY_DP),
    };
  }

  const outbound = lines.reduce(
    (total, line) => total.plus(movementBaseQuantity(line.baseQuantity, 1)),
    new Decimal(0),
  );
  const delta = signedBaseDelta("TRANSFER_OUT", outbound);

  return {
    sourceQty: nextBaseQty(sourceQty, delta),
    destQty: nextBaseQty(destQty, signedBaseDelta("TRANSFER_IN", outbound)),
  };
}
