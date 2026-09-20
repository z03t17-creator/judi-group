import { PackagePlus } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { ProductForm } from "../product-form";
import { defaultCreateValues } from "@/lib/product-form-values";

export default async function NewProductPage() {
  await requireRole(["ADMIN", "WAREHOUSE_ACCOUNTANT"]);
  const t = await getTranslations("products");
  const locale = await getLocale();

  const categories = await prisma.productCategory.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      subcategories: { orderBy: { createdAt: "asc" } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-content space-y-2.5">
      <header className="flex flex-wrap items-center gap-2.5 no-print">
        <span className="icon-badge icon-badge-md tone-violet">
          <PackagePlus className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-lg font-bold tracking-tight text-fg">
            {t("create")}
          </h1>
          <p className="text-xs text-fg-muted">{t("photosAfterSave")}</p>
        </div>
      </header>
      <ProductForm
        values={{
          ...defaultCreateValues,
          categoryId: categories[0]?.id ?? "",
        }}
        canManage
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
