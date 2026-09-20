import {
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { ProductForm } from "../product-form";
import { productToFormValues } from "@/lib/product-form-values";

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
      return t("products.unitsInvalid");
    default:
      return t("common.error");
  }
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; ok?: string; focus?: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();
  const { id } = await params;
  const query = await searchParams;
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";
  const focusPhotos = query.focus === "photos";

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        units: { orderBy: { conversionRatio: "desc" } },
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.productCategory.findMany({
      orderBy: { createdAt: "asc" },
      include: { subcategories: { orderBy: { createdAt: "asc" } } },
    }),
  ]);

  if (!product) notFound();

  const displayName = localized(product.name as LocalizedText, locale);

  return (
    <main
      id={`product-${product.id}`}
      className="mx-auto w-full max-w-content space-y-2.5"
    >
      <header className="no-print text-start">
        <h1 className="truncate text-lg font-bold tracking-tight text-fg">
          {canManage ? t("products.edit") : t("products.view")}
          <span className="ms-2 font-mono text-sm font-semibold tabular-nums text-fg-muted">
            {product.sku}
          </span>
        </h1>
        {displayName ? (
          <p className="truncate text-sm text-fg-muted">{displayName}</p>
        ) : null}
      </header>

      {query.error ? (
        <p
          className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{productErrorMessage(t, query.error)}</span>
        </p>
      ) : null}
      {query.ok ? (
        <p className="flex items-start gap-2 rounded-xl border border-judi-200 bg-judi-50 px-3 py-2 text-sm text-judi-900 text-start dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {query.ok === "created" ? t("products.created") : t("products.updated")}
          </span>
        </p>
      ) : null}

      <ProductForm
        values={productToFormValues(product)}
        canManage={canManage}
        media={{
          productId: product.id,
          productName: displayName || product.sku,
          initialPrimaryUrl: product.primaryMedia?.url ?? null,
          defaultOpen: focusPhotos,
          scrollOnOpen: focusPhotos,
        }}
        categories={categories.map((category) => ({
          id: category.id,
          name: localized(category.name as LocalizedText, locale),
          subcategories: category.subcategories.map((sub) => ({
            id: sub.id,
            name: localized(sub.name as LocalizedText, locale),
          })),
        }))}
      />
    </main>
  );
}
