import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePurchaseExpiryDate } from "@/lib/purchase";
import { applyStockMovementInTx } from "@/lib/stock-apply";
import {
  decreaseStockLotsInTx,
  increaseStockLotInTx,
} from "@/lib/stock-lot-apply";
import {
  StoreStockError,
  nextStoreBaseQty,
  type StorePlacementDirection,
} from "@/lib/store-stock";
import { StockError, movementBaseQuantity } from "@/lib/stock";
import { toDecimal } from "@/lib/uom";

export type StorePlacementLineInput = {
  productId: string;
  productUnitId: string;
  quantity: Prisma.Decimal | number | string;
  expiryDate?: Date | string | null;
  lotCode?: string | null;
};

async function adjustStoreInventoryInTx(
  tx: Prisma.TransactionClient,
  input: {
    storeId: string;
    productId: string;
    baseDelta: ReturnType<typeof toDecimal>;
  },
) {
  const inventory = await tx.storeInventory.upsert({
    where: {
      storeId_productId: {
        storeId: input.storeId,
        productId: input.productId,
      },
    },
    create: {
      storeId: input.storeId,
      productId: input.productId,
      baseQty: 0,
    },
    update: {},
  });

  await tx.$queryRaw`SELECT id FROM "StoreInventory" WHERE id = ${inventory.id} FOR UPDATE`;

  const locked = await tx.storeInventory.findUniqueOrThrow({
    where: { id: inventory.id },
  });
  const nextQty = nextStoreBaseQty(locked.baseQty.toString(), input.baseDelta.toString());

  await tx.storeInventory.update({
    where: { id: inventory.id },
    data: { baseQty: new Prisma.Decimal(nextQty.toString()) },
  });

  return nextQty;
}

function resolveExpiry(value: Date | string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) return value;
  const parsed = parsePurchaseExpiryDate(value);
  if (!parsed) {
    throw new StoreStockError("invalid_expiry", "Expiry date must be YYYY-MM-DD.");
  }
  return parsed;
}

