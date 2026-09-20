import { MapPinned } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireOfficeSession } from "@/lib/rbac";
import type { StoreStatus, StoreTier } from "@/lib/constants";
import { MapHubDirectory } from "./map-hub-directory";

export default async function MapHubPage() {
  await requireOfficeSession();
  const t = await getTranslations("mapHub");

  const stores = await prisma.store.findMany({
    orderBy: { storeName: "asc" },
    select: {
      id: true,
      storeName: true,
      ownerName: true,
      phone: true,
      address: true,
      latitude: true,
      longitude: true,
      tier: true,
      status: true,
      primaryMedia: { select: { url: true } },
    },
  });

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3 text-start">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-judi-800 dark:text-judi-100">
          <MapPinned className="size-6" aria-hidden />
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{t("title")}</h1>
          <p className="mt-1 text-sm text-fg-muted">{t("subtitle")}</p>
        </div>
      </header>

      <MapHubDirectory
        stores={stores.map((store) => ({
          id: store.id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          phone: store.phone,
          address: store.address,
          latitude: store.latitude,
          longitude: store.longitude,
          tier: store.tier as StoreTier,
          status: store.status as StoreStatus,
          thumbUrl: store.primaryMedia?.url ?? null,
        }))}
      />
    </main>
  );
}
