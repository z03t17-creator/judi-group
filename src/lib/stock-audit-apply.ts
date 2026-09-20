import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Ensure a StockAudit row exists so Camera 4 can attach count-proof photos before counts are saved. */
export async function ensureStockAuditShell(input: {
  warehouseId: string;
  auditDate: string;
  recordedById: string;
}) {
  const auditDate = new Date(`${input.auditDate}T00:00:00.000Z`);
  const warehouse = await prisma.warehouse.findUnique({ where: { id: input.warehouseId } });
  if (!warehouse) {
    throw new Error("Warehouse not found");
  }

  return prisma.stockAudit.upsert({
    where: {
      warehouseId_auditDate: {
        warehouseId: input.warehouseId,
        auditDate,
      },
    },
    create: {
      warehouseId: input.warehouseId,
      auditDate,
      recordedById: input.recordedById,
    },
    update: {},
  });
}

export async function saveStockAudit(input: {
  warehouseId: string;
  auditDate: string;
  recordedById: string;
  notes?: string | null;
  items: { productId: string; countedBaseQty: string | number }[];
}) {
  const auditDate = new Date(`${input.auditDate}T00:00:00.000Z`);

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) {
      throw new Error("Warehouse not found");
    }

    const audit = await tx.stockAudit.upsert({
      where: {
        warehouseId_auditDate: {
          warehouseId: input.warehouseId,
          auditDate,
        },
      },
      create: {
        warehouseId: input.warehouseId,
        auditDate,
        recordedById: input.recordedById,
        notes: input.notes?.trim() || null,
      },
      update: {
        recordedById: input.recordedById,
        notes: input.notes?.trim() || null,
      },
    });

    await tx.stockAuditItem.deleteMany({ where: { auditId: audit.id } });

    if (input.items.length > 0) {
      await tx.stockAuditItem.createMany({
        data: input.items.map((item) => ({
          auditId: audit.id,
          productId: item.productId,
          countedBaseQty: new Prisma.Decimal(String(item.countedBaseQty)),
        })),
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.recordedById,
        action: "STOCK_AUDIT_SAVED",
        entityType: "StockAudit",
        entityId: audit.id,
        details: {
          warehouseId: input.warehouseId,
          auditDate: input.auditDate,
          itemCount: input.items.length,
        },
      },
    });

    return audit;
  });
}
