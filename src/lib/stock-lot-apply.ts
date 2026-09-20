import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import {
  allocateFefo,
  assertLotLocation,
  normalizeLotCode,
  totalAllocatedBase,
  type LotIdentity,
  type LotLocation,
  type LotSlice,
} from "@/lib/stock-lot";
import { StockError } from "@/lib/stock";
import { BASE_QTY_DP, toDecimal, type DecimalValue } from "@/lib/uom";

function sameCalendarDate(a: Date | null, b: Date | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

async function findMatchingLot(
  tx: Prisma.TransactionClient,
  identity: LotIdentity,
) {
  const { warehouseId, storeId } = assertLotLocation(identity);
  const lotCode = normalizeLotCode(identity.lotCode);
  const candidates = await tx.stockLot.findMany({
    where: {
      productId: identity.productId,
      warehouseId,
      storeId,
      lotCode,
      sourcePurchaseId: identity.sourcePurchaseId ?? null,
    },
  });
  return (
    candidates.find((lot) => sameCalendarDate(lot.expiryDate, identity.expiryDate ?? null)) ??
    null
  );
}

export async function increaseStockLotInTx(
  tx: Prisma.TransactionClient,
  input: LotIdentity & { baseQuantity: DecimalValue; stockMovementId?: string | null },
): Promise<LotSlice> {
  const { warehouseId, storeId } = assertLotLocation(input);
  const baseQuantity = toDecimal(input.baseQuantity).toDecimalPlaces(BASE_QTY_DP);
  if (!baseQuantity.isFinite() || baseQuantity.lte(0)) {
    throw new StockError("invalid_quantity", "Lot quantity must be greater than 0.");
  }

  const lotCode = normalizeLotCode(input.lotCode);
  const expiryDate = input.expiryDate ?? null;
  const sourcePurchaseId = input.sourcePurchaseId ?? null;

  let lot = await findMatchingLot(tx, {
    warehouseId,
    storeId,
    productId: input.productId,
    expiryDate,
    lotCode,
    sourcePurchaseId,
  });

  if (!lot) {
    lot = await tx.stockLot.create({
      data: {
        warehouseId,
        storeId,
        productId: input.productId,
        baseQty: new Prisma.Decimal(baseQuantity.toString()),
        expiryDate,
        lotCode,
        sourcePurchaseId,
      },
    });
  } else {
    await tx.$queryRaw`SELECT id FROM "StockLot" WHERE id = ${lot.id} FOR UPDATE`;
    const locked = await tx.stockLot.findUniqueOrThrow({ where: { id: lot.id } });
    const nextQty = toDecimal(locked.baseQty.toString())
      .plus(baseQuantity)
      .toDecimalPlaces(BASE_QTY_DP);
    lot = await tx.stockLot.update({
      where: { id: lot.id },
      data: { baseQty: new Prisma.Decimal(nextQty.toString()) },
    });
  }

  if (input.stockMovementId) {
    await tx.stockLotMovement.upsert({
      where: {
        stockLotId_stockMovementId: {
          stockLotId: lot.id,
          stockMovementId: input.stockMovementId,
        },
      },
      create: {
        stockLotId: lot.id,
        stockMovementId: input.stockMovementId,
        baseQuantity: new Prisma.Decimal(baseQuantity.toString()),
      },
      update: {
        baseQuantity: {
          increment: new Prisma.Decimal(baseQuantity.toString()),
        },
      },
    });
  }

  return {
    lotId: lot.id,
    baseQuantity,
    expiryDate: lot.expiryDate,
    lotCode: lot.lotCode,
    sourcePurchaseId: lot.sourcePurchaseId,
  };
}

export async function decreaseStockLotsInTx(
  tx: Prisma.TransactionClient,
  input: {
    location: LotLocation;
    productId: string;
    baseQuantity: DecimalValue;
    stockMovementId: string;
    /** Prefer this lot (expiry write-off). */
    stockLotId?: string | null;
    /** Prefer matching identity before FEFO (store placement with lot/expiry). */
    prefer?: {
      expiryDate?: Date | null;
      lotCode?: string | null;
    } | null;
  },
): Promise<LotSlice[]> {
  const { warehouseId, storeId } = assertLotLocation(input.location);
  const needed = toDecimal(input.baseQuantity).toDecimalPlaces(BASE_QTY_DP);
  if (!needed.isFinite() || needed.lte(0)) {
    throw new StockError("invalid_quantity", "Lot quantity must be greater than 0.");
  }

  const lots = await tx.stockLot.findMany({
    where: {
      productId: input.productId,
      warehouseId,
      storeId,
      baseQty: { gt: 0 },
    },
  });

  if (lots.length === 0) {
    return [];
  }

  let slices: LotSlice[] = [];

  if (input.stockLotId) {
    const target = lots.find((lot) => lot.id === input.stockLotId);
    if (!target) {
      throw new StockError("invalid_lot", "Stock lot was not found at this location.");
    }
    const available = toDecimal(target.baseQty.toString());
    if (available.lt(needed)) {
      throw new StockError("insufficient_lot", "Lot does not have enough quantity.");
    }
    slices = [
      {
        lotId: target.id,
        baseQuantity: needed,
        expiryDate: target.expiryDate,
        lotCode: target.lotCode,
        sourcePurchaseId: target.sourcePurchaseId,
      },
    ];
  } else {
    const preferCode = normalizeLotCode(input.prefer?.lotCode);
    const preferExpiry = input.prefer?.expiryDate ?? null;
    const hasPrefer = preferCode != null || preferExpiry != null;
    const preferred = hasPrefer
      ? lots.filter((lot) => {
          const codeOk = preferCode ? lot.lotCode === preferCode : true;
          const expiryOk =
            preferExpiry != null ? sameCalendarDate(lot.expiryDate, preferExpiry) : true;
          return codeOk && expiryOk;
        })
      : [];

    const toCandidate = (lot: (typeof lots)[number]) => ({
      id: lot.id,
      baseQty: lot.baseQty.toString(),
      expiryDate: lot.expiryDate,
      lotCode: lot.lotCode,
      sourcePurchaseId: lot.sourcePurchaseId,
    });

    if (preferred.length > 0) {
      slices = allocateFefo(preferred.map(toCandidate), needed);
      const remaining = needed.minus(totalAllocatedBase(slices)).toDecimalPlaces(BASE_QTY_DP);
      if (remaining.gt(0)) {
        const used = new Set(slices.map((s) => s.lotId));
        const rest = lots.filter((lot) => !used.has(lot.id)).map(toCandidate);
        slices = [...slices, ...allocateFefo(rest, remaining)];
      }
    } else {
      // FEFO when lots exist; untracked remainder allowed (legacy aggregate stock).
      slices = allocateFefo(lots.map(toCandidate), needed);
    }
  }

  for (const slice of slices) {
    await tx.$queryRaw`SELECT id FROM "StockLot" WHERE id = ${slice.lotId} FOR UPDATE`;
    const locked = await tx.stockLot.findUniqueOrThrow({ where: { id: slice.lotId } });
    const nextQty = toDecimal(locked.baseQty.toString())
      .minus(slice.baseQuantity)
      .toDecimalPlaces(BASE_QTY_DP);
    if (nextQty.lt(0)) {
      throw new StockError("insufficient_lot", "Lot does not have enough quantity.");
    }
    await tx.stockLot.update({
      where: { id: slice.lotId },
      data: { baseQty: new Prisma.Decimal(nextQty.toString()) },
    });
    await tx.stockLotMovement.create({
      data: {
        stockLotId: slice.lotId,
        stockMovementId: input.stockMovementId,
        baseQuantity: new Prisma.Decimal(slice.baseQuantity.negated().toString()),
      },
    });
  }

  return slices;
}

export async function receiveLotTransfersInTx(
  tx: Prisma.TransactionClient,
  input: {
    location: LotLocation;
    productId: string;
    stockMovementId: string;
    transfers: Array<{
      baseQuantity: DecimalValue;
      expiryDate?: Date | null;
      lotCode?: string | null;
      sourcePurchaseId?: string | null;
    }>;
  },
): Promise<LotSlice[]> {
  const results: LotSlice[] = [];
  for (const transfer of input.transfers) {
    const slice = await increaseStockLotInTx(tx, {
      ...input.location,
      productId: input.productId,
      baseQuantity: transfer.baseQuantity,
      expiryDate: transfer.expiryDate,
      lotCode: transfer.lotCode,
      sourcePurchaseId: transfer.sourcePurchaseId,
      stockMovementId: input.stockMovementId,
    });
    results.push(slice);
  }
  return results;
}

export function lotSlicesToTransfers(slices: LotSlice[]) {
  return slices.map((slice) => ({
    baseQuantity: slice.baseQuantity.toString(),
    expiryDate: slice.expiryDate,
    lotCode: slice.lotCode,
    sourcePurchaseId: slice.sourcePurchaseId,
  }));
}

export function emptyLotRemainder(needed: DecimalValue, slices: LotSlice[]): Decimal {
  return toDecimal(needed).minus(totalAllocatedBase(slices)).toDecimalPlaces(BASE_QTY_DP);
}
