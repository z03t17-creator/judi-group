import {
  AlertCircle,
  CheckCircle2,
  Users,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { localized, type LocalizedText } from "@/lib/i18n";
import { UsersDirectory } from "./users-directory";

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; focus?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;
  const focusUserId = params.focus?.trim() || null;

  const [users, warehouses] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        assignedWarehouse: true,
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.warehouse.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const errorMessage =
    params.error === "emailTaken"
      ? t("users.emailTaken")
      : params.error === "cannotDeleteSelf"
        ? t("users.cannotDeleteSelf")
        : params.error
          ? t("common.error")
          : null;

  const okMessage =
    params.ok === "updated"
      ? t("users.updated")
      : params.ok === "deleted"
        ? t("users.deleted")
        : params.ok === "created"
          ? t("users.created")
          : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-sky">
          <Users className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("users.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("users.subtitle")}</p>
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

      <UsersDirectory
        focusUserId={focusUserId}
        users={users.map((user) => ({
          id: user.id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          maxDiscountAllowed: user.maxDiscountAllowed.toString(),
          assignedWarehouseId: user.assignedWarehouseId,
          warehouseName: user.assignedWarehouse
            ? localized(user.assignedWarehouse.name as LocalizedText, locale)
            : null,
          primaryMediaUrl: user.primaryMedia?.url ?? null,
        }))}
        warehouses={warehouses.map((warehouse) => ({
          id: warehouse.id,
          name: localized(warehouse.name as LocalizedText, locale),
        }))}
      />
    </main>
  );
}
