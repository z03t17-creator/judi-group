import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Warehouse,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { breakdownBaseQty, displayBaseQty } from "@/lib/uom";
import {
  StockInventoryDirectory,
  type StockInventoryItem,
} from "@/components/stock-inventory";
import { WarehousePicker } from "./warehouse-picker";
import { RecentStockMovements, type RecentMovementRow } from "./recent-movements";

function stockErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code?: string,
) {
  switch (code) {
    case "insufficient_stock":
      return t("stock.insufficient");
    case "invalid_quantity":
      return t("stock.invalidQuantity");
    case "invalid_unit":
    case "invalid_product":
    case "invalid_warehouse":
    case "warehouse":
      return t("stock.warehouseRequired");
    case "upload_failed":
      return t("stock.proofUploadPartial");
    default:
      return t("common.error");
  }
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    warehouseId?: string;
    movementId?: string;
    focus?: string;
  }>;
}) {
  const session = await requireOfficeSession();
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const canMutate =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const warehouses = await prisma.warehouse.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  const selectedWarehouseId =
    session.user.role === "ADMIN"
      ? (params.warehouseId && warehouses.some((item) => item.id === params.warehouseId)
          ? params.warehouseId
          : (warehouses.find((item) => item.type === "MAIN")?.id ?? warehouses[0]?.id ?? ""))
      : (session.user.warehouseId ?? "");

  const selectedWarehouse = warehouses.find((item) => item.id === selectedWarehouseId);

  const [products, inventories, recentMovements] = selectedWarehouseId
    ? await Promise.all([
        prisma.product.findMany({
          orderBy: { sku: "asc" },
          include: {
            units: { orderBy: { conversionRatio: "desc" } },
            primaryMedia: { select: { url: true } },
          },
        }),
        prisma.stockInventory.findMany({
          where: { warehouseId: selectedWarehouseId },
        }),
        prisma.stockMovement.findMany({
          where: {
            warehouseId: selectedWarehouseId,
            type: { in: ["RECEIVE", "WRITE_OFF"] },
          },
          orderBy: { createdAt: "desc" },
          take: 12,
          include: {
            product: {
              include: { primaryMedia: { select: { url: true } } },
            },
            productUnit: true,
          },
        }),
      ])
    : [[], [], []];

  const movementIds = recentMovements.map((row) => row.id);
  const movementMedia =
    movementIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: {
            kind: "STOCK",
            entityType: "StockMovement",
            entityId: { in: movementIds },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        })
      : [];

  const primaryByMovement = new Map<string, string>();
  for (const asset of movementMedia) {
    if (!primaryByMovement.has(asset.entityId)) {
      primaryByMovement.set(asset.entityId, asset.url);
    }
  }

  const qtyByProduct = new Map(inventories.map((row) => [row.productId, row.baseQty.toString()]));

  const inventoryItems: StockInventoryItem[] = products.map((product) => {
    const baseQty = qtyByProduct.get(product.id) ?? "0";
    const { safe, isNegative, raw } = displayBaseQty(baseQty);
    const breakdown = breakdownBaseQty(
      safe,
      product.units.map((unit) => ({
        conversionRatio: unit.conversionRatio.toString(),
        name: localized(unit.unitName, locale),
      })),
    );
    const parts = breakdown.parts
      .map((part) => `${part.count.toString()} ${part.name}`)
      .join(" · ");

    return {
      id: product.id,
      sku: product.sku,
      displayName: localized(product.name, locale),
      baseQty,
      baseQtyLabel: raw.toString(),
      isNegative,
      breakdown: parts,
      primaryMediaUrl: product.primaryMedia?.url ?? null,
    };
  });

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const recentRows: RecentMovementRow[] = recentMovements.map((movement) => ({
    id: movement.id,
    type: movement.type === "RECEIVE" ? "RECEIVE" : "WRITE_OFF",
    productLabel: `${movement.product.sku} · ${localized(movement.product.name, locale)}`,
    qtyLabel: `${movement.quantity.toString()} ${localized(movement.productUnit.unitName, locale)}`,
    notes: movement.notes,
    createdAtLabel: dateFmt.format(movement.createdAt),
    primaryMediaUrl: primaryByMovement.get(movement.id) ?? null,
    productMediaUrl: movement.product.primaryMedia?.url ?? null,
  }));

  const focusMovementId =
    params.focus === "photos" && params.movementId ? params.movementId : undefined;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-indigo">
          <Boxes className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">{t("stock.title")}</h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("stock.subtitle")}</p>
        </div>
      </header>

      {params.error ? (
        <p
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{stockErrorMessage(t, params.error)}</span>
        </p>
      ) : null}
      {params.ok ? (
        <p className="flex items-start gap-3 rounded-2xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 text-start dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>
            {params.ok === "writtenOff" ? t("stock.writtenOff") : t("stock.received")}
            {focusMovementId ? ` ${t("stock.addProofAfter")}` : ""}
          </span>
        </p>
      ) : null}

      {session.user.role === "ADMIN" ? (
        <WarehousePicker
          label={t("stock.warehouse")}
          selectedId={selectedWarehouseId}
          warehouses={warehouses.map((warehouse) => ({
            id: warehouse.id,
            label: `${localized(warehouse.name, locale)} (${t(`warehouseTypes.${warehouse.type}`)})`,
          }))}
        />
      ) : (
        <div className="flex items-center gap-2 text-start text-sm text-fg-muted">
          <Warehouse className="size-4 shrink-0" aria-hidden />
          <span>
            {t("stock.warehouse")}:{" "}
            <span className="font-medium text-fg">
              {selectedWarehouse
                ? localized(selectedWarehouse.name, locale)
                : t("dashboard.noWarehouse")}
            </span>
          </span>
        </div>
      )}

      <StockInventoryDirectory items={inventoryItems} />

      {selectedWarehouseId ? (
        <RecentStockMovements
          movements={recentRows}
          focusMovementId={focusMovementId}
          canEdit={canMutate}
        />
      ) : null}
    </main>
  );
}
