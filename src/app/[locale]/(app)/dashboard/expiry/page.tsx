import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession, requireWarehouse } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { daysUntilExpiry } from "@/lib/stock-lot";
import { syncExpiringLotAlerts } from "@/lib/expiry-alerts";
import {
  ExpiryDirectory,
  ExpiryFilterBar,
  type ExpiryLotItem,
} from "./expiry-directory";

function expiryErrorMessage(
  t: Awaited<ReturnType<typeof getTranslations>>,
  code?: string,
) {
  switch (code) {
    case "not_found":
      return t("expiry.notFound");
    case "empty_lot":
      return t("expiry.emptyLot");
    case "insufficient_lot":
    case "insufficient_stock":
      return t("expiry.insufficient");
    case "invalid_quantity":
      return t("expiry.invalidQty");
    default:
      return t("common.error");
  }
}

export default async function ExpiryPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    ok?: string;
    filter?: string;
    location?: string;
  }>;
}) {
  const session = await requireOfficeSession();
  await requireWarehouse();
  const t = await getTranslations();
  const locale = await getLocale();
  const params = await searchParams;

  const canWriteOff =
    session.user.role === "ADMIN" || session.user.role === "WAREHOUSE_ACCOUNTANT";

  const filter =
    params.filter === "expired" || params.filter === "all" || params.filter === "soon"
      ? params.filter
      : "soon";
  const locationFilter =
    params.location === "warehouse" ||
    params.location === "van" ||
    params.location === "store" ||
    params.location === "all"
      ? params.location
      : "all";

  // Best-effort expiry alerts when office opens this page.
  void syncExpiringLotAlerts(locale).catch(() => {
    /* non-blocking */
  });

  const lots = await prisma.stockLot.findMany({
    where: {
      baseQty: { gt: 0 },
      ...(session.user.role === "ADMIN"
        ? {}
        : {
            OR: [
              { warehouseId: session.user.warehouseId ?? undefined },
              { storeId: { not: null } },
            ],
          }),
    },
    orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
    take: 200,
    include: {
      product: {
        include: { primaryMedia: { select: { url: true } } },
      },
      warehouse: true,
      store: { select: { storeName: true } },
    },
  });

  const directoryItems: ExpiryLotItem[] = lots.map((lot) => {
    const days =
      lot.expiryDate != null ? daysUntilExpiry(lot.expiryDate) : null;
    let locationKind: ExpiryLotItem["locationKind"] = "warehouse";
    let locationName = "—";
    if (lot.store) {
      locationKind = "store";
      locationName = lot.store.storeName;
    } else if (lot.warehouse) {
      locationKind = lot.warehouse.type === "VAN" ? "van" : "warehouse";
      locationName = localized(lot.warehouse.name, locale);
    }

    return {
      id: lot.id,
      productName: localized(lot.product.name, locale),
      productSku: lot.product.sku,
      primaryMediaUrl: lot.product.primaryMedia?.url ?? null,
      baseQty: lot.baseQty.toString(),
      lotCode: lot.lotCode,
      expiryDate: lot.expiryDate
        ? lot.expiryDate.toISOString().slice(0, 10)
        : null,
      daysLeft: days,
      locationKind,
      locationName,
      warehouseType: lot.warehouse?.type ?? null,
    };
  });

  const expiredCount = directoryItems.filter(
    (item) => item.daysLeft != null && item.daysLeft < 0,
  ).length;
  const soonCount = directoryItems.filter(
    (item) => item.daysLeft != null && item.daysLeft >= 0 && item.daysLeft <= 30,
  ).length;

  const errorMessage = params.error
    ? expiryErrorMessage(t, params.error)
    : null;
  const okMessage =
    params.ok === "writtenOff" ? t("expiry.writtenOff") : null;

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-md tone-amber">
          <CalendarClock className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("expiry.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("expiry.subtitle")}</p>
          <p className="mt-1 text-xs text-fg-muted">
            {t("expiry.kpis", { expired: expiredCount, soon: soonCount })}
          </p>
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

      <ExpiryFilterBar filter={filter} locationFilter={locationFilter} />

      <ExpiryDirectory
        lots={directoryItems}
        canWriteOff={canWriteOff}
        filter={filter}
        locationFilter={locationFilter}
      />
    </main>
  );
}
