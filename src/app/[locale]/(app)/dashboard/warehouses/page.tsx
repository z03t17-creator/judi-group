import {
  AlertCircle,
  CheckCircle2,
  Warehouse,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { WarehousesDirectory } from "./warehouses-directory";

export default async function WarehousesPage({
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

  const warehouses = await prisma.warehouse.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { assignedUsers: true } } },
  });

  const errorMessage =
    params.error === "hasUsers"
      ? t("warehouses.hasUsers")
      : params.error === "hasStock"
        ? t("warehouses.hasStock")
        : params.error
          ? t("common.error")
          : null;

  const okMessage =
    params.ok === "updated"
      ? t("warehouses.updated")
      : params.ok === "deleted"
        ? t("warehouses.deleted")
        : params.ok === "created"
          ? t("warehouses.created")
          : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-indigo">
          <Warehouse className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("warehouses.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("warehouses.subtitle")}</p>
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

      <WarehousesDirectory
        canManage={canManage}
        warehouses={warehouses.map((warehouse) => {
          const name = warehouse.name as LocalizedText;
          return {
            id: warehouse.id,
            displayName: localized(name, locale),
            nameEn: name.en,
            nameAr: name.ar,
            nameCkb: name.ckb,
            type: warehouse.type,
            licensePlate: warehouse.licensePlate,
            usersCount: warehouse._count.assignedUsers,
          };
        })}
      />
    </main>
  );
}
