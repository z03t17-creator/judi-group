import {
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { PurchaseForm, type PurchaseProductOption } from "./purchase-form";
import {
  PurchasesDirectory,
  type PurchaseDirectoryItem,
} from "./purchases-directory";
import { PurchasesWorkspace } from "./purchases-workspace";

function purchaseErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code?: string,
) {
  switch (code) {
    case "invalid_supplier":
      return t("purchases.invalidSupplier");
    case "already_received":
      return t("purchases.alreadyReceived");
    case "cancelled":
      return t("purchases.cancelledBlocked");
    case "not_draft":
      return t("purchases.notDraft");
    case "invalid_expiry":
      return t("purchases.invalidExpiry");
    case "no_lines":
      return t("purchases.needLines");
    case "invalid_warehouse":
    case "warehouse":
      return t("stock.warehouseRequired");
    case "upload_failed":
      return t("purchases.proofUploadPartial");
    default:
      return t("common.error");
  }
}

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    warehouseId?: string;
    supplierId?: string;
    purchaseId?: string;
    receiptId?: string;
    focus?: string;
  }>;
}) {
  const session = await requireOfficeSession();
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const [warehouses, suppliers, products, purchases] = await Promise.all([
    prisma.warehouse.findMany({
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
    prisma.supplier.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      include: {
        units: { orderBy: { conversionRatio: "desc" } },
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        supplier: true,
        warehouse: true,
        createdBy: { select: { fullName: true } },
        receipt: true,
        lines: {
          include: {
            product: { include: { primaryMedia: { select: { url: true } } } },
            productUnit: true,
          },
        },
      },
      where:
        session.user.role === "ADMIN"
          ? undefined
          : { warehouseId: session.user.warehouseId ?? undefined },
    }),
  ]);

  const warehouseId =
    session.user.role === "ADMIN"
      ? (params.warehouseId &&
        warehouses.some((item) => item.id === params.warehouseId)
          ? params.warehouseId
          : (warehouses.find((item) => item.type === "MAIN")?.id ??
            warehouses[0]?.id ??
            ""))
      : (session.user.warehouseId ?? "");

  const warehouse = warehouses.find((item) => item.id === warehouseId);

  const mediaEntityIds = purchases.flatMap((row) => {
    const ids = [row.id];
    if (row.receipt) ids.push(row.receipt.id);
    return ids;
  });

  const mediaRows =
    mediaEntityIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: {
            kind: "STOCK",
            entityType: { in: ["PurchaseOrder", "PurchaseReceipt"] },
            entityId: { in: mediaEntityIds },
            isPrimary: true,
          },
          select: { entityId: true, url: true },
        })
      : [];
  const mediaByEntity = new Map(mediaRows.map((row) => [row.entityId, row.url]));

  const directoryItems: PurchaseDirectoryItem[] = purchases.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    currency: row.currency,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    receivedAt: row.receivedAt?.toISOString() ?? null,
    supplierName: row.supplier.name,
    warehouseName: localized(row.warehouse.name, locale),
    createdByName: row.createdBy.fullName,
    receiptId: row.receipt?.id ?? null,
    receiptNumber: row.receipt?.receiptNumber ?? null,
    primaryMediaUrl:
      (row.receipt ? mediaByEntity.get(row.receipt.id) : null) ??
      mediaByEntity.get(row.id) ??
      null,
    lineCount: row.lines.length,
    lines: row.lines.map((line) => ({
      id: line.id,
      productName: localized(line.product.name, locale),
      productSku: line.product.sku,
      unitName: localized(line.productUnit.unitName, locale),
      quantity: line.quantity.toString(),
      unitCost: line.unitCost.toString(),
      currency: line.currency,
      lotCode: line.lotCode,
      expiryDate: line.expiryDate
        ? line.expiryDate.toISOString().slice(0, 10)
        : null,
      primaryMediaUrl: line.product.primaryMedia?.url ?? null,
    })),
  }));

  const productOptions: PurchaseProductOption[] = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: localized(product.name, locale),
    primaryMediaUrl: product.primaryMedia?.url ?? null,
    shelfLifeDays: product.shelfLifeDays,
    units: product.units.map((unit) => ({
      id: unit.id,
      name: localized(unit.unitName, locale),
      barcode: unit.barcode,
      conversionRatio: unit.conversionRatio.toString(),
      isBaseUnit: unit.isBaseUnit,
    })),
  }));

  const errorMessage = params.error
    ? purchaseErrorMessage(t, params.error)
    : null;

  const okMessage =
    params.ok === "received"
      ? t("purchases.received")
      : params.ok === "created"
        ? t("purchases.created")
        : params.ok === "cancelled"
          ? t("purchases.cancelled")
          : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-3">
      <header className="flex flex-wrap items-center gap-2.5">
        <span className="icon-badge icon-badge-sm tone-blue">
          <ShoppingCart className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-lg font-bold tracking-tight text-fg">
            {t("purchases.title")}
          </h1>
          <p className="text-xs text-fg-muted">{t("purchases.subtitle")}</p>
        </div>
      </header>

      {errorMessage ? (
        <p
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </p>
      ) : null}
      {okMessage ? (
        <p className="flex items-start gap-2 rounded-xl border border-judi-200 bg-judi-50 px-3 py-2 text-sm text-judi-900 text-start dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{okMessage}</span>
        </p>
      ) : null}

      <PurchasesWorkspace
        canManage={canManage && Boolean(warehouseId)}
        initialTab={
          params.purchaseId || params.ok || params.error ? "list" : "new"
        }
        form={
          <PurchaseForm
            warehouseId={warehouseId}
            warehouseLabel={
              warehouse ? localized(warehouse.name, locale) : warehouseId
            }
            warehouses={
              session.user.role === "ADMIN"
                ? warehouses.map((item) => ({
                    id: item.id,
                    label: localized(item.name, locale),
                  }))
                : undefined
            }
            suppliers={suppliers}
            products={productOptions}
            defaultSupplierId={params.supplierId}
          />
        }
        directory={
          <PurchasesDirectory
            canManage={canManage}
            purchases={directoryItems}
            focusPurchaseId={params.purchaseId}
            focusPhotos={params.focus === "photos"}
          />
        }
      />
    </main>
  );
}
