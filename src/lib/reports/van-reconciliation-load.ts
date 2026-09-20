import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n";
import { baghdadDayBounds } from "@/lib/reports/date";
import { buildVanReconciliation } from "@/lib/reports/van-reconciliation";

export async function loadVanReconciliation(input: {
  vanId: string;
  date: string;
  locale?: string;
}) {
  const warehouse = await prisma.warehouse.findUnique({
    where: { id: input.vanId },
    include: {
      assignedUsers: {
        where: { role: "FIELD_DELEGATE" },
        take: 1,
        include: {
          primaryMedia: { select: { url: true } },
        },
      },
    },
  });
  if (!warehouse || warehouse.type !== "VAN") {
    return null;
  }

  const { start, end } = baghdadDayBounds(input.date);
  const locale = input.locale ?? "en";

  const [inventories, movements, audit] = await Promise.all([
    prisma.stockInventory.findMany({
      where: { warehouseId: warehouse.id },
      include: {
        product: {
          include: { primaryMedia: { select: { url: true } } },
        },
      },
    }),
    prisma.stockMovement.findMany({
      where: {
        warehouseId: warehouse.id,
        createdAt: { gte: start, lt: end },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.stockAudit.findUnique({
      where: {
        warehouseId_auditDate: {
          warehouseId: warehouse.id,
          auditDate: new Date(`${input.date}T00:00:00.000Z`),
        },
      },
      include: { items: true },
    }),
  ]);

  const counted = new Map(
    (audit?.items ?? []).map((item) => [item.productId, item.countedBaseQty.toString()]),
  );

  const productIds = new Set([
    ...inventories.map((inv) => inv.productId),
    ...movements.map((m) => m.productId),
  ]);

  const missingIds = [...productIds].filter(
    (id) => !inventories.some((inv) => inv.productId === id),
  );
  const extraProducts =
    missingIds.length > 0
      ? await prisma.product.findMany({
          where: { id: { in: missingIds } },
          include: { primaryMedia: { select: { url: true } } },
        })
      : [];

  const mediaByProduct = new Map<string, string | null>();
  for (const inv of inventories) {
    mediaByProduct.set(inv.productId, inv.product.primaryMedia?.url ?? null);
  }
  for (const product of extraProducts) {
    mediaByProduct.set(product.id, product.primaryMedia?.url ?? null);
  }

  const products = [
    ...inventories.map((inv) => ({
      productId: inv.productId,
      sku: inv.product.sku,
      name: localized(inv.product.name, locale),
      liveBaseQty: inv.baseQty.toString(),
      countedBaseQty: counted.get(inv.productId) ?? null,
    })),
    ...extraProducts.map((product) => ({
      productId: product.id,
      sku: product.sku,
      name: localized(product.name, locale),
      liveBaseQty: "0",
      countedBaseQty: counted.get(product.id) ?? null,
    })),
  ];

  const auditItems = buildVanReconciliation(
    products,
    movements.map((m) => ({
      productId: m.productId,
      type: m.type,
      baseQuantity: m.baseQuantity.toString(),
      createdAt: m.createdAt,
    })),
    start,
    end,
  );

  const driver = warehouse.assignedUsers[0];

  return {
    vanId: warehouse.id,
    driverName: driver?.fullName ?? null,
    driverMediaUrl: driver?.primaryMedia?.url ?? null,
    warehouseName: localized(warehouse.name, locale),
    licensePlate: warehouse.licensePlate,
    reconciliationDate: input.date,
    auditId: audit?.id ?? null,
    auditItems: auditItems.map((item) => ({
      ...item,
      primaryMediaUrl: mediaByProduct.get(item.productId) ?? null,
    })),
  };
}
