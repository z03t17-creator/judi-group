import { toDecimal, type DecimalValue } from "@/lib/uom";

export const CURRENCIES = ["IQD", "USD"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export function isCurrency(value: string): value is CurrencyCode {
  return (CURRENCIES as readonly string[]).includes(value);
}

/**
 * Format a plain number with thousand separators (e.g. 25000000 → "25,000,000").
 * Always Latin digits (0–9), even when the UI locale is ar/ckb.
 */
export function formatNumber(
  amount: DecimalValue,
  options?: { fractionDigits?: number },
): string {
  const value = toDecimal(amount);
  const fractionDigits =
    options?.fractionDigits ?? (value.isInteger() ? 0 : 2);
  const normalized = Number(
    value.toDecimalPlaces(fractionDigits).toFixed(fractionDigits),
  );
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(normalized);
}

/** Strip grouping commas / spaces so form values parse as numbers. */
export function parseFormattedNumber(raw: string | number | null | undefined): string {
  if (raw == null) return "";
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? String(raw) : "";
  }
  return raw.replace(/,/g, "").replace(/\s/g, "").trim();
}

export function formatMoney(amount: DecimalValue, currency: CurrencyCode | string): string {
  const value = toDecimal(amount);
  if (currency === "USD") {
    return `$${formatNumber(value, { fractionDigits: 2 })}`;
  }
  return `${formatNumber(value.toDecimalPlaces(0), { fractionDigits: 0 })} IQD`;
}

/** IQD + USD on one line for lists and debt chips. */
export function formatDualMoney(
  iqd: DecimalValue,
  usd: DecimalValue,
  separator = " · ",
): string {
  return `${formatMoney(iqd, "IQD")}${separator}${formatMoney(usd, "USD")}`;
}

export function ledgerAmounts(
  store: {
    creditLimit: DecimalValue;
    currentDebt: DecimalValue;
    creditLimitUsd: DecimalValue;
    currentDebtUsd: DecimalValue;
  },
  currency: CurrencyCode,
): { limit: DecimalValue; debt: DecimalValue } {
  if (currency === "USD") {
    return { limit: store.creditLimitUsd, debt: store.currentDebtUsd };
  }
  return { limit: store.creditLimit, debt: store.currentDebt };
}
