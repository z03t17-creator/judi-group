import { ArrowLeft, RotateCcw } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { ReturnForm } from "./return-form";

export default async function FieldReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; storeId?: string }>;
}) {
  const session = await requireRole(["FIELD_DELEGATE"]);
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const warehouseId = session.user.warehouseId!;

  const [stores, products, inventories] = await Promise.all([
    prisma.store.findMany({
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
    prisma.stockInventory.findMany({ where: { warehouseId } }),
  ]);

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

  const errorMessage =
    params.error === "discount_cap"
      ? t("invoices.discountCap")
      : params.error
        ? t("common.error")
        : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
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
            <RotateCcw className="size-4 shrink-0" aria-hidden />
            {t("invoices.types.RETURN")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.returnTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.returnHint")}</p>
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

      <ReturnForm
        maxDiscount={session.user.maxDiscountAllowed}
        initialStoreId={params.storeId ?? null}
        stores={stores.map((store) => ({
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
        }))}
        products={products.map((product) => {
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
        })}
      />
    </main>
  );
}
