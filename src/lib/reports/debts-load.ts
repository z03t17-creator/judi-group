import { revalidateTag, unstable_cache } from "next/cache";
import {
  STORE_STATUSES,
  STORE_TIERS,
  type StoreStatus,
  type StoreTier,
} from "@/lib/constants";
import { creditStatus, remainingCredit, worseCreditStatus } from "@/lib/credit";
import { prisma } from "@/lib/prisma";
import {
  ageReceivables,
  agingBandFromBuckets,
  EMPTY_AGING,
  worseAgingBand,
  type AgingBand,
  type AgingBuckets,
} from "@/lib/reports/statement";
import { toDecimal } from "@/lib/uom";

export type DebtStoreRow = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  email: string | null;
  address: string | null;
  tier: StoreTier;
  status: StoreStatus;
  primaryMediaUrl: string | null;
  currentDebt: string;
  currentDebtUsd: string;
  creditLimit: string;
  creditLimitUsd: string;
  remainingIqd: string;
  remainingUsd: string;
  creditStatus: ReturnType<typeof creditStatus>;
  hasDebt: boolean;
  agingIqd: AgingBuckets;
  agingUsd: AgingBuckets;
  agingBand: AgingBand;
};

export type DebtsSummary = {
  totalIqd: string;
  totalUsd: string;
  withDebtCount: number;
  overLimitCount: number;
  storeCount: number;
};

type LedgerLine = { storeId: string; currency: string; date: Date; amount: string };

function isStoreTier(value: string): value is StoreTier {
  return (STORE_TIERS as readonly string[]).includes(value);
}

function isStoreStatus(value: string): value is StoreStatus {
  return (STORE_STATUSES as readonly string[]).includes(value);
}

function groupLedger(rows: LedgerLine[]) {
  const map = new Map<string, { date: Date; amount: string }[]>();
  for (const row of rows) {
    const key = `${row.storeId}:${row.currency}`;
    const list = map.get(key);
    if (list) list.push({ date: row.date, amount: row.amount });
    else map.set(key, [{ date: row.date, amount: row.amount }]);
  }
  return map;
}

function ageStore(
  storeId: string,
  currency: "IQD" | "USD",
  invoices: Map<string, { date: Date; amount: string }[]>,
  collections: Map<string, { date: Date; amount: string }[]>,
  asOf: Date,
): AgingBuckets {
  const inv = invoices.get(`${storeId}:${currency}`) ?? [];
  const col = collections.get(`${storeId}:${currency}`) ?? [];
  if (inv.length === 0 && col.length === 0) return EMPTY_AGING;
  return ageReceivables(
    inv.map((row, index) => ({
      date: row.date,
      reference: `${storeId}-${currency}-${index}`,
      amount: row.amount,
    })),
    col,
    asOf,
  );
}

export function revalidateDebtsDirectory() {
  revalidateTag("debts-directory");
}

export async function loadDebtsDirectory(): Promise<{
  stores: DebtStoreRow[];
  summary: DebtsSummary;
}> {
  return unstable_cache(
    loadDebtsDirectoryUncached,
    ["debts-directory"],
    { revalidate: 20, tags: ["debts-directory"] },
  )();
}

async function loadDebtsDirectoryUncached(): Promise<{
  stores: DebtStoreRow[];
  summary: DebtsSummary;
}> {
  const asOf = new Date();

  const [stores, invoices, collections] = await Promise.all([
    prisma.store.findMany({
      orderBy: { storeName: "asc" },
      select: {
        id: true,
        storeName: true,
        ownerName: true,
        phone: true,
        email: true,
        address: true,
        tier: true,
        status: true,
        currentDebt: true,
        currentDebtUsd: true,
        creditLimit: true,
        creditLimitUsd: true,
        primaryMedia: { select: { url: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { invoiceType: "DEBT", status: "COMPLETED" },
      select: {
        storeId: true,
        currency: true,
        createdAt: true,
        debtAmount: true,
      },
    }),
    prisma.transaction.findMany({
      where: { type: "COLLECTION" },
      select: {
        storeId: true,
        currency: true,
        createdAt: true,
        amount: true,
      },
    }),
  ]);

  const invoiceLines: LedgerLine[] = invoices.map((row) => ({
    storeId: row.storeId,
    currency: row.currency,
    date: row.createdAt,
    amount: row.debtAmount.toString(),
  }));
  const collectionLines: LedgerLine[] = collections.map((row) => ({
    storeId: row.storeId,
    currency: row.currency,
    date: row.createdAt,
    amount: row.amount.toString(),
  }));
  const invoicesByKey = groupLedger(invoiceLines);
  const collectionsByKey = groupLedger(collectionLines);

  let totalIqd = toDecimal(0);
  let totalUsd = toDecimal(0);
  let withDebtCount = 0;
  let overLimitCount = 0;

  const rows: DebtStoreRow[] = stores.map((store) => {
    const currentDebt = store.currentDebt.toString();
    const currentDebtUsd = store.currentDebtUsd.toString();
    const creditLimit = store.creditLimit.toString();
    const creditLimitUsd = store.creditLimitUsd.toString();
    const remainingIqd = remainingCredit(creditLimit, currentDebt).toString();
    const remainingUsd = remainingCredit(creditLimitUsd, currentDebtUsd).toString();
    const status = worseCreditStatus(
      creditStatus(creditLimit, currentDebt),
      creditStatus(creditLimitUsd, currentDebtUsd),
    );
    const hasDebt = toDecimal(currentDebt).gt(0) || toDecimal(currentDebtUsd).gt(0);
    const agingIqd = ageStore(store.id, "IQD", invoicesByKey, collectionsByKey, asOf);
    const agingUsd = ageStore(store.id, "USD", invoicesByKey, collectionsByKey, asOf);
    const agingBand = worseAgingBand(
      agingBandFromBuckets(agingIqd),
      agingBandFromBuckets(agingUsd),
    );

    totalIqd = totalIqd.plus(currentDebt);
    totalUsd = totalUsd.plus(currentDebtUsd);
    if (hasDebt) withDebtCount += 1;
    if (status === "blocked") overLimitCount += 1;

    return {
      id: store.id,
      storeName: store.storeName,
      ownerName: store.ownerName,
      phone: store.phone,
      email: store.email,
      address: store.address,
      tier: isStoreTier(store.tier) ? store.tier : "MINIMARKET",
      status: isStoreStatus(store.status) ? store.status : "ACTIVE",
      primaryMediaUrl: store.primaryMedia?.url ?? null,
      currentDebt,
      currentDebtUsd,
      creditLimit,
      creditLimitUsd,
      remainingIqd,
      remainingUsd,
      creditStatus: status,
      hasDebt,
      agingIqd,
      agingUsd,
      agingBand,
    };
  });

  rows.sort((a, b) => {
    if (a.hasDebt !== b.hasDebt) return a.hasDebt ? -1 : 1;
    const iqd = toDecimal(b.currentDebt).minus(a.currentDebt);
    if (!iqd.isZero()) return iqd.gt(0) ? 1 : -1;
    const usd = toDecimal(b.currentDebtUsd).minus(a.currentDebtUsd);
    if (!usd.isZero()) return usd.gt(0) ? 1 : -1;
    return a.storeName.localeCompare(b.storeName);
  });

  return {
    stores: rows,
    summary: {
      totalIqd: totalIqd.toString(),
      totalUsd: totalUsd.toString(),
      withDebtCount,
      overLimitCount,
      storeCount: rows.length,
    },
  };
}
