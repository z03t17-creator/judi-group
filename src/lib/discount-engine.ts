import Decimal from "decimal.js";
import { MONEY_DP, InvoiceError, assertDiscountPercent } from "@/lib/invoice";
import { type CurrencyCode } from "@/lib/money";
import { toDecimal, type DecimalValue } from "@/lib/uom";

export type DiscountRuleKind = "MONEY" | "PERCENT" | "GIFT" | "TIER_PRICE" | "SPECIAL";
export type DiscountValueType = "PERCENT" | "MONEY";
export type DiscountScope = "INVOICE" | "LINE";

/** Serializable rule shape for server + field client preview. */
export type DiscountRuleSnapshot = {
  id: string;
  name: string;
  kind: DiscountRuleKind;
  scope: DiscountScope;
  valueType: DiscountValueType;
  amount: string;
  currency: string | null;
  storeTiers: string[];
  productIds: string[];
  categoryIds: string[];
  startsAt: string | null;
  endsAt: string | null;
  priority: number;
  active: boolean;
  stackWithGift: boolean;
};

export type DiscountLineInput = {
  productId: string;
  categoryId: string;
  productUnitId: string;
  quantity: DecimalValue;
  giftQuantity?: DecimalValue;
  listUnitPrice: DecimalValue;
};

export type DiscountChip = {
  ruleId: string;
  name: string;
  kind: DiscountRuleKind;
  label: string;
};

export type ResolvedDiscountLine = {
  productId: string;
  categoryId: string;
  productUnitId: string;
  quantity: Decimal;
  giftQuantity: Decimal;
  listUnitPrice: Decimal;
  unitPrice: Decimal;
  lineDiscountPercent: Decimal;
  lineDiscountAmount: Decimal;
  lineGross: Decimal;
  lineNet: Decimal;
  suggestedGiftQuantity: Decimal;
};

export type ResolveDiscountsResult = {
  lines: ResolvedDiscountLine[];
  subTotal: Decimal;
  /** Header money/% from admin rules (not manual). */
  ruleDiscountAmount: Decimal;
  /** Manual delegate % amount (capped). */
  manualDiscountAmount: Decimal;
  discountAmount: Decimal;
  totalAmount: Decimal;
  manualDiscountPercent: Decimal;
  chips: DiscountChip[];
};

function ruleWindowOpen(rule: DiscountRuleSnapshot, now: Date): boolean {
  if (!rule.active) return false;
  if (rule.startsAt) {
    const start = new Date(rule.startsAt);
    if (Number.isFinite(start.getTime()) && now < start) return false;
  }
  if (rule.endsAt) {
    const end = new Date(rule.endsAt);
    if (Number.isFinite(end.getTime()) && now > end) return false;
  }
  return true;
}

function matchesStoreTier(rule: DiscountRuleSnapshot, storeTier: string): boolean {
  if (!rule.storeTiers.length) return true;
  return rule.storeTiers.includes(storeTier);
}

function matchesProduct(
  rule: DiscountRuleSnapshot,
  productId: string,
  categoryId: string,
): boolean {
  const hasProductFilter = rule.productIds.length > 0;
  const hasCategoryFilter = rule.categoryIds.length > 0;
  if (!hasProductFilter && !hasCategoryFilter) return true;
  if (hasProductFilter && rule.productIds.includes(productId)) return true;
  if (hasCategoryFilter && rule.categoryIds.includes(categoryId)) return true;
  return false;
}

function moneyMatchesCurrency(rule: DiscountRuleSnapshot, currency: CurrencyCode): boolean {
  if (!rule.currency) return true;
  return rule.currency.toUpperCase() === currency;
}

function effectiveValueType(rule: DiscountRuleSnapshot): DiscountValueType {
  if (rule.kind === "MONEY") return "MONEY";
  if (rule.kind === "PERCENT" || rule.kind === "TIER_PRICE") return "PERCENT";
  if (rule.kind === "GIFT") return "PERCENT";
  return rule.valueType;
}

function computeMoneyOff(
  rule: DiscountRuleSnapshot,
  base: Decimal,
  currency: CurrencyCode,
): Decimal {
  if (!moneyMatchesCurrency(rule, currency)) return new Decimal(0);
  const amount = toDecimal(rule.amount);
  if (!amount.isFinite() || amount.lte(0)) return new Decimal(0);
  const valueType = effectiveValueType(rule);
  if (valueType === "PERCENT") {
    return base.times(amount).div(100).toDecimalPlaces(MONEY_DP);
  }
  return Decimal.min(amount.toDecimalPlaces(MONEY_DP), base);
}

type RankedRule = {
  rule: DiscountRuleSnapshot;
  discount: Decimal;
};