export async function applyStorePlacement(input: {
  storeId: string;
  warehouseId: string;
  createdById: string;
  direction: StorePlacementDirection;
  notes?: string | null;
  lines: StorePlacementLineInput[];
}) {
  try {
    return await prisma.$transaction(async (tx) => {
      if (input.lines.length === 0) {
        throw new StoreStockError("no_lines", "At least one placement line is required.");
      }

      const [store, warehouse] = await Promise.all([
        tx.store.findUnique({ where: { id: input.storeId } }),
        tx.warehouse.findUnique({ where: { id: input.warehouseId } }),
      ]);
      if (!store) {
        throw new StoreStockError("invalid_store", "Store was not found.");
      }
      if (!warehouse) {
        throw new StoreStockError("invalid_warehouse", "Warehouse was not found.");
      }

      const needed = new Map<string, ReturnType<typeof toDecimal>>();
      const items: {
        productId: string;
        productUnitId: string;
        quantity: Prisma.Decimal;
        baseQuantity: Prisma.Decimal;
        expiryDate: Date | null;
        lotCode: string | null;
      }[] = [];

      for (const line of input.lines) {
        const unit = await tx.productUnit.findUnique({ where: { id: line.productUnitId } });
        if (!unit || unit.productId !== line.productId) {
          throw new StoreStockError("invalid_unit", "Unit does not belong to this product.");
        }
        const baseQuantity = movementBaseQuantity(line.quantity, unit.conversionRatio.toString());
        const previous = needed.get(line.productId);
        needed.set(line.productId, previous ? previous.plus(baseQuantity) : baseQuantity);
        items.push({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: new Prisma.Decimal(String(line.quantity)),
          baseQuantity: new Prisma.Decimal(baseQuantity.toString()),
          expiryDate: resolveExpiry(line.expiryDate),
          lotCode: line.lotCode?.trim() ? line.lotCode.trim() : null,
        });
      }

      if (input.direction === "TO_STORE") {
        for (const [productId, required] of needed) {
          const inventory = await tx.stockInventory.findUnique({
            where: {
              warehouseId_productId: {
                warehouseId: input.warehouseId,
                productId,
              },
            },
          });
          const onHand = inventory?.baseQty.toString() ?? "0";
          if (required.gt(onHand)) {
            throw new StoreStockError(
              "insufficient_stock",
              "Source warehouse does not have enough stock.",
            );
          }
        }
      } else {
        for (const [productId, required] of needed) {
          const inventory = await tx.storeInventory.findUnique({
            where: {
              storeId_productId: {
                storeId: input.storeId,
                productId,
              },
            },
          });
          const onHand = inventory?.baseQty.toString() ?? "0";
          if (required.gt(onHand)) {
            throw new StoreStockError(
              "insufficient_store_stock",
              "Store does not have enough placed stock.",
            );
          }
        }
      }

      const placement = await tx.storePlacement.create({
        data: {
          storeId: input.storeId,
          warehouseId: input.warehouseId,
          direction: input.direction,
          createdById: input.createdById,
          notes: input.notes?.trim() ? input.notes.trim() : null,
          items: { create: items },
        },
        include: { items: true },
      });

      const note = `Store placement ${placement.id} (${input.direction})`;

      for (const item of items) {
        const preferLot =
          item.expiryDate || item.lotCode
            ? { expiryDate: item.expiryDate, lotCode: item.lotCode }
            : null;

        if (input.direction === "TO_STORE") {
          const outbound = await applyStockMovementInTx(tx, {
            warehouseId: input.warehouseId,
            productId: item.productId,
            productUnitId: item.productUnitId,
            recordedById: input.createdById,
            type: "STORE_OUT",
            quantity: item.quantity.toString(),
            storePlacementId: placement.id,
            notes: note,
            preferLot,
          });
          await adjustStoreInventoryInTx(tx, {
            storeId: input.storeId,
            productId: item.productId,
            baseDelta: toDecimal(item.baseQuantity.toString()),
          });

          if (outbound.lotAllocations.length > 0) {
            const merged = new Map<
              string,
              {
                baseQuantity: ReturnType<typeof toDecimal>;
                expiryDate: Date | null;
                lotCode: string | null;
                sourcePurchaseId: string | null;
              }
            >();
            for (const slice of outbound.lotAllocations) {
              const key = [
                slice.lotCode ?? "",
                slice.expiryDate?.toISOString().slice(0, 10) ?? "",
                slice.sourcePurchaseId ?? "",
              ].join("|");
              const existing = merged.get(key);
              if (existing) {
                existing.baseQuantity = existing.baseQuantity.plus(slice.baseQuantity);
              } else {
                merged.set(key, {
                  baseQuantity: toDecimal(slice.baseQuantity.toString()),
                  expiryDate: slice.expiryDate,
                  lotCode: slice.lotCode,
                  sourcePurchaseId: slice.sourcePurchaseId,
                });
              }
            }
            for (const slice of merged.values()) {
              await increaseStockLotInTx(tx, {
                storeId: input.storeId,
                productId: item.productId,
                baseQuantity: slice.baseQuantity.toString(),
                expiryDate: slice.expiryDate,
                lotCode: slice.lotCode,
                sourcePurchaseId: slice.sourcePurchaseId,
                stockMovementId: outbound.movement.id,
              });
            }
          } else if (item.expiryDate || item.lotCode) {
            await increaseStockLotInTx(tx, {
              storeId: input.storeId,
              productId: item.productId,
              baseQuantity: item.baseQuantity.toString(),
              expiryDate: item.expiryDate,
              lotCode: item.lotCode,
              stockMovementId: outbound.movement.id,
            });
          }
        } else {
          await adjustStoreInventoryInTx(tx, {
            storeId: input.storeId,
            productId: item.productId,
            baseDelta: toDecimal(item.baseQuantity.toString()).negated(),
          });

          const inbound = await applyStockMovementInTx(tx, {
            warehouseId: input.warehouseId,
            productId: item.productId,
            productUnitId: item.productUnitId,
            recordedById: input.createdById,
            type: "STORE_IN",
            quantity: item.quantity.toString(),
            storePlacementId: placement.id,
            notes: note,
          });

          const fromStore = await decreaseStockLotsInTx(tx, {
            location: { storeId: input.storeId },
            productId: item.productId,
            baseQuantity: item.baseQuantity.toString(),
            stockMovementId: inbound.movement.id,
            prefer: preferLot,
          });

          if (fromStore.length > 0) {
            const merged = new Map<
              string,
              {
                baseQuantity: ReturnType<typeof toDecimal>;
                expiryDate: Date | null;
                lotCode: string | null;
                sourcePurchaseId: string | null;
              }
            >();
            for (const slice of fromStore) {
              const key = [
                slice.lotCode ?? "",
                slice.expiryDate?.toISOString().slice(0, 10) ?? "",
                slice.sourcePurchaseId ?? "",
              ].join("|");
              const existing = merged.get(key);
              if (existing) {
                existing.baseQuantity = existing.baseQuantity.plus(slice.baseQuantity);
              } else {
                merged.set(key, {
                  baseQuantity: toDecimal(slice.baseQuantity.toString()),
                  expiryDate: slice.expiryDate,
                  lotCode: slice.lotCode,
                  sourcePurchaseId: slice.sourcePurchaseId,
                });
              }
            }
            for (const slice of merged.values()) {
              await increaseStockLotInTx(tx, {
                warehouseId: input.warehouseId,
                productId: item.productId,
                baseQuantity: slice.baseQuantity.toString(),
                expiryDate: slice.expiryDate,
                lotCode: slice.lotCode,
                sourcePurchaseId: slice.sourcePurchaseId,
                stockMovementId: inbound.movement.id,
              });
            }
          } else if (item.expiryDate || item.lotCode) {
            await increaseStockLotInTx(tx, {
              warehouseId: input.warehouseId,
              productId: item.productId,
              baseQuantity: item.baseQuantity.toString(),
              expiryDate: item.expiryDate,
              lotCode: item.lotCode,
              stockMovementId: inbound.movement.id,
            });
          }
        }
      }

      await tx.auditLog.create({
        data: {
          userId: input.createdById,
          action:
            input.direction === "TO_STORE"
              ? "STORE_PLACEMENT_TO_STORE"
              : "STORE_PLACEMENT_FROM_STORE",
          entityType: "StorePlacement",
          entityId: placement.id,
          details: {
            storeId: input.storeId,
            warehouseId: input.warehouseId,
            direction: input.direction,
            itemCount: items.length,
          },
        },
      });

      return placement;
    });
  } catch (error) {
    if (error instanceof StockError) {
      throw new StoreStockError(error.code, error.message);
    }
    throw error;
  }
}
