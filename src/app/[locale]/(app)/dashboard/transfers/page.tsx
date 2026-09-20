import {
  AlertCircle,
  CheckCircle2,
  Truck,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { TransferForm, type TransferProductOption } from "./transfer-form";
import {
  TransfersDirectory,
  type TransferDirectoryItem,
} from "./transfers-directory";

function transferErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code?: string,
) {
  switch (code) {
    case "insufficient_stock":
      return t("transfers.insufficient");
    case "same_warehouse":
      return t("transfers.sameWarehouse");
    case "transfer_not_pending":
      return t("transfers.notPending");
    case "invalid_quantity":
      return t("stock.invalidQuantity");
    case "invalid_warehouse":
    case "warehouse":
      return t("stock.warehouseRequired");
    case "upload_failed":
      return t("transfers.proofUploadPartial");
    default:
      return t("common.error");
  }
}

export default async function TransfersPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    sourceId?: string;
    transferId?: string;
    focus?: string;
  }>;
}) {
  const session = await requireOfficeSession();
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const canCreate =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";
  const canDecide =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";
  const canEditMedia = canCreate;

  const warehouses = await prisma.warehouse.findMany({
    orderBy: [{ type: "asc" }, { createdAt: "asc" }],
  });

  const sourceId =
    session.user.role === "ADMIN"
      ? (params.sourceId && warehouses.some((item) => item.id === params.sourceId)
          ? params.sourceId
          : (warehouses.find((item) => item.type === "MAIN")?.id ?? warehouses[0]?.id ?? ""))
      : (session.user.warehouseId ?? "");

  const sourceWarehouse = warehouses.find((item) => item.id === sourceId);
  const destinations = warehouses.filter((item) => item.id !== sourceId);

  const [products, inventories, transfers] = await Promise.all([
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      include: {
        units: { orderBy: { conversionRatio: "desc" } },
        primaryMedia: { select: { url: true } },
      },
    }),
    sourceId
      ? prisma.stockInventory.findMany({ where: { warehouseId: sourceId } })
      : Promise.resolve([]),
    prisma.stockTransfer.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        source: true,
        destination: true,
        items: {
          include: {
            product: { include: { primaryMedia: { select: { url: true } } } },
            productUnit: true,
          },
        },
      },
      where:
        session.user.role === "ADMIN"
          ? undefined
          : session.user.warehouseId
            ? {
                OR: [
                  { sourceId: session.user.warehouseId },
                  { destinationId: session.user.warehouseId },
                ],
              }
            : { id: "never" },
    }),
  ]);

  const transferIds = transfers.map((row) => row.id);
  const transferMedia =
    transferIds.length > 0
      ? await prisma.mediaAsset.findMany({
          where: {
            kind: "STOCK",
            entityType: "StockTransfer",
            entityId: { in: transferIds },
          },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
        })
      : [];

  const primaryByTransfer = new Map<string, string>();
  for (const asset of transferMedia) {
    if (!primaryByTransfer.has(asset.entityId)) {
      primaryByTransfer.set(asset.entityId, asset.url);
    }
  }

  const qtyByProduct = new Map(inventories.map((row) => [row.productId, row.baseQty.toString()]));
  const productOptions: TransferProductOption[] = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    name: localized(product.name, locale),
    baseQty: qtyByProduct.get(product.id) ?? "0",
    primaryMediaUrl: product.primaryMedia?.url ?? null,
    units: product.units.map((unit) => ({
      id: unit.id,
      name: localized(unit.unitName, locale),
      barcode: unit.barcode,
      conversionRatio: unit.conversionRatio.toString(),
      isBaseUnit: unit.isBaseUnit,
    })),
  }));

  const dateFmt = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const directoryItems: TransferDirectoryItem[] = transfers.map((transfer) => {
    const incoming = transfer.destinationId === session.user.warehouseId;
    const showDecide =
      canDecide &&
      transfer.status === "PENDING" &&
      (session.user.role === "ADMIN" || incoming);

    return {
      id: transfer.id,
      status: transfer.status,
      sourceName: localized(transfer.source.name, locale),
      sourceType: transfer.source.type,
      destinationName: localized(transfer.destination.name, locale),
      destinationType: transfer.destination.type,
      notes: transfer.notes,
      createdAtLabel: dateFmt.format(transfer.createdAt),
      primaryMediaUrl: primaryByTransfer.get(transfer.id) ?? null,
      showDecide,
      lines: transfer.items.map((item) => ({
        id: item.id,
        sku: item.product.sku,
        productName: localized(item.product.name, locale),
        qtyLabel: `${item.quantity.toString()} ${localized(item.productUnit.unitName, locale)}`,
        baseQtyLabel: `${item.baseQuantity.toString()} ${t("transfers.baseUnits")}`,
        primaryMediaUrl: item.product.primaryMedia?.url ?? null,
      })),
    };
  });

  const focusTransferId =
    params.focus === "photos" && params.transferId ? params.transferId : undefined;

  return (
    <main className="mx-auto w-full max-w-content space-y-3">
      <header className="flex flex-wrap items-center gap-2 text-start">
        <Truck className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
        <h1 className="text-lg font-bold tracking-tight text-fg sm:text-xl">
          {t("transfers.title")}
        </h1>
      </header>

      {params.error ? (
        <p
          className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{transferErrorMessage(t, params.error)}</span>
        </p>
      ) : null}
      {params.ok ? (
        <p className="flex items-start gap-2 rounded-lg border border-judi-200 bg-judi-50 px-3 py-2 text-sm text-judi-900 text-start dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {params.ok === "accepted"
              ? t("transfers.accepted")
              : params.ok === "rejected"
                ? t("transfers.rejected")
                : t("transfers.created")}
          </span>
        </p>
      ) : null}

      {session.user.role !== "ADMIN" && !canCreate ? (
        <p className="text-start text-sm text-fg-muted">
          {t("transfers.from")}:{" "}
          <span className="font-medium text-fg">
            {sourceWarehouse
              ? localized(sourceWarehouse.name, locale)
              : t("dashboard.noWarehouse")}
          </span>
        </p>
      ) : null}

      <div
        className={
          canCreate && sourceId && productOptions.length > 0 && destinations.length > 0
            ? "grid gap-3 lg:grid-cols-2 lg:items-start"
            : undefined
        }
      >
        {canCreate && sourceId && productOptions.length > 0 && destinations.length > 0 ? (
          <section className="rounded-xl border border-line bg-surface p-3">
            <h2 className="mb-2 text-start text-sm font-semibold text-fg">
              {t("transfers.create")}
            </h2>
            <TransferForm
              sourceId={sourceId}
              sourceLabel={
                sourceWarehouse
                  ? `${localized(sourceWarehouse.name, locale)} (${t(`warehouseTypes.${sourceWarehouse.type}`)})`
                  : t("dashboard.noWarehouse")
              }
              sources={
                session.user.role === "ADMIN"
                  ? warehouses.map((warehouse) => ({
                      id: warehouse.id,
                      label: `${localized(warehouse.name, locale)} (${t(`warehouseTypes.${warehouse.type}`)})`,
                    }))
                  : undefined
              }
              destinations={destinations.map((warehouse) => ({
                id: warehouse.id,
                label: `${localized(warehouse.name, locale)} (${t(`warehouseTypes.${warehouse.type}`)})`,
              }))}
              products={productOptions}
            />
          </section>
        ) : null}

        <TransfersDirectory
          transfers={directoryItems}
          focusTransferId={focusTransferId}
          canEditMedia={canEditMedia}
        />
      </div>
    </main>
  );
}
