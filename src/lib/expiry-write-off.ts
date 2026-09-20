import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { applyStockMovementInTx } from "@/lib/stock-apply";
import { StockError, movementBaseQuantity } from "@/lib/stock";
import { nextStoreBaseQty } from "@/lib/store-stock";
import { toDecimal } from "@/lib/uom";
import { notifyLotWrittenOff } from "@/lib/notification-events";

export class ExpiryError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ExpiryError";
    this.code = code;
  }
}

/**
 * Write off remaining qty on an expired (or soon-to-expire) lot:
 * decreases aggregate stock, zeros the lot, posts SPOILAGE expense, notifies office.
 */
export async function writeOffStockLot(input: {
  stockLotId: string;
  recordedById: string;
  note?: string | null;
  /** When set, write off only this many base units (default: full lot qty). */
  baseQuantity?: string | number | null;
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const lot = await tx.stockLot.findUnique({
        where: { id: input.stockLotId },
        include: {
          product: {
            include: {
              units: { where: { isBaseUnit: true }, take: 1 },
            },
          },
          warehouse: true,
          store: true,
        },
      });

      if (!lot) {
        throw new ExpiryError("not_found", "Stock lot was not found.");
      }

      const onHand = toDecimal(lot.baseQty.toString());
      if (onHand.lte(0)) {
        throw new ExpiryError("empty_lot", "This lot has no remaining quantity.");
      }

      const writeQty = input.baseQuantity
        ? toDecimal(input.baseQuantity)
        : onHand;
      if (!writeQty.isFinite() || writeQty.lte(0) || writeQty.gt(onHand)) {
        throw new ExpiryError("invalid_quantity", "Write-off quantity is invalid.");
      }

      const baseUnit = lot.product.units[0];
      if (!baseUnit) {
        throw new ExpiryError("invalid_unit", "Product has no base unit.");
      }

      const expiryLabel = lot.expiryDate
        ? lot.expiryDate.toISOString().slice(0, 10)
        : "no-expiry";
      const lotLabel = lot.lotCode ? `lot ${lot.lotCode}` : "lot";
      const noteParts = [
        `Expiry write-off · ${lotLabel} · exp ${expiryLabel}`,
        input.note?.trim() || null,
      ].filter(Boolean);
      const notes = noteParts.join(" · ");

      let movementId: string | null = null;
      let warehouseId = lot.warehouseId;
      const storeId = lot.storeId;

      if (lot.warehouseId) {
        const { movement } = await applyStockMovementInTx(tx, {
          warehouseId: lot.warehouseId,
          productId: lot.productId,
          productUnitId: baseUnit.id,
          recordedById: input.recordedById,
          type: "WRITE_OFF",
          quantity: writeQty.toString(),
          notes,
          stockLotId: lot.id,
        });
        movementId = movement.id;
      } else if (lot.storeId) {
        const inventory = await tx.storeInventory.findUnique({
          where: {
            storeId_productId: {
              storeId: lot.storeId,
              productId: lot.productId,
            },
          },
        });
        if (!inventory) {
          throw new ExpiryError("insufficient_stock", "Store inventory was not found.");
        }
        await tx.$queryRaw`SELECT id FROM "StoreInventory" WHERE id = ${inventory.id} FOR UPDATE`;
        const locked = await tx.storeInventory.findUniqueOrThrow({
          where: { id: inventory.id },
        });
        const nextQty = nextStoreBaseQty(
          locked.baseQty.toString(),
          writeQty.negated().toString(),
        );
        await tx.storeInventory.update({
          where: { id: inventory.id },
          data: { baseQty: new Prisma.Decimal(nextQty.toString()) },
        });

        await tx.$queryRaw`SELECT id FROM "StockLot" WHERE id = ${lot.id} FOR UPDATE`;
        const lockedLot = await tx.stockLot.findUniqueOrThrow({ where: { id: lot.id } });
        const nextLotQty = toDecimal(lockedLot.baseQty.toString()).minus(writeQty);
        if (nextLotQty.lt(0)) {
          throw new ExpiryError("insufficient_lot", "Lot does not have enough quantity.");
        }
        await tx.stockLot.update({
          where: { id: lot.id },
          data: { baseQty: new Prisma.Decimal(nextLotQty.toString()) },
        });
      } else {
        throw new ExpiryError("invalid_lot_location", "Lot has no warehouse or store.");
      }

      const unitCost = toDecimal(lot.product.baseCost.toString());
      const amount = writeQty.times(unitCost).toDecimalPlaces(2);
      const today = new Date();
      const expenseDate = new Date(
        Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
      );

      const expense = await tx.expense.create({
        data: {
          date: expenseDate,
          category: "SPOILAGE",
          amount: new Prisma.Decimal(amount.toString()),
          currency: "IQD",
          note: notes,
          productId: lot.productId,
          stockLotId: lot.id,
          warehouseId,
          storeId,
          createdById: input.recordedById,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: input.recordedById,
          action: "STOCK_LOT_WRITE_OFF",
          entityType: "StockLot",
          entityId: lot.id,
          details: {
            movementId,
            expenseId: expense.id,
            baseQuantity: writeQty.toString(),
            amount: amount.toString(),
            warehouseId,
            storeId,
          },
        },
      });

      return {
        lotId: lot.id,
        expenseId: expense.id,
        movementId,
        baseQuantity: writeQty.toString(),
        amount: amount.toString(),
        productName: lot.product.name,
        lotCode: lot.lotCode,
        expiryDate: lot.expiryDate,
        warehouseId,
        storeId,
      };
    });

    void notifyLotWrittenOff({
      lotId: result.lotId,
      expenseId: result.expenseId,
      recordedById: input.recordedById,
      baseQuantity: result.baseQuantity,
      amount: result.amount,
      lotCode: result.lotCode,
      expiryDate: result.expiryDate
        ? result.expiryDate.toISOString().slice(0, 10)
        : null,
    }).catch(() => {
      /* best-effort */
    });

    return result;
  } catch (error) {
    if (error instanceof StockError) {
      throw new ExpiryError(error.code, error.message);
    }
    throw error;
  }
}

/** Resolve base unit qty for a product (unused helper kept for forms). */
export function baseUnitQuantityForWriteOff(
  quantity: string | number,
  conversionRatio: string | number,
) {
  return movementBaseQuantity(quantity, conversionRatio);
}
