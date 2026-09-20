import {
  AlertCircle,
  CheckCircle2,
  Factory,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import { SuppliersDirectory } from "./suppliers-directory";

export default async function SuppliersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const session = await requireOfficeSession();
  const t = await getTranslations();
  const params = await searchParams;
  const canManage =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const suppliers = await prisma.supplier.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { purchaseOrders: true } } },
  });

  const errorMessage =
    params.error === "inUse"
      ? t("suppliers.inUse")
      : params.error
        ? t("common.error")
        : null;

  const okMessage =
    params.ok === "updated"
      ? t("suppliers.updated")
      : params.ok === "deleted"
        ? t("suppliers.deleted")
        : params.ok === "created"
          ? t("suppliers.created")
          : params.ok === "activated"
            ? t("suppliers.activated")
            : params.ok === "paused"
              ? t("suppliers.paused")
              : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-3">
      <header className="flex flex-wrap items-center gap-2.5">
        <span className="icon-badge icon-badge-sm tone-cyan">
          <Factory className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-lg font-bold tracking-tight text-fg">
            {t("suppliers.title")}
          </h1>
          <p className="text-xs text-fg-muted">{t("suppliers.subtitle")}</p>
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

      <SuppliersDirectory
        canManage={canManage}
        suppliers={suppliers.map((row) => ({
          id: row.id,
          name: row.name,
          phone: row.phone,
          email: row.email,
          address: row.address,
          notes: row.notes,
          active: row.active,
          purchaseCount: row._count.purchaseOrders,
        }))}
      />
    </main>
  );
}
