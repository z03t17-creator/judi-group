import { ArrowLeft, Package } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import {
  FieldCatalogDirectory,
  type FieldCatalogItem,
} from "./field-catalog-directory";

export default async function FieldCatalogPage() {
  await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();
  const locale = await getLocale();

  const products = await prisma.product.findMany({
    orderBy: { sku: "asc" },
    include: {
      units: { orderBy: { conversionRatio: "asc" } },
      category: true,
      subcategory: true,
      primaryMedia: { select: { url: true } },
    },
  });

  const items: FieldCatalogItem[] = products.map((product) => ({
    id: product.id,
    sku: product.sku,
    barcode: product.barcode,
    displayName: localized(product.name as LocalizedText, locale),
    displayCategory: localized(product.category.name as LocalizedText, locale),
    displaySubcategory: product.subcategory
      ? localized(product.subcategory.name as LocalizedText, locale)
      : null,
    priceCurrency: product.priceCurrency,
    primaryMediaUrl: product.primaryMedia?.url ?? null,
    units: product.units.map((unit) => ({
      id: unit.id,
      barcode: unit.barcode,
      displayName: localized(unit.unitName as LocalizedText, locale),
      conversionRatio: unit.conversionRatio.toString(),
      sellingPrice: unit.sellingPrice.toString(),
      sellingPriceUsd: unit.sellingPriceUsd.toString(),
    })),
  }));

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
            <Package className="size-4 shrink-0" aria-hidden />
            {t("field.catalogTitle")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.catalogTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.catalogSubtitle")}</p>
        </div>
      </header>

      <FieldCatalogDirectory products={items} />
    </main>
  );
}
