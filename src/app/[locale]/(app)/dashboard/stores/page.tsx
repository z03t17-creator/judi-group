import {
  AlertCircle,
  CheckCircle2,
  Store,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { creditStatus, remainingCredit } from "@/lib/credit";
import type { StoreStatus, StoreTier } from "@/lib/constants";
import { StoresDirectory } from "./stores-directory";

export default async function StoresPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; focus?: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const params = await searchParams;
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";
  const focusStoreId = params.focus?.trim() || null;

  const stores = await prisma.store.findMany({
    orderBy: { storeName: "asc" },
    include: {
      primaryMedia: { select: { url: true } },
    },
  });

  const errorMessage =
    params.error === "inUse"
      ? t("stores.inUse")
      : params.error
        ? t("common.error")
        : null;

  const okMessage =
    params.ok === "updated"
      ? t("stores.updated")
      : params.ok === "deleted"
        ? t("stores.deleted")
        : params.ok === "created"
          ? t("stores.created")
          : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-orange">
          <Store className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("stores.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("stores.subtitle")}</p>
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

      <StoresDirectory
        canManage={canManage}
        focusStoreId={focusStoreId}
        stores={stores.map((store) => {
          const remainingIqd = remainingCredit(
            store.creditLimit.toString(),
            store.currentDebt.toString(),
          );
          const remainingUsd = remainingCredit(
            store.creditLimitUsd.toString(),
            store.currentDebtUsd.toString(),
          );
          return {
            id: store.id,
            storeName: store.storeName,
            ownerName: store.ownerName,
            phone: store.phone,
            email: store.email,
            address: store.address,
            tier: store.tier as StoreTier,
            status: (store.status as StoreStatus) || "ACTIVE",
            creditLimit: store.creditLimit.toString(),
            creditLimitUsd: store.creditLimitUsd.toString(),
            currentDebt: store.currentDebt.toString(),
            currentDebtUsd: store.currentDebtUsd.toString(),
            remainingIqd: remainingIqd.toString(),
            remainingUsd: remainingUsd.toString(),
            creditStatus: creditStatus(
              store.creditLimit.toString(),
              store.currentDebt.toString(),
            ),
            latitude: store.latitude?.toString() ?? "",
            longitude: store.longitude?.toString() ?? "",
            primaryMediaUrl: store.primaryMedia?.url ?? null,
          };
        })}
      />
    </main>
  );
}
