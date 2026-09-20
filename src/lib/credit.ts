import Decimal from "decimal.js";

export type CreditStatus = "ok" | "warn" | "blocked";

export function remainingCredit(limit: Decimal.Value, debt: Decimal.Value): Decimal {
  return new Decimal(limit).minus(debt);
}

export function canSellOnDebt(
  limit: Decimal.Value,
  debt: Decimal.Value,
  amount: Decimal.Value,
): boolean {
  const cap = new Decimal(limit);
  const extra = new Decimal(amount);
  if (!cap.gt(0) || !extra.gt(0)) {
    return false;
  }
  return remainingCredit(cap, debt).gte(extra);
}

export function creditStatus(limit: Decimal.Value, debt: Decimal.Value): CreditStatus {
  const cap = new Decimal(limit);
  const used = new Decimal(debt);

  if (cap.gt(0) && used.gte(cap)) {
    return "blocked";
  }
  if (cap.gt(0) && used.div(cap).gte("0.8")) {
    return "warn";
  }
  return "ok";
}

const CREDIT_RANK: Record<CreditStatus, number> = {
  ok: 0,
  warn: 1,
  blocked: 2,
};

/** Worse of two ledgers (IQD vs USD) for a single store row. */
export function worseCreditStatus(a: CreditStatus, b: CreditStatus): CreditStatus {
  return CREDIT_RANK[a] >= CREDIT_RANK[b] ? a : b;
}
