import {
  AlertCircle,
  ArrowLeft,
  Boxes,
  CheckCircle2,
  Package,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { breakdownBaseQty, displayBaseQty } from "@/lib/uom";
import {
  StockInventoryDirectory,
  type StockInventoryItem,
} from "@/components/stock-inventory";
import { Thumb } from "@/components/thumb";
import { StoreStockForms } from "@/app/[locale]/(app)/dashboard/stores/[id]/stock/store-stock-forms";
import {
  StorePlacementsDirectory,
  type StorePlacementDirectoryItem,
} from "@/app/[locale]/(app)/dashboard/stores/[id]/stock/store-placements-directory";
import type { StorePlacementProductOption } from "@/app/[locale]/(app)/dashboard/stores/[id]/stock/store-placement-form";

function storeStockErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code?: string,
) {
  switch (code) {
    case "insufficient_stock":
      return t("storeStock.insufficient");
    case "insufficient_store_stock":
      return t("storeStock.insufficientStore");
    case "invalid_quantity":
      return t("stock.invalidQuantity");
    case "invalid_unit":
    case "invalid_product":
    case "invalid_warehouse":
    case "warehouse":
      return t("stock.warehouseRequired");
    case "invalid_store":
      return t("storeStock.invalidStore");
    case "invalid_expiry":
      return t("storeStock.invalidExpiry");
    case "no_lines":
      return t("storeStock.needLines");
    case "upload_failed":
      return t("storeStock.proofUploadPartial");
    default:
      return t("common.error");
  }
}

