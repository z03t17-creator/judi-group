import { Prisma } from "@prisma/client";
import { notifyTransferCreated, notifyTransferDecided } from "@/lib/notification-events";
import { prisma } from "@/lib/prisma";
import {
  StockError,
  assertCanDecide,
  assertTransferRoute,
  movementBaseQuantity,
  type TransferDecision,
} from "@/lib/stock";
import { applyStockMovementInTx } from "@/lib/stock-apply";
import { toDecimal } from "@/lib/uom";

export type TransferLineInput = {
  productId: string;
  productUnitId: string;
  quantity: Prisma.Decimal | number | string;
};

export async function createStockTransfer(input: {
  sourceId: string;
  destinationId: string;
  createdById: string;
  notes?: string | null;
  lines: TransferLineInput[];
}) {
  return prisma.$transaction(async (tx) => {
    assertTransferRoute(input.sourceId, input.destinationId);
    if (input.lines.length === 0) {
      throw new StockError("invalid_quantity", "At least one transfer line is required.");
    }

    const [source, destination] = await Promise.all([
      tx.warehouse.findUnique({ where: { id: input.sourceId } }),
      tx.warehouse.findUnique({ where: { id: input.destinationId } }),
    ]);
    if (!source || !destination) {
      throw new StockError("invalid_warehouse", "Source or destination warehouse was not found.");
    }

    const needed = new Map<string, ReturnType<typeof toDecimal>>();
    const items = [];
    for (const line of input.lines) {
      const unit = await tx.productUnit.findUnique({ where: { id: line.productUnitId } });
      if (!unit || unit.productId !== line.productId) {
        throw new StockError("invalid_unit", "Unit does not belong to this product.");
      }
      const baseQuantity = movementBaseQuantity(line.quantity, unit.conversionRatio.toString());
      const previous = needed.get(line.productId);
      needed.set(line.productId, previous ? previous.plus(baseQuantity) : baseQuantity);
      items.push({
        productId: line.productId,
        productUnitId: line.productUnitId,
        quantity: new Prisma.Decimal(String(line.quantity)),
        baseQuantity: new Prisma.Decimal(baseQuantity.toString()),
      });
    }

    for (const [productId, required] of needed) {
      const inventory = await tx.stockInventory.findUnique({
        where: {
          warehouseId_productId: {
            warehouseId: input.sourceId,
            productId,
          },
        },
      });
      const onHand = inventory?.baseQty.toString() ?? "0";
      if (required.gt(onHand)) {
        throw new StockError("insufficient_stock", "Source warehouse does not have enough stock.");
      }
    }

    const transfer = await tx.stockTransfer.create({
      data: {
        sourceId: input.sourceId,
        destinationId: input.destinationId,
        createdById: input.createdById,
        notes: input.notes?.trim() ? input.notes.trim() : null,
        items: { create: items },
      },
      include: { items: true },
    });

    await tx.auditLog.create({
      data: {
        userId: input.createdById,
        action: "STOCK_TRANSFER_CREATE",
        entityType: "StockTransfer",
        entityId: transfer.id,
        details: {
          sourceId: input.sourceId,
          destinationId: input.destinationId,
          itemCount: items.length,
        },
      },
    });

    return transfer;
  }).then(async (transfer) => {
    void notifyTransferCreated({
      transferId: transfer.id,
      sourceId: input.sourceId,
      destinationId: input.destinationId,
      createdById: input.createdById,
      itemCount: transfer.items.length,
    }).catch(() => {
      /* best-effort alerts */
    });
    return transfer;
  });
}

export async function decideStockTransfer(input: {
  transferId: string;
  decidedById: string;
  decision: TransferDecision;
}) {
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "StockTransfer" WHERE id = ${input.transferId} FOR UPDATE`;
    const transfer = await tx.stockTransfer.findUnique({
      where: { id: input.transferId },
      include: { items: true },
    });
    if (!transfer) {
      throw new StockError("invalid_transfer", "Transfer was not found.");
    }

    assertCanDecide(transfer.status, input.decision);

    if (input.decision === "ACCEPTED") {
      for (const item of transfer.items) {
        const outbound = await applyStockMovementInTx(tx, {
          warehouseId: transfer.sourceId,
          productId: item.productId,
          productUnitId: item.productUnitId,
          recordedById: input.decidedById,
          type: "TRANSFER_OUT",
          quantity: item.quantity.toString(),
          transferId: transfer.id,
          notes: `Transfer ${transfer.id}`,
        });
        await applyStockMovementInTx(tx, {
          warehouseId: transfer.destinationId,
          productId: item.productId,
          productUnitId: item.productUnitId,
          recordedById: input.decidedById,
          type: "TRANSFER_IN",
          quantity: item.quantity.toString(),
          transferId: transfer.id,
          notes: `Transfer ${transfer.id}`,
          lotTransfers:
            outbound.lotAllocations.length > 0
              ? outbound.lotAllocations.map((slice) => ({
                  baseQuantity: slice.baseQuantity.toString(),
                  expiryDate: slice.expiryDate,
                  lotCode: slice.lotCode,
                  sourcePurchaseId: slice.sourcePurchaseId,
                }))
              : null,
        });
      }
    }

    const row = await tx.stockTransfer.update({
      where: { id: transfer.id },
      data: {
        status: input.decision,
        decidedById: input.decidedById,
        decidedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        userId: input.decidedById,
        action: input.decision === "ACCEPTED" ? "STOCK_TRANSFER_ACCEPT" : "STOCK_TRANSFER_REJECT",
        entityType: "StockTransfer",
        entityId: transfer.id,
        details: { decision: input.decision },
      },
    });

    return { row, createdById: transfer.createdById };
  });

  void notifyTransferDecided({
    transferId: updated.row.id,
    createdById: updated.createdById,
    decidedById: input.decidedById,
    decision: input.decision,
  }).catch(() => {
    /* best-effort alerts */
  });

  return updated.row;
}