/** Highest priority, then highest discount amount. */
function pickBest(ranked: RankedRule[]): RankedRule | null {
  if (ranked.length === 0) return null;
  return [...ranked].sort((a, b) => {
    if (b.rule.priority !== a.rule.priority) return b.rule.priority - a.rule.priority;
    return b.discount.cmp(a.discount);
  })[0]!;
}

function chipFor(
  rule: DiscountRuleSnapshot,
  currency: CurrencyCode,
  discount?: Decimal,
): DiscountChip {
  const amount = toDecimal(rule.amount);
  let label = rule.name;
  if (rule.kind === "GIFT") {
    label = `${rule.name}: +${amount.toString()}`;
  } else if (effectiveValueType(rule) === "PERCENT") {
    label = `${rule.name} −${amount.toString()}%`;
  } else if (discount) {
    label = `${rule.name} −${discount.toString()} ${currency}`;
  } else {
    label = `${rule.name} −${amount.toString()} ${rule.currency ?? currency}`;
  }
  return { ruleId: rule.id, name: rule.name, kind: rule.kind, label };
}

/**
 * Resolve applicable admin rules + capped manual % for an invoice cart.
 * Tier / line promo adjust prices or line nets; invoice rules + manual % hit the header.
 */
export function resolveDiscounts(input: {
  rules: DiscountRuleSnapshot[];
  storeTier: string;
  currency: CurrencyCode;
  now?: Date;
  lines: DiscountLineInput[];
  manualDiscountPercent: DecimalValue;
  maxDiscountAllowed: DecimalValue;
}): ResolveDiscountsResult {
  const now = input.now ?? new Date();
  const manualDiscountPercent = assertDiscountPercent(
    input.manualDiscountPercent,
    input.maxDiscountAllowed,
  );

  const active = input.rules.filter(
    (rule) => ruleWindowOpen(rule, now) && matchesStoreTier(rule, input.storeTier),
  );

  const chips: DiscountChip[] = [];
  const chipIds = new Set<string>();
  function pushChip(chip: DiscountChip) {
    if (chipIds.has(chip.ruleId)) return;
    chipIds.add(chip.ruleId);
    chips.push(chip);
  }

  const resolvedLines: ResolvedDiscountLine[] = [];

  for (const line of input.lines) {
    const soldQty = toDecimal(line.quantity);
    const userGift = toDecimal(line.giftQuantity ?? 0);
    if (!soldQty.isFinite() || !userGift.isFinite() || soldQty.lt(0) || userGift.lt(0)) {
      throw new InvoiceError("invalid_quantity", "Quantity must be a finite value >= 0.");
    }
    if (soldQty.lte(0) && userGift.lte(0)) {
      continue;
    }

    const listUnitPrice = toDecimal(line.listUnitPrice);
    let unitPrice = listUnitPrice;

    const productRules = active.filter((rule) =>
      matchesProduct(rule, line.productId, line.categoryId),
    );

    // Tier list-price adjustment (wholesale / retail)
    const tierRanked: RankedRule[] = productRules
      .filter((rule) => rule.kind === "TIER_PRICE")
      .map((rule) => ({
        rule,
        discount: computeMoneyOff(rule, listUnitPrice, input.currency),
      }))
      .filter((row) => row.discount.gt(0));
    const bestTier = pickBest(tierRanked);
    if (bestTier) {
      unitPrice = listUnitPrice.minus(bestTier.discount).toDecimalPlaces(4);
      if (unitPrice.lt(0)) unitPrice = new Decimal(0);
      pushChip(chipFor(bestTier.rule, input.currency, bestTier.discount));
    }

    const lineGross =
      soldQty.gt(0) ? soldQty.times(unitPrice).toDecimalPlaces(MONEY_DP) : new Decimal(0);

    // Line money / % / special (highest wins)
    const lineMoneyRules = productRules.filter((rule) => {
      if (rule.kind === "GIFT" || rule.kind === "TIER_PRICE") return false;
      if (rule.kind === "PERCENT" || rule.kind === "MONEY" || rule.kind === "SPECIAL") {
        return rule.scope === "LINE";
      }
      return false;
    });

    const lineRanked: RankedRule[] = lineMoneyRules
      .map((rule) => ({
        rule,
        discount: computeMoneyOff(rule, lineGross, input.currency),
      }))
      .filter((row) => row.discount.gt(0));

    const giftRules = productRules.filter((rule) => rule.kind === "GIFT");
    let suggestedGift = new Decimal(0);
    for (const giftRule of giftRules) {
      if (soldQty.lte(0)) continue;
      const qty = toDecimal(giftRule.amount);
      if (qty.isFinite() && qty.gt(suggestedGift)) suggestedGift = qty;
      pushChip(chipFor(giftRule, input.currency));
    }

    const giftOnLine = Decimal.max(userGift, suggestedGift);
    const hasGift = giftOnLine.gt(0);

    let eligibleLine = lineRanked;
    if (hasGift) {
      // SPECIAL without stackWithGift yields to gift-only when gift is present —
      // other MONEY/PERCENT still apply; SPECIAL needs the flag to stack with gift.
      eligibleLine = lineRanked.filter((row) => {
        if (row.rule.kind !== "SPECIAL") return true;
        return row.rule.stackWithGift;
      });
    }

    const bestLine = pickBest(eligibleLine);
    let lineDiscountAmount = new Decimal(0);
    let lineDiscountPercent = new Decimal(0);
    if (bestLine) {
      lineDiscountAmount = bestLine.discount;
      if (effectiveValueType(bestLine.rule) === "PERCENT") {
        lineDiscountPercent = toDecimal(bestLine.rule.amount).toDecimalPlaces(MONEY_DP);
      }
      pushChip(chipFor(bestLine.rule, input.currency, bestLine.discount));
    }

    const lineNet = lineGross.minus(lineDiscountAmount).toDecimalPlaces(MONEY_DP);

    resolvedLines.push({
      productId: line.productId,
      categoryId: line.categoryId,
      productUnitId: line.productUnitId,
      quantity: soldQty,
      giftQuantity: giftOnLine,
      listUnitPrice,
      unitPrice,
      lineDiscountPercent,
      lineDiscountAmount,
      lineGross,
      lineNet: lineNet.lt(0) ? new Decimal(0) : lineNet,
      suggestedGiftQuantity: suggestedGift,
    });
  }

  const subTotal = resolvedLines
    .reduce((sum, line) => sum.plus(line.lineNet), new Decimal(0))
    .toDecimalPlaces(MONEY_DP);

  const invoiceRules = active.filter((rule) => {
    if (rule.kind === "GIFT" || rule.kind === "TIER_PRICE") return false;
    if (rule.kind === "PERCENT" || rule.kind === "MONEY" || rule.kind === "SPECIAL") {
      return rule.scope === "INVOICE";
    }
    return false;
  });

  const invoiceRanked: RankedRule[] = invoiceRules
    .map((rule) => ({
      rule,
      discount: computeMoneyOff(rule, subTotal, input.currency),
    }))
    .filter((row) => row.discount.gt(0));

  const anyGift = resolvedLines.some((line) => line.giftQuantity.gt(0));
  const eligibleInvoice = anyGift
    ? invoiceRanked.filter((row) => row.rule.kind !== "SPECIAL" || row.rule.stackWithGift)
    : invoiceRanked;

  const bestInvoice = pickBest(eligibleInvoice);
  const ruleDiscountAmount = bestInvoice?.discount ?? new Decimal(0);
  if (bestInvoice) {
    pushChip(chipFor(bestInvoice.rule, input.currency, bestInvoice.discount));
  }

  const afterRules = subTotal.minus(ruleDiscountAmount).toDecimalPlaces(MONEY_DP);
  const baseForManual = afterRules.lt(0) ? new Decimal(0) : afterRules;
  const manualDiscountAmount = baseForManual
    .times(manualDiscountPercent)
    .div(100)
    .toDecimalPlaces(MONEY_DP);
  const discountAmount = ruleDiscountAmount.plus(manualDiscountAmount).toDecimalPlaces(MONEY_DP);
  const totalAmount = baseForManual.minus(manualDiscountAmount).toDecimalPlaces(MONEY_DP);

  return {
    lines: resolvedLines,
    subTotal,
    ruleDiscountAmount,
    manualDiscountAmount,
    discountAmount,
    totalAmount: totalAmount.lt(0) ? new Decimal(0) : totalAmount,
    manualDiscountPercent,
    chips,
  };
}

/** Map a Prisma DiscountRule row into the engine snapshot. */
export function toDiscountRuleSnapshot(rule: {
  id: string;
  name: string;
  kind: DiscountRuleKind;
  scope: DiscountScope;
  valueType: DiscountValueType;
  amount: { toString(): string } | string | number;
  currency: string | null;
  storeTiers: string[];
  productIds: string[];
  categoryIds: string[];
  startsAt: Date | null;
  endsAt: Date | null;
  priority: number;
  active: boolean;
  stackWithGift: boolean;
}): DiscountRuleSnapshot {
  return {
    id: rule.id,
    name: rule.name,
    kind: rule.kind,
    scope: rule.scope,
    valueType: rule.valueType,
    amount: String(rule.amount),
    currency: rule.currency,
    storeTiers: rule.storeTiers,
    productIds: rule.productIds,
    categoryIds: rule.categoryIds,
    startsAt: rule.startsAt ? rule.startsAt.toISOString() : null,
    endsAt: rule.endsAt ? rule.endsAt.toISOString() : null,
    priority: rule.priority,
    active: rule.active,
    stackWithGift: rule.stackWithGift,
  };
}
