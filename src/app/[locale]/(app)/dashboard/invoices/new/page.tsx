import { ArrowLeft, FilePlus2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { toDiscountRuleSnapshot } from "@/lib/discount-engine";
import type {
  InvoiceProductOption,
  InvoiceStoreOption,
  InvoiceWarehouseOption,
} from "@/app/[locale]/(app)/field/invoice/invoice-form";
import { OfficeInvoiceCreateForm } from "./office-invoice-create-form";

export default async function OfficeCreateInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; storeId?: string; warehouseId?: string }>;
}) {
  const session = await requireRole(["ADMIN", "WAREHOUSE_ACCOUNTANT"]);
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;

  const [warehouses, stores, products, discountRules] = await Promise.all([
    prisma.warehouse.findMany({
      orderBy: [{ type: "asc" }, { createdAt: "asc" }],
    }),
    prisma.store.findMany({
      where: { status: "ACTIVE" },
      orderBy: { storeName: "asc" },
      include: { primaryMedia: { select: { url: true } } },
    }),
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      include: {
        units: { orderBy: { conversionRatio: "desc" } },
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.discountRule.findMany({
      where: { active: true },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  const warehouseOptions: InvoiceWarehouseOption[] = warehouses.map((warehouse) => ({
    id: warehouse.id,
    label: `${localized(warehouse.name, locale)} (${t(`warehouseTypes.${warehouse.type}`)})`,
  }));

  const warehouseId =
    session.user.role === "ADMIN"
      ? params.warehouseId &&
        warehouses.some((item) => item.id === params.warehouseId)
        ? params.warehouseId
        : (warehouses.find((item) => item.type === "MAIN")?.id ??
          warehouses[0]?.id ??
          "")
      : (session.user.warehouseId ?? "");

  const warehouse = warehouses.find((item) => item.id === warehouseId);

  const inventories = warehouseId
    ? await prisma.stockInventory.findMany({ where: { warehouseId } })
    : [];

  const qtyByProduct = new Map(
    inventories.map((row) => [
      row.productId,
      {
        qty: row.baseQty.toString(),
        custom: row.customPrice?.toString() ?? null,
        customUsd: row.customPriceUsd?.toString() ?? null,
      },
    ]),
  );

  const storeOptions: InvoiceStoreOption[] = stores.map((store) => ({
    id: store.id,
    storeName: store.storeName,
    phone: store.phone,
    address: store.address,
    thumbUrl: store.primaryMedia?.url ?? null,
    tier: store.tier,
    creditLimit: store.creditLimit.toString(),
    currentDebt: store.currentDebt.toString(),
    creditLimitUsd: store.creditLimitUsd.toString(),
    currentDebtUsd: store.currentDebtUsd.toString(),
  }));

  const productOptions: InvoiceProductOption[] = products.map((product) => {
    const inv = qtyByProduct.get(product.id);
    return {
      id: product.id,
      sku: product.sku,
      barcode: product.barcode,
      name: localized(product.name, locale),
      categoryId: product.categoryId,
      thumbUrl: product.primaryMedia?.url ?? null,
      baseQty: inv?.qty ?? "0",
      customPrice: inv?.custom ?? null,
      customPriceUsd: inv?.customUsd ?? null,
      units: product.units.map((unit) => ({
        id: unit.id,
        name: localized(unit.unitName, locale),
        barcode: unit.barcode,
        conversionRatio: unit.conversionRatio.toString(),
        sellingPrice: unit.sellingPrice.toString(),
        sellingPriceUsd: unit.sellingPriceUsd.toString(),
      })),
    };
  });

  const errorMessage =
    params.error === "discount_cap"
      ? t("invoices.discountCap")
      : params.error === "credit_blocked"
        ? t("invoices.creditBlocked")
        : params.error === "insufficient_stock"
          ? t("invoices.insufficientOffice")
          : params.error === "warehouse" || params.error === "invalid_warehouse"
            ? t("stock.warehouseRequired")
            : params.error
              ? t("common.error")
              : null;

  const canPickWarehouse = session.user.role === "ADMIN" && warehouseOptions.length > 1;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          href="/dashboard/invoices"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("invoices.backToList")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <span className="icon-badge icon-badge-md tone-sky">
          <FilePlus2 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("invoices.createTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("invoices.createSubtitle")}</p>
        </div>
      </header>

      {errorMessage ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      {!warehouseId ? (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {t("stock.warehouseRequired")}
        </p>
      ) : (
        <OfficeInvoiceCreateForm
          stores={storeOptions}
          products={productOptions}
          maxDiscount={session.user.maxDiscountAllowed}
          discountRules={discountRules.map(toDiscountRuleSnapshot)}
          initialStoreId={params.storeId ?? null}
          warehouseId={warehouseId}
          warehouses={warehouseOptions}
          warehouseLabel={
            warehouse
              ? `${localized(warehouse.name, locale)} (${t(`warehouseTypes.${warehouse.type}`)})`
              : null
          }
          canPickWarehouse={canPickWarehouse}
        />
      )}
    </main>
  );
}
