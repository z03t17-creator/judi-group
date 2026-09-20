import { BarChart3 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { localized } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import type { StoreStatus, StoreTier } from "@/lib/constants";
import { ReportsHub } from "./reports-hub";

export default async function ReportsHubPage() {
  await requireOfficeSession();
  const t = await getTranslations();
  const locale = await getLocale();

  const [stores, vans] = await Promise.all([
    prisma.store.findMany({
      orderBy: { storeName: "asc" },
      include: {
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.warehouse.findMany({
      where: { type: "VAN" },
      orderBy: { createdAt: "asc" },
      include: {
        assignedUsers: {
          where: { role: "FIELD_DELEGATE" },
          take: 1,
          include: {
            primaryMedia: { select: { url: true } },
          },
        },
      },
    }),
  ]);

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="icon-badge icon-badge-lg tone-sky">
          <BarChart3 className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("reports.title")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("reports.subtitle")}</p>
        </div>
      </header>

      <ReportsHub
        stores={stores.map((store) => ({
          id: store.id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          phone: store.phone,
          email: store.email,
          address: store.address,
          tier: store.tier as StoreTier,
          status: (store.status as StoreStatus) || "ACTIVE",
          primaryMediaUrl: store.primaryMedia?.url ?? null,
        }))}
        vans={vans.map((van) => {
          const driver = van.assignedUsers[0] ?? null;
          return {
            id: van.id,
            name: localized(van.name, locale),
            licensePlate: van.licensePlate,
            driverName: driver?.fullName ?? null,
            driverMediaUrl: driver?.primaryMedia?.url ?? null,
          };
        })}
      />
    </main>
  );
}