export default async function FieldStoreStockPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    error?: string;
    ok?: string;
    warehouseId?: string;
    placementId?: string;
    focus?: string;
    tab?: string;
  }>;
}) {
  const session = await requireRole(["FIELD_DELEGATE"]);
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const { id: storeId } = await params;
  const query = await searchParams;
  const warehouseId = session.user.warehouseId!;

  const [store, warehouse] = await Promise.all([
    prisma.store.findUnique({
      where: { id: storeId },
      include: { primaryMedia: { select: { url: true } } },
    }),
    prisma.warehouse.findUnique({ where: { id: warehouseId } }),
  ]);

  if (!store || !warehouse) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-4">
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {t("storeStock.invalidStore")}
        </p>
        <Link
          href="/field/customers"
          className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("nav.customers")}
        </Link>
      </div>
    );
  }

  const [products, warehouseInventories, storeInventories, placements] =
    await Promise.all([
      prisma.product.findMany({
        orderBy: { sku: "asc" },
        include: {
          units: { orderBy: { conversionRatio: "desc" } },
          primaryMedia: { select: { url: true } },
        },
      }),
      prisma.stockInventory.findMany({ where: { warehouseId } }),
      prisma.storeInventory.findMany({
        where: { storeId },
        include: {
          product: {
            include: {
              units: { orderBy: { conversionRatio: "desc" } },
              primaryMedia: { select: { url: true } },
            },
          },
        },
      }),
      prisma.storePlacement.findMany({
        where: { storeId },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          warehouse: true,
          createdBy: { select: { fullName: true } },
          items: {
            include: {
              product: { include: { primaryMedia: { select: { url: true } } } },
              productUnit: true,
            },
          },
        },
      }),
    ]);

  const warehouseQty = new Map(
    warehouseInventories.map((row) => [row.productId, row.baseQty.toString()]),
  );

  const placeProducts: StorePlacementProductOption[] = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: localized(product.name, locale),
    baseQty: warehouseQty.get(product.id) ?? "0",
    primaryMediaUrl: product.primaryMedia?.url ?? null,
    units: product.units.map((unit) => ({
      id: unit.id,
      name: localized(unit.unitName, locale),
      barcode: unit.barcode,
      conversionRatio: unit.conversionRatio.toString(),
      isBaseUnit: unit.isBaseUnit,
    })),
  }));

  const returnProducts: StorePlacementProductOption[] = storeInventories
    .filter((row) => Number(row.baseQty.toString()) > 0)
    .map((row) => ({
      id: row.product.id,
      sku: row.product.sku,
      barcode: row.product.barcode,
      name: localized(row.product.name, locale),
      baseQty: row.baseQty.toString(),
      primaryMediaUrl: row.product.primaryMedia?.url ?? null,
      units: row.product.units.map((unit) => ({
        id: unit.id,
        name: localized(unit.unitName, locale),
        barcode: unit.barcode,
        conversionRatio: unit.conversionRatio.toString(),
        isBaseUnit: unit.isBaseUnit,
      })),
    }));

  const inventoryItems: StockInventoryItem[] = storeInventories.map((row) => {
    const baseQty = row.baseQty.toString();
    const { safe, isNegative, raw } = displayBaseQty(baseQty);
    const breakdown = breakdownBaseQty(
      safe,
      row.product.units.map((unit) => ({
        conversionRatio: unit.conversionRatio.toString(),
        name: localized(unit.unitName, locale),
      })),
    );
    const parts = breakdown.parts
      .map((part) => `${part.count.toString()} ${part.name}`)
      .join(" · ");
    return {
      id: row.productId,
      sku: row.product.sku,
      displayName: localized(row.product.name, locale),
      baseQty,
      baseQtyLabel: raw.toString(),
      isNegative,
      breakdown: parts,
      primaryMediaUrl: row.product.primaryMedia?.url ?? null,
    };
  });

  const placementIds = placements.map((row) => row.id);
  const placementMedia =
    placementIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: {
            kind: "STOCK",
            entityType: "StorePlacement",
            entityId: { in: placementIds },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        })
      : [];

  const primaryByPlacement = new Map<string, string>();
  for (const asset of placementMedia) {
    if (!primaryByPlacement.has(asset.entityId)) {
      primaryByPlacement.set(asset.entityId, asset.url);
    }
  }

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const placementItems: StorePlacementDirectoryItem[] = placements.map((row) => ({
    id: row.id,
    direction: row.direction,
    warehouseName: localized(row.warehouse.name, locale),
    notes: row.notes,
    createdAtLabel: dateFmt.format(row.createdAt),
    createdByName: row.createdBy.fullName,
    primaryMediaUrl: primaryByPlacement.get(row.id) ?? null,
    lines: row.items.map((item) => ({
      id: item.id,
      sku: item.product.sku,
      productName: localized(item.product.name, locale),
      qtyLabel: `${item.quantity.toString()} ${localized(item.productUnit.unitName, locale)}`,
      baseQtyLabel: item.baseQuantity.toString(),
      primaryMediaUrl: item.product.primaryMedia?.url ?? null,
      expiryLabel: item.expiryDate
        ? item.expiryDate.toISOString().slice(0, 10)
        : null,
      lotCode: item.lotCode,
    })),
  }));

  const warehouseOptions = [
    {
      id: warehouse.id,
      label: `${localized(warehouse.name, locale)} (${t(`warehouseTypes.${warehouse.type}`)})`,
    },
  ];

  const initialTab = query.tab === "return" ? "return" : "place";

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          href="/field/customers"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("field.back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <Thumb
          kind="store"
          size="lg"
          src={store.primaryMedia?.url}
          alt={store.storeName}
        />
        <div className="min-w-0 flex-1 text-start">
          <p className="text-sm font-medium text-judi-800 dark:text-judi-200">
            {t("storeStock.title")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {store.storeName}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("storeStock.fieldSubtitle")}</p>
        </div>
      </header>

      {query.error ? (
        <p className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {storeStockErrorMessage(t, query.error)}
        </p>
      ) : null}
      {query.ok === "placed" || query.ok === "returned" ? (
        <p className="flex items-start gap-2 rounded-xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 text-start dark:border-judi-800 dark:bg-judi-950/40 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          {query.ok === "placed" ? t("storeStock.placed") : t("storeStock.returned")}
          {query.focus === "photos" ? ` ${t("storeStock.addProofAfter")}` : ""}
        </p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-start gap-2 text-start">
          <Boxes
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold text-fg">{t("storeStock.onHandTitle")}</h2>
            <p className="text-xs text-fg-muted">{t("storeStock.onHandHint")}</p>
          </div>
        </div>
        <StockInventoryDirectory
          items={inventoryItems}
          emptyTitle={t("storeStock.emptyInventory")}
          emptyHint={t("storeStock.emptyInventoryHint")}
        />
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
        <div className="flex items-start gap-2 text-start">
          <Package
            className="mt-0.5 size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold text-fg">{t("storeStock.moveTitle")}</h2>
            <p className="text-xs text-fg-muted">{t("storeStock.fieldMoveHint")}</p>
          </div>
        </div>
        <StoreStockForms
          storeId={store.id}
          storeName={store.storeName}
          warehouses={warehouseOptions}
          warehouseId={warehouseId}
          placeProducts={placeProducts}
          returnProducts={returnProducts}
          fromField
          initialTab={initialTab}
        />
      </section>

      <section className="space-y-3">
        <div className="text-start">
          <h2 className="text-sm font-semibold text-fg">{t("storeStock.recentTitle")}</h2>
          <p className="text-xs text-fg-muted">{t("storeStock.recentHint")}</p>
        </div>
        <StorePlacementsDirectory
          placements={placementItems}
          focusPlacementId={query.focus === "photos" ? query.placementId : undefined}
          canEditMedia
        />
      </section>
    </div>
  );
}
