import { ArrowLeft, Boxes } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { breakdownBaseQty, displayBaseQty } from "@/lib/uom";
import { loadVanReconciliation } from "@/lib/reports/van-reconciliation-load";
import { toBaghdadYmd } from "@/lib/reports/date";
import { ensureStockAuditShell } from "@/lib/stock-audit-apply";
import {
  StockInventoryDirectory,
  type StockInventoryItem,
} from "@/components/stock-inventory";
import { FieldStockMediaSections } from "./field-stock-media";

export default async function FieldStockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireRole(["FIELD_DELEGATE"]);
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const warehouseId = session.user.warehouseId!;
  const today = toBaghdadYmd(new Date());

  const warehouse = await prisma.warehouse.findUnique({
    where: { id: warehouseId },
  });

  const [products, inventories, pending, recon, todayAudit] = await Promise.all([
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      include: {
        units: { orderBy: { conversionRatio: "desc" } },
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.stockInventory.findMany({ where: { warehouseId } }),
    prisma.stockTransfer.findMany({
      where: { destinationId: warehouseId, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        source: true,
        items: { include: { product: true, productUnit: true } },
      },
    }),
    warehouse?.type === "VAN"
      ? loadVanReconciliation({ vanId: warehouseId, date: today, locale })
      : Promise.resolve(null),
    ensureStockAuditShell({
      warehouseId,
      auditDate: today,
      recordedById: session.user.id,
    }),
  ]);

  const transferIds = pending.map((row) => row.id);
  const linkedMedia = await prisma.mediaAsset.findMany({
    where: {
      kind: "STOCK",
      OR: [
        { entityType: "StockAudit", entityId: todayAudit.id },
        ...(transferIds.length > 0
          ? [{ entityType: "StockTransfer", entityId: { in: transferIds } }]
          : []),
      ],
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  const auditPrimaryUrl =
    linkedMedia.find((row) => row.entityType === "StockAudit")?.url ?? null;

  const primaryByTransfer = new Map<string, string>();
  for (const asset of linkedMedia) {
    if (asset.entityType !== "StockTransfer") continue;
    if (!primaryByTransfer.has(asset.entityId)) {
      primaryByTransfer.set(asset.entityId, asset.url);
    }
  }

  const qtyByProduct = new Map(inventories.map((row) => [row.productId, row.baseQty.toString()]));
  const reconByProduct = new Map(
    (recon?.auditItems ?? []).map((item) => [item.productId, item]),
  );

  const inventoryItems: StockInventoryItem[] = products.map((product) => {
    const baseQty = qtyByProduct.get(product.id) ?? "0";
    const expected = reconByProduct.get(product.id)?.expectedClosingQty ?? null;
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
      expectedQtyLabel: expected,
    };
  });

  return (
    <main className="mx-auto w-full max-w-content space-y-4 sm:space-y-6">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          href="/field"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("field.back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="flex items-center gap-2 text-sm font-medium text-judi-800 dark:text-judi-200">
            <Boxes className="size-4 shrink-0" aria-hidden />
            {t("field.inventoryTitle")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.vanStock")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">
            {t("field.warehouseLabel")}:{" "}
            {warehouse ? localized(warehouse.name, locale) : t("dashboard.noWarehouse")}
          </p>
          <p className="mt-0.5 text-sm text-fg-subtle">{t("field.inventorySubtitle")}</p>
        </div>
      </header>

      <FieldStockMediaSections
        auditId={todayAudit.id}
        auditDateLabel={today}
        auditPrimaryUrl={auditPrimaryUrl}
        transfers={pending.map((transfer) => ({
          id: transfer.id,
          label: `${t("transfers.from")}: ${localized(transfer.source.name, locale)}`,
          primaryMediaUrl: primaryByTransfer.get(transfer.id) ?? null,
          lines: transfer.items.map(
            (item) =>
              `${item.product.sku} · ${item.quantity.toString()} ${localized(item.productUnit.unitName, locale)} = ${item.baseQuantity.toString()} ${t("transfers.baseUnits")}`,
          ),
        }))}
      />

      {recon ? (
        <section className="surface-panel space-y-3 p-4">
          <div className="text-start">
            <h2 className="font-semibold text-fg">{t("reports.todayRecon")}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {t("reports.todayReconHint", { date: today })}
            </p>
          </div>
          <ul className="space-y-2 text-sm">
            {recon.auditItems.slice(0, 6).map((item) => (
              <li
                key={item.productId}
                className="flex min-h-touch flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-muted/40 px-3 py-2"
              >
                <span className="font-medium text-fg text-start">
                  {item.sku} · {item.name}
                </span>
                <span className="text-fg-muted text-end tabular-nums">
                  {t("reports.reconExpected")}: {item.expectedClosingQty} · {t("stock.onHand")}:{" "}
                  {item.actualClosingQty}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {params.error ? (
        <p
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {params.error === "insufficient_stock"
            ? t("transfers.insufficient")
            : params.error === "transfer_not_pending"
              ? t("transfers.notPending")
              : t("common.error")}
        </p>
      ) : null}
      {params.ok ? (
        <p className="rounded-2xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 dark:border-judi-800 dark:bg-judi-950/40 dark:text-judi-100">
          {params.ok === "accepted" ? t("transfers.accepted") : t("transfers.rejected")}
        </p>
      ) : null}

      <section aria-labelledby="field-stock-inventory-heading" className="space-y-3">
        <h2 id="field-stock-inventory-heading" className="sr-only">
          {t("field.inventoryFiltersTitle")}
        </h2>
        <StockInventoryDirectory items={inventoryItems} />
      </section>
    </main>
  );
}
