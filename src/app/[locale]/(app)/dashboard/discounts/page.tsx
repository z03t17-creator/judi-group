import {
  AlertCircle,
  BadgePercent,
  CheckCircle2,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { toDiscountRuleSnapshot } from "@/lib/discount-engine";
import { toBaghdadDateTimeLocal } from "@/lib/reports/date";
import { DiscountsDirectory } from "./discounts-directory";

export default async function DiscountsPage({
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

  const [rules, products, categories] = await Promise.all([
    prisma.discountRule.findMany({
      orderBy: [{ active: "desc" }, { priority: "desc" }, { createdAt: "desc" }],
    }),
    prisma.product.findMany({
      orderBy: { sku: "asc" },
      select: { id: true, sku: true, name: true, categoryId: true },
    }),
    prisma.productCategory.findMany({
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const errorMessage =
    params.error === "window"
      ? t("discounts.invalidWindow")
      : params.error
        ? t("common.error")
        : null;

  const okMessage =
    params.ok === "updated"
      ? t("discounts.updated")
      : params.ok === "deleted"
        ? t("discounts.deleted")
        : params.ok === "created"
          ? t("discounts.created")
          : params.ok === "activated"
            ? t("discounts.activated")
            : params.ok === "paused"
              ? t("discounts.paused")
              : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-3">
      <header className="flex flex-wrap items-center gap-2.5">
        <span className="icon-badge icon-badge-sm tone-fuchsia">
          <BadgePercent className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-lg font-bold tracking-tight text-fg">
            {t("discounts.title")}
          </h1>
          <p className="text-xs text-fg-muted">{t("discounts.subtitle")}</p>
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

      <DiscountsDirectory
        canManage={canManage}
        products={products.map((product) => ({
          id: product.id,
          sku: product.sku,
          name: localized(product.name as LocalizedText, locale),
          categoryId: product.categoryId,
        }))}
        categories={categories.map((category) => ({
          id: category.id,
          name: localized(category.name as LocalizedText, locale),
        }))}
        rules={rules.map((row) => {
          const snap = toDiscountRuleSnapshot(row);
          return {
            ...snap,
            startsAtLocal: row.startsAt ? toBaghdadDateTimeLocal(row.startsAt) : "",
            endsAtLocal: row.endsAt ? toBaghdadDateTimeLocal(row.endsAt) : "",
          };
        })}
      />
    </main>
  );
}
