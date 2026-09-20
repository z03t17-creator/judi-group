import { Prisma } from "@prisma/client";
import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import {
  PurchaseError,
  costPerBaseUnit,
  nextPurchaseOrderNumber,
  nextPurchaseReceiptNumber,
  weightedAverageBaseCost,
} from "@/lib/purchase";
import { applyStockMovementInTx } from "@/lib/stock-apply";
import { StockError } from "@/lib/stock";
import { createPurchaseFreightExpenseInTx } from "@/lib/expense";
import type { DecimalValue } from "@/lib/uom";

export type PurchaseLineInput = {
  productId: string;
  productUnitId: string;
  quantity: DecimalValue;
  unitCost: DecimalValue;
  currency: string;
  expiryDate?: Date | null;
  lotCode?: string | null;
};

export type CreatePurchaseOrderInput = {
  supplierId: string;
  warehouseId: string;
  createdById: string;
  currency?: string;
  notes?: string | null;
  lines: PurchaseLineInput[];
  /** When true, post stock + create receipt in the same transaction. */
  receiveNow?: boolean;
  /** Optional freight posted as PURCHASE_FREIGHT expense when received. */
  freightAmount?: DecimalValue | null;
  freightCurrency?: string | null;
};

async function assertPurchaseLines(
  tx: Prisma.TransactionClient,
  lines: PurchaseLineInput[],
) {
  if (lines.length === 0) {
    throw new PurchaseError("no_lines", "At least one purchase line is required.");
  }

  for (const line of lines) {
    const [product, unit] = await Promise.all([
      tx.product.findUnique({ where: { id: line.productId } }),
      tx.productUnit.findUnique({ where: { id: line.productUnitId } }),
    ]);
    if (!product) {
      throw new PurchaseError("invalid_product", "Product was not found.");
    }
    if (!unit || unit.productId !== line.productId) {
      throw new PurchaseError("invalid_unit", "Unit does not belong to this product.");
    }
    if (!["IQD", "USD"].includes(line.currency)) {
      throw new PurchaseError("invalid_currency", "Currency must be IQD or USD.");
    }
  }
}

function lineCreateData(lines: PurchaseLineInput[]) {
  return lines.map((line) => ({
    productId: line.productId,
    productUnitId: line.productUnitId,
    quantity: new Prisma.Decimal(String(line.quantity)),
    unitCost: new Prisma.Decimal(String(line.unitCost)),
    currency: line.currency,
    expiryDate: line.expiryDate ?? null,
    lotCode: line.lotCode?.trim() ? line.lotCode.trim() : null,
  }));
}

