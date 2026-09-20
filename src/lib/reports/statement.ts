import Decimal from "decimal.js";
import { MONEY_DP } from "@/lib/invoice";
import { toDecimal, type DecimalValue } from "@/lib/uom";
import { daysBetweenBaghdad, toBaghdadYmd } from "@/lib/reports/date";

export type LedgerEventKind = "INVOICE" | "PAYMENT";

export type LedgerEvent = {
  date: Date;
  type: LedgerEventKind;
  reference: string;
  debit: DecimalValue;
  credit: DecimalValue;
  /** Invoice or collection id for detail links. */
  id?: string;
};

export type LedgerEntry = {
  date: string;
  type: LedgerEventKind;
  reference: string;
  debit: string;
  credit: string;
  runningBalance: string;
  id?: string;
};

export type AgingBuckets = {
  current: string;
  days31to60: string;
  days61to90: string;
  over90: string;
};

/** Oldest unpaid bucket that still has a balance — used on the AR debts list. */
export type AgingBand = "none" | "current" | "days31to60" | "days61to90" | "over90";

export const EMPTY_AGING: AgingBuckets = {
  current: "0",
  days31to60: "0",
  days61to90: "0",
  over90: "0",
};

const BAND_RANK: Record<AgingBand, number> = {
  none: 0,
  current: 1,
  days31to60: 2,
  days61to90: 3,
  over90: 4,
};

export function agingBandFromBuckets(aging: AgingBuckets): AgingBand {
  if (toDecimal(aging.over90).gt(0)) return "over90";
  if (toDecimal(aging.days61to90).gt(0)) return "days61to90";
  if (toDecimal(aging.days31to60).gt(0)) return "days31to60";
  if (toDecimal(aging.current).gt(0)) return "current";
  return "none";
}

export function worseAgingBand(a: AgingBand, b: AgingBand): AgingBand {
  return BAND_RANK[a] >= BAND_RANK[b] ? a : b;
}

export function addAgingBuckets(a: AgingBuckets, b: AgingBuckets): AgingBuckets {
  return {
    current: toDecimal(a.current).plus(b.current).toDecimalPlaces(MONEY_DP).toString(),
    days31to60: toDecimal(a.days31to60).plus(b.days31to60).toDecimalPlaces(MONEY_DP).toString(),
    days61to90: toDecimal(a.days61to90).plus(b.days61to90).toDecimalPlaces(MONEY_DP).toString(),
    over90: toDecimal(a.over90).plus(b.over90).toDecimalPlaces(MONEY_DP).toString(),
  };
}

export function buildStatement(
  events: LedgerEvent[],
  from: Date,
  to: Date,
): {
  openingBalance: string;
  closingBalance: string;
  ledgerEntries: LedgerEntry[];
} {
  const sorted = [...events].sort((a, b) => {
    const diff = a.date.getTime() - b.date.getTime();
    if (diff !== 0) return diff;
    return a.reference.localeCompare(b.reference);
  });

  let balance = new Decimal(0);
  for (const event of sorted) {
    if (event.date < from) {
      balance = applyEvent(balance, event);
    }
  }
  const openingBalance = balance.toDecimalPlaces(MONEY_DP);

  const ledgerEntries: LedgerEntry[] = [];
  for (const event of sorted) {
    if (event.date < from || event.date >= to) continue;
    balance = applyEvent(balance, event);
    ledgerEntries.push({
      date: event.date.toISOString(),
      type: event.type,
      id: event.id,
      reference: event.reference,
      debit: toDecimal(event.debit).toDecimalPlaces(MONEY_DP).toString(),
      credit: toDecimal(event.credit).toDecimalPlaces(MONEY_DP).toString(),
      runningBalance: balance.toDecimalPlaces(MONEY_DP).toString(),
    });
  }

  return {
    openingBalance: openingBalance.toString(),
    closingBalance: balance.toDecimalPlaces(MONEY_DP).toString(),
    ledgerEntries,
  };
}

function applyEvent(balance: Decimal, event: LedgerEvent): Decimal {
  return balance
    .plus(toDecimal(event.debit))
    .minus(toDecimal(event.credit))
    .toDecimalPlaces(MONEY_DP);
}

/**
 * FIFO aging: apply collections to oldest unpaid debt invoices as-of `asOf`.
 */
export function ageReceivables(
  debtInvoices: { date: Date; reference: string; amount: DecimalValue }[],
  collections: { date: Date; amount: DecimalValue }[],
  asOf: Date,
): AgingBuckets {
  const open = debtInvoices
    .filter((inv) => inv.date <= asOf)
    .map((inv) => ({
      date: inv.date,
      remaining: toDecimal(inv.amount).toDecimalPlaces(MONEY_DP),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  let pool = collections
    .filter((c) => c.date <= asOf)
    .reduce((sum, c) => sum.plus(toDecimal(c.amount)), new Decimal(0))
    .toDecimalPlaces(MONEY_DP);

  for (const inv of open) {
    if (pool.lte(0)) break;
    const apply = Decimal.min(inv.remaining, pool);
    inv.remaining = inv.remaining.minus(apply).toDecimalPlaces(MONEY_DP);
    pool = pool.minus(apply).toDecimalPlaces(MONEY_DP);
  }

  const asOfYmd = toBaghdadYmd(asOf);
  const buckets = {
    current: new Decimal(0),
    days31to60: new Decimal(0),
    days61to90: new Decimal(0),
    over90: new Decimal(0),
  };

  for (const inv of open) {
    if (inv.remaining.lte(0)) continue;
    const age = daysBetweenBaghdad(toBaghdadYmd(inv.date), asOfYmd);
    if (age <= 30) buckets.current = buckets.current.plus(inv.remaining);
    else if (age <= 60) buckets.days31to60 = buckets.days31to60.plus(inv.remaining);
    else if (age <= 90) buckets.days61to90 = buckets.days61to90.plus(inv.remaining);
    else buckets.over90 = buckets.over90.plus(inv.remaining);
  }

  return {
    current: buckets.current.toDecimalPlaces(MONEY_DP).toString(),
    days31to60: buckets.days31to60.toDecimalPlaces(MONEY_DP).toString(),
    days61to90: buckets.days61to90.toDecimalPlaces(MONEY_DP).toString(),
    over90: buckets.over90.toDecimalPlaces(MONEY_DP).toString(),
  };
}
