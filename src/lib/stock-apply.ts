import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  StockError,
  movementBaseQuantity,
  nextBaseQty,
  signedBaseDelta,
  type StockMovementKind,
} from "@/lib/stock";
import {
  decreaseStockLotsInTx,
  increaseStockLotInTx,
  receiveLotTransfersInTx,
} from "@/lib/stock-lot-apply";
import type { LotSlice } from "@/lib/stock-lot";
import type { DecimalValue } from "@/lib/uom";

type Db = PrismaClient | Prisma.TransactionClient;

export type LotReceiptInput = {
  expiryDate?: Date | null;
  lotCode?: string | null;
  sourcePurchaseId?: string | null;
};

export type LotTransferReceipt = LotReceiptInput & {
  baseQuantity: DecimalValue;
};

export type ApplyStockMovementInput = {
  warehouseId: string;
  productId: string;
  productUnitId: string;
  recordedById: string;
  type: StockMovementKind;
  quantity: DecimalValue;
  notes?: string | null;
  transferId?: string | null;
  storePlacementId?: string | null;
  /** Create/increase a warehouse lot on inbound (RECEIVE / STORE_IN / TRANSFER_IN). */
  lot?: LotReceiptInput | null;
  /** Force outbound from a specific lot (expiry write-off). */
  stockLotId?: string | null;
  /** Prefer matching lot identity before FEFO on outbound. */
  preferLot?: {
    expiryDate?: Date | null;
    lotCode?: string | null;
  } | null;
  /** Inbound lot slices copied from a paired outbound (transfer / store). */
  lotTransfers?: LotTransferReceipt[] | null;
};

const AUDIT_ACTION: Record<StockMovementKind, string> = {
  RECEIVE: "STOCK_RECEIVE",
  WRITE_OFF: "STOCK_WRITE_OFF",
  TRANSFER_OUT: "STOCK_TRANSFER_OUT",
  TRANSFER_IN: "STOCK_TRANSFER_IN",
  SALE: "STOCK_SALE",
  GIFT: "STOCK_GIFT",
  RETURN: "STOCK_RETURN",
  STORE_OUT: "STOCK_STORE_OUT",
  STORE_IN: "STOCK_STORE_IN",
};

const INBOUND: readonly StockMovementKind[] = [
  "RECEIVE",
  "TRANSFER_IN",
  "STORE_IN",
  "RETURN",
];
const OUTBOUND: readonly StockMovementKind[] = [
  "WRITE_OFF",
  "TRANSFER_OUT",
  "SALE",
  "GIFT",
  "STORE_OUT",
];

export async function applyStockMovementInTx(
  tx: Prisma.TransactionClient,
  input: ApplyStockMovementInput,
) {
  const [warehouse, product, unit] = await Promise.all([
    tx.warehouse.findUnique({ where: { id: input.warehouseId } }),
    tx.product.findUnique({ where: { id: input.productId } }),
    tx.productUnit.findUnique({ where: { id: input.productUnitId } }),
  ]);

  if (!warehouse) {
    throw new StockError("invalid_warehouse", "Warehouse was not found.");
  }
  if (!product) {
    throw new StockError("invalid_product", "Product was not found.");
  }
  if (!unit || unit.productId !== input.productId) {
    throw new StockError("invalid_unit", "Unit does not belong to this product.");
  }

  const baseQuantity = movementBaseQuantity(input.quantity, unit.conversionRatio.toString());
  const delta = signedBaseDelta(input.type, baseQuantity);

  const inventory = await tx.stockInventory.upsert({
    where: {
      warehouseId_productId: {
        warehouseId: input.warehouseId,
        productId: input.productId,
      },
    },
    create: {
      warehouseId: input.warehouseId,
      productId: input.productId,
      baseQty: 0,
    },
    update: {},
  });

  await tx.$queryRaw`SELECT id FROM "StockInventory" WHERE id = ${inventory.id} FOR UPDATE`;

  const locked = await tx.stockInventory.findUniqueOrThrow({
    where: { id: inventory.id },
  });
  const nextQty = nextBaseQty(locked.baseQty.toString(), delta);

  await tx.stockInventory.update({
    where: { id: inventory.id },
    data: { baseQty: new Prisma.Decimal(nextQty.toString()) },
  });

  const movement = await tx.stockMovement.create({
    data: {
      warehouseId: input.warehouseId,
      productId: input.productId,
      productUnitId: input.productUnitId,
      recordedById: input.recordedById,
      transferId: input.transferId ?? null,
      storePlacementId: input.storePlacementId ?? null,
      type: input.type,
      quantity: new Prisma.Decimal(String(input.quantity)),
      baseQuantity: new Prisma.Decimal(baseQuantity.toString()),
      notes: input.notes?.trim() ? input.notes.trim() : null,
    },
  });

  let lotAllocations: LotSlice[] = [];

  if (OUTBOUND.includes(input.type)) {
    lotAllocations = await decreaseStockLotsInTx(tx, {
      location: { warehouseId: input.warehouseId },
      productId: input.productId,
      baseQuantity,
      stockMovementId: movement.id,
      stockLotId: input.stockLotId,
      prefer: input.preferLot,
    });
  } else if (INBOUND.includes(input.type)) {
    if (input.lotTransfers && input.lotTransfers.length > 0) {
      lotAllocations = await receiveLotTransfersInTx(tx, {
        location: { warehouseId: input.warehouseId },
        productId: input.productId,
        stockMovementId: movement.id,
        transfers: input.lotTransfers,
      });
    } else if (input.lot) {
      // Caller opts into lot tracking by passing `lot` (purchases always do).
      lotAllocations = [
        await increaseStockLotInTx(tx, {
          warehouseId: input.warehouseId,
          productId: input.productId,
          baseQuantity,
          expiryDate: input.lot.expiryDate,
          lotCode: input.lot.lotCode,
          sourcePurchaseId: input.lot.sourcePurchaseId,
          stockMovementId: movement.id,
        }),
      ];
    }
  }

  await tx.auditLog.create({
    data: {
      userId: input.recordedById,
      action: AUDIT_ACTION[input.type],
      entityType: "StockMovement",
      entityId: movement.id,
      details: {
        warehouseId: input.warehouseId,
        productId: input.productId,
        productUnitId: input.productUnitId,
        transferId: input.transferId ?? null,
        storePlacementId: input.storePlacementId ?? null,
        quantity: String(input.quantity),
        baseQuantity: baseQuantity.toString(),
        nextBaseQty: nextQty.toString(),
        lotIds: lotAllocations.map((slice) => slice.lotId),
      },
    },
  });

  return { movement, nextBaseQty: nextQty, lotAllocations };
}

export async function applyStockMovement(input: ApplyStockMovementInput, db: Db = prisma) {
  if ("$transaction" in db) {
    return db.$transaction((tx) => applyStockMovementInTx(tx, input));
  }
  return applyStockMovementInTx(db, input);
}
