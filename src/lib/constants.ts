import type { Role } from "@prisma/client";

export const LOCALES = ["en", "ar", "ckb"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const RTL_LOCALES: readonly AppLocale[] = ["ar", "ckb"];

export const ROLES = [
  "ADMIN",
  "WAREHOUSE_ACCOUNTANT",
  "FIELD_DELEGATE",
  "COLLECTOR_ACCOUNTANT",
] as const;

export const OFFICE_ROLES: readonly Role[] = [
  "ADMIN",
  "WAREHOUSE_ACCOUNTANT",
  "COLLECTOR_ACCOUNTANT",
];

export const WAREHOUSE_TYPES = ["MAIN", "BRANCH", "VAN"] as const;

export const STOCK_MOVEMENT_TYPES = ["RECEIVE", "WRITE_OFF"] as const;

export const TRANSFER_DECISIONS = ["ACCEPTED", "REJECTED"] as const;

export const STORE_TIERS = ["WHOLESALE", "SUPERMARKET", "MINIMARKET"] as const;

/** Account lifecycle — distinct from credit ok/warn/blocked. */
export const STORE_STATUSES = ["ACTIVE", "INACTIVE", "PROSPECT"] as const;

/**
 * Sales channel grouping from the plan:
 * Wholesale = WHOLESALE; Retail = SUPERMARKET + MINIMARKET.
 */
export const STORE_CHANNELS = ["WHOLESALE", "RETAIL"] as const;

export type StoreTier = (typeof STORE_TIERS)[number];
export type StoreStatus = (typeof STORE_STATUSES)[number];
export type StoreChannel = (typeof STORE_CHANNELS)[number];

export function storeChannel(tier: string): StoreChannel {
  return tier === "WHOLESALE" ? "WHOLESALE" : "RETAIL";
}

export const FIELD_INVOICE_TYPES = ["CASH", "DEBT"] as const;

export const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHECK"] as const;

export const DISCOUNT_RULE_KINDS = [
  "MONEY",
  "PERCENT",
  "GIFT",
  "TIER_PRICE",
  "SPECIAL",
] as const;

export const DISCOUNT_VALUE_TYPES = ["PERCENT", "MONEY"] as const;

export const DISCOUNT_SCOPES = ["INVOICE", "LINE"] as const;

export const PURCHASE_ORDER_STATUSES = ["DRAFT", "RECEIVED", "CANCELLED"] as const;

export const STORE_PLACEMENT_DIRECTIONS = ["TO_STORE", "FROM_STORE"] as const;

export const EXPENSE_CATEGORIES = [
  "RENT",
  "FUEL",
  "SALARIES",
  "SPOILAGE",
  "PURCHASE_FREIGHT",
  "OTHER",
] as const;

export const COLLECTOR_ROLES = ["ADMIN", "COLLECTOR_ACCOUNTANT"] as const;

export function isRtlLocale(locale: string): boolean {
  return (RTL_LOCALES as readonly string[]).includes(locale);
}

export function isOfficeRole(role: Role): boolean {
  return OFFICE_ROLES.includes(role);
}
