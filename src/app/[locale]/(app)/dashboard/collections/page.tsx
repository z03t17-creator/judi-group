import { Wallet } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CollectionForm } from "@/components/collection-form";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { toBaghdadYmd } from "@/lib/reports/date";
import {
  CollectionsDirectory,
  type CollectionListItem,
} from "./collections-directory";
import { iconBadge } from "@/lib/ui-tones";

export default async function OfficeCollectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ storeId?: string }>;
}) {
  await requireRole(["ADMIN", "COLLECTOR_ACCOUNTANT"]);
  const t = await getTranslations();
  const query = await searchParams;
  const initialStoreId =
    typeof query.storeId === "string" && query.storeId.trim()
      ? query.storeId.trim()
      : null;

  const [stores, collections] = await Promise.all([
    prisma.store.findMany({
      orderBy: { storeName: "asc" },
      select: {
        id: true,
        storeName: true,
        ownerName: true,
        phone: true,
        currentDebt: true,
        currentDebtUsd: true,
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.transaction.findMany({
      where: { type: "COLLECTION" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        receiptNumber: true,
        storeId: true,
        recordedById: true,
        amount: true,
        currency: true,
        paymentMethod: true,
        createdAt: true,
        store: {
          select: {
            storeName: true,
            primaryMedia: { select: { url: true } },
          },
        },
        recordedBy: {
          select: {
            fullName: true,
            primaryMedia: { select: { url: true } },
          },
        },
      },
    }),
  ]);

  const proofByTx = new Map<string, string>();
  if (collections.length > 0) {
    const proofs = await prisma.mediaAsset.findMany({
      where: {
        entityType: "Transaction",
        entityId: { in: collections.map((row) => row.id) },
        kind: "STOCK",
      },
      orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
      select: { entityId: true, url: true },
    });
    for (const proof of proofs) {
      if (!proofByTx.has(proof.entityId)) proofByTx.set(proof.entityId, proof.url);
    }
  }

  const today = toBaghdadYmd(new Date());
  const todayRows = collections.filter((row) => toBaghdadYmd(row.createdAt) === today);
  const todayIqd = todayRows
    .filter((row) => row.currency === "IQD")
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const todayUsd = todayRows
    .filter((row) => row.currency === "USD")
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const items: CollectionListItem[] = collections.map((row) => ({
    id: row.id,
    receiptNumber: row.receiptNumber,
    storeId: row.storeId,
    storeName: row.store.storeName,
    storeThumbUrl: row.store.primaryMedia?.url ?? null,
    collectorId: row.recordedById,
    collectorName: row.recordedBy.fullName,
    collectorThumbUrl: row.recordedBy.primaryMedia?.url ?? null,
    amountLabel: formatMoney(row.amount.toString(), row.currency),
    currency: row.currency,
    paymentMethod: row.paymentMethod,
    dateYmd: toBaghdadYmd(row.createdAt),
    proofThumbUrl: proofByTx.get(row.id) ?? null,
  }));

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className={iconBadge("emerald")}>
          <Wallet className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 text-start">
          <h1 className="text-xl font-bold tracking-tight text-fg">
            {t("collection.officeTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("collection.officeSubtitle")}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label={t("collection.today")}>
        <KpiCard
          label={t("collection.todayIqd")}
          value={formatMoney(todayIqd, "IQD")}
          tone="emerald"
        />
        <KpiCard
          label={t("collection.todayUsd")}
          value={formatMoney(todayUsd, "USD")}
          tone="sky"
        />
        <KpiCard
          label={t("collection.todayCount")}
          value={String(todayRows.length)}
          tone="teal"
        />
      </section>

      <section className="space-y-3" aria-labelledby="record-payment-heading">
        <div className="text-start">
          <h2 id="record-payment-heading" className="text-lg font-semibold text-fg">
            {t("collection.recordSection")}
          </h2>
          <p className="text-sm text-fg-muted">{t("collection.recordHint")}</p>
        </div>
        <CollectionForm
          stores={stores.map((store) => ({
            id: store.id,
            storeName: store.storeName,
            ownerName: store.ownerName,
            phone: store.phone,
            currentDebt: store.currentDebt.toString(),
            currentDebtUsd: store.currentDebtUsd.toString(),
            primaryMediaUrl: store.primaryMedia?.url ?? null,
          }))}
          surface="office"
          initialStoreId={initialStoreId}
        />
      </section>

      <section className="space-y-3" aria-labelledby="payment-list-heading">
        <div className="text-start">
          <h2 id="payment-list-heading" className="text-lg font-semibold text-fg">
            {t("collection.listTitle")}
          </h2>
        </div>
        <CollectionsDirectory collections={items} />
      </section>
    </main>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "emerald" | "sky" | "teal";
}) {
  return (
    <article className={`rounded-2xl border p-4 text-start shadow-sm card-tone-${tone}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-fg">
        {value}
      </p>
    </article>
  );
}
