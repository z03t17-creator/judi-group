import {
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { ProductsDirectory } from "./products-directory";

function productErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code?: string,
) {
  switch (code) {
    case "inUse":
      return t("products.inUse");
    case "skuTaken":
      return t("products.skuTaken");
    case "barcodeTaken":
      return t("products.barcodeTaken");
    case "no_units":
    case "no_base_unit":
    case "multiple_base_units":
    case "base_ratio":
    case "pack_ratio":
    case "unitsInvalid":
      return t("products.unitsInvalid");
    default:
      return t("common.error");
  }
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
    include: {
      _count: { select: { units: true } },
      category: true,
      subcategory: true,
      primaryMedia: { select: { url: true } },
    },
  });

  const errorMessage = params.error
    ? productErrorMessage(t, params.error)
    : null;

  const okMessage =
    params.ok === "updated"
      ? t("products.updated")
      : params.ok === "deleted"
        ? t("products.deleted")
        : params.ok === "created"
          ? t("products.created")
          : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-violet">
          <Package className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("products.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("products.subtitle")}</p>
        </div>
      </header>

      {errorMessage ? (
        <p
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{errorMessage}</span>
        </p>
      ) : null}
      {okMessage ? (
        <p className="flex items-start gap-3 rounded-2xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 text-start dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden />
          <span>{okMessage}</span>
        </p>
      ) : null}

      <ProductsDirectory
        canManage={canManage}
        products={products.map((product) => {
          const name = product.name as LocalizedText;
          const category = product.category.name as LocalizedText;
          const subcategory = product.subcategory
            ? (product.subcategory.name as LocalizedText)
            : null;
          return {
            id: product.id,
            sku: product.sku,
            barcode: product.barcode,
            displayName: localized(name, locale),
            displayCategory: localized(category, locale),
            displaySubcategory: subcategory
              ? localized(subcategory, locale)
              : null,
            unitsCount: product._count.units,
            baseCost: product.baseCost.toString(),
            primaryMediaUrl: product.primaryMedia?.url ?? null,
          };
        })}
      />
    </main>
  );
}