async function receivePurchaseOrderInTx(
  tx: Prisma.TransactionClient,
  orderId: string,
  receivedById: string,
  notes?: string | null,
  freight?: { amount?: DecimalValue | null; currency?: string | null } | null,
) {
  const order = await tx.purchaseOrder.findUnique({
    where: { id: orderId },
    include: {
      lines: {
        include: {
          product: true,
          productUnit: true,
        },
      },
      receipt: true,
    },
  });

  if (!order) {
    throw new PurchaseError("not_found", "Purchase order was not found.");
  }
  if (order.status === "CANCELLED") {
    throw new PurchaseError("cancelled", "Cancelled purchases cannot be received.");
  }
  if (order.status === "RECEIVED" || order.receipt) {
    throw new PurchaseError("already_received", "This purchase was already received.");
  }
  if (order.lines.length === 0) {
    throw new PurchaseError("no_lines", "At least one purchase line is required.");
  }

  const lastReceipt = await tx.purchaseReceipt.findFirst({
    orderBy: { receiptNumber: "desc" },
    select: { receiptNumber: true },
  });
  const receiptNumber = nextPurchaseReceiptNumber(lastReceipt?.receiptNumber ?? null);

  const receipt = await tx.purchaseReceipt.create({
    data: {
      receiptNumber,
      purchaseOrderId: order.id,
      warehouseId: order.warehouseId,
      receivedById,
      notes: notes?.trim() ? notes.trim() : order.notes,
    },
  });

  type CostBucket = {
    receivedBaseQty: Decimal;
    incomingValue: Decimal;
    priorBaseQty: Decimal;
    priorCost: Decimal;
  };
  const iqdByProduct = new Map<string, CostBucket>();

  for (const line of order.lines) {
    const noteParts = [
      `PO ${order.orderNumber}`,
      `PR ${receiptNumber}`,
      line.lotCode ? `lot ${line.lotCode}` : null,
      line.expiryDate
        ? `exp ${line.expiryDate.toISOString().slice(0, 10)}`
        : null,
    ].filter(Boolean);

    const { movement, nextBaseQty } = await applyStockMovementInTx(tx, {
      warehouseId: order.warehouseId,
      productId: line.productId,
      productUnitId: line.productUnitId,
      recordedById: receivedById,
      type: "RECEIVE",
      quantity: line.quantity.toString(),
      notes: noteParts.join(" · "),
      lot: {
        expiryDate: line.expiryDate,
        lotCode: line.lotCode,
        sourcePurchaseId: order.id,
      },
    });

    const baseQuantity = movement.baseQuantity;
    await tx.purchaseOrderLine.update({
      where: { id: line.id },
      data: {
        baseQuantity,
        stockMovementId: movement.id,
      },
    });

    if (line.currency === "IQD") {
      const costPerBase = costPerBaseUnit(
        line.unitCost.toString(),
        line.productUnit.conversionRatio.toString(),
      );
      const receivedBase = new Decimal(baseQuantity.toString());
      const existing = iqdByProduct.get(line.productId);
      if (existing) {
        existing.receivedBaseQty = existing.receivedBaseQty.plus(receivedBase);
        existing.incomingValue = existing.incomingValue.plus(
          receivedBase.times(costPerBase),
        );
      } else {
        const priorBaseQty = new Decimal(nextBaseQty.toString()).minus(receivedBase);
        iqdByProduct.set(line.productId, {
          receivedBaseQty: receivedBase,
          incomingValue: receivedBase.times(costPerBase),
          priorBaseQty,
          priorCost: new Decimal(line.product.baseCost.toString()),
        });
      }
    }
  }

  for (const [productId, bucket] of iqdByProduct) {
    const incomingCostPerBase = bucket.incomingValue.div(bucket.receivedBaseQty);
    const nextCost = weightedAverageBaseCost(
      bucket.priorBaseQty,
      bucket.priorCost,
      bucket.receivedBaseQty,
      incomingCostPerBase,
    );
    await tx.product.update({
      where: { id: productId },
      data: { baseCost: new Prisma.Decimal(nextCost.toString()) },
    });
  }

  const updated = await tx.purchaseOrder.update({
    where: { id: order.id },
    data: {
      status: "RECEIVED",
      receivedById,
      receivedAt: new Date(),
    },
    include: {
      supplier: true,
      warehouse: true,
      lines: true,
      receipt: true,
    },
  });

  await tx.auditLog.create({
    data: {
      userId: receivedById,
      action: "PURCHASE_RECEIVE",
      entityType: "PurchaseReceipt",
      entityId: receipt.id,
      details: {
        purchaseOrderId: order.id,
        orderNumber: order.orderNumber,
        receiptNumber,
        warehouseId: order.warehouseId,
        supplierId: order.supplierId,
        lineCount: order.lines.length,
        freightAmount: freight?.amount != null ? String(freight.amount) : null,
        freightCurrency: freight?.currency ?? null,
      },
    },
  });

  if (freight?.amount != null) {
    const freightExpense = await createPurchaseFreightExpenseInTx(tx, {
      amount: freight.amount,
      currency: freight.currency ?? order.currency,
      warehouseId: order.warehouseId,
      createdById: receivedById,
      orderNumber: order.orderNumber,
      receiptNumber,
      note: notes,
    });
    if (freightExpense) {
      await tx.auditLog.create({
        data: {
          userId: receivedById,
          action: "EXPENSE_PURCHASE_FREIGHT",
          entityType: "Expense",
          entityId: freightExpense.id,
          details: {
            purchaseOrderId: order.id,
            orderNumber: order.orderNumber,
            receiptNumber,
            amount: freightExpense.amount.toString(),
            currency: freightExpense.currency,
          },
        },
      });
    }
  }

  return { order: updated, receipt };
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  try {
    return await prisma.$transaction(async (tx) => {
      const [supplier, warehouse] = await Promise.all([
        tx.supplier.findUnique({ where: { id: input.supplierId } }),
        tx.warehouse.findUnique({ where: { id: input.warehouseId } }),
      ]);
      if (!supplier || !supplier.active) {
        throw new PurchaseError("invalid_supplier", "Supplier was not found or is inactive.");
      }
      if (!warehouse) {
        throw new PurchaseError("invalid_warehouse", "Warehouse was not found.");
      }

      await assertPurchaseLines(tx, input.lines);

      const last = await tx.purchaseOrder.findFirst({
        orderBy: { orderNumber: "desc" },
        select: { orderNumber: true },
      });
      const orderNumber = nextPurchaseOrderNumber(last?.orderNumber ?? null);
      const currency = input.currency === "USD" ? "USD" : "IQD";

      const order = await tx.purchaseOrder.create({
        data: {
          orderNumber,
          supplierId: input.supplierId,
          warehouseId: input.warehouseId,
          currency,
          notes: input.notes?.trim() ? input.notes.trim() : null,
          createdById: input.createdById,
          status: "DRAFT",
          lines: { create: lineCreateData(input.lines) },
        },
        include: { lines: true, supplier: true, warehouse: true },
      });

      await tx.auditLog.create({
        data: {
          userId: input.createdById,
          action: "PURCHASE_CREATE",
          entityType: "PurchaseOrder",
          entityId: order.id,
          details: {
            orderNumber,
            supplierId: input.supplierId,
            warehouseId: input.warehouseId,
            lineCount: input.lines.length,
            receiveNow: Boolean(input.receiveNow),
          },
        },
      });

      if (input.receiveNow) {
        return receivePurchaseOrderInTx(tx, order.id, input.createdById, input.notes, {
          amount: input.freightAmount,
          currency: input.freightCurrency ?? currency,
        });
      }

      return { order, receipt: null as null };
    });
  } catch (error) {
    if (error instanceof StockError) {
      throw new PurchaseError(error.code, error.message);
    }
    throw error;
  }
}

export async function receivePurchaseOrder(input: {
  purchaseOrderId: string;
  receivedById: string;
  notes?: string | null;
  freightAmount?: DecimalValue | null;
  freightCurrency?: string | null;
}) {
  try {
    return await prisma.$transaction(async (tx) =>
      receivePurchaseOrderInTx(
        tx,
        input.purchaseOrderId,
        input.receivedById,
        input.notes,
        {
          amount: input.freightAmount,
          currency: input.freightCurrency,
        },
      ),
    );
  } catch (error) {
    if (error instanceof StockError) {
      throw new PurchaseError(error.code, error.message);
    }
    throw error;
  }
}

export async function cancelPurchaseOrder(input: {
  purchaseOrderId: string;
  userId: string;
}) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: input.purchaseOrderId },
  });
  if (!order) {
    throw new PurchaseError("not_found", "Purchase order was not found.");
  }
  if (order.status !== "DRAFT") {
    throw new PurchaseError("not_draft", "Only draft purchases can be cancelled.");
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
  });

  await prisma.auditLog.create({
    data: {
      userId: input.userId,
      action: "PURCHASE_CANCEL",
      entityType: "PurchaseOrder",
      entityId: order.id,
      details: { orderNumber: order.orderNumber },
    },
  });

  return updated;
}
