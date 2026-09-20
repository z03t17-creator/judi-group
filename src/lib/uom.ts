import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export const BASE_QTY_DP = 4;

export type DecimalValue = Decimal.Value;

export type UnitDraft = {
  isBaseUnit: boolean;
  conversionRatio: DecimalValue;
};

export type DecrementLine = {
  quantity: DecimalValue;
  conversionRatio: DecimalValue;
};

export class UomError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "UomError";
    this.code = code;
  }
}

export function toDecimal(value: DecimalValue): Decimal {
  return new Decimal(value);
}

export function toBaseQuantity(
  quantity: DecimalValue,
  conversionRatio: DecimalValue,
): Decimal {
  const qty = new Decimal(quantity);
  const ratio = new Decimal(conversionRatio);

  if (!qty.isFinite() || !ratio.isFinite()) {
    throw new UomError("invalid_quantity", "Quantity and conversion ratio must be finite.");
  }
  if (qty.lt(0) || ratio.lte(0)) {
    throw new UomError(
      "invalid_quantity",
      "Quantity must be >= 0 and conversion ratio must be > 0.",
    );
  }

  return qty.times(ratio).toDecimalPlaces(BASE_QTY_DP);
}

export function sumBaseDecrement(lines: DecrementLine[]): Decimal {
  return lines
    .reduce(
      (total, line) => total.plus(toBaseQuantity(line.quantity, line.conversionRatio)),
      new Decimal(0),
    )
    .toDecimalPlaces(BASE_QTY_DP);
}

export function assertValidUnitSet(units: UnitDraft[]): void {
  if (units.length === 0) {
    throw new UomError("no_units", "At least one unit is required.");
  }

  const bases = units.filter((unit) => unit.isBaseUnit);
  if (bases.length === 0) {
    throw new UomError("no_base_unit", "Exactly one base unit is required.");
  }
  if (bases.length > 1) {
    throw new UomError("multiple_base_units", "Exactly one base unit is required.");
  }

  const baseRatio = new Decimal(bases[0].conversionRatio);
  if (!baseRatio.eq(1)) {
    throw new UomError("base_ratio", "Base unit conversion ratio must be 1.");
  }

  for (const unit of units) {
    const ratio = new Decimal(unit.conversionRatio);
    if (!ratio.isFinite() || ratio.lte(0)) {
      throw new UomError("invalid_ratio", "Conversion ratios must be finite and greater than 0.");
    }
    if (!unit.isBaseUnit && ratio.lte(1)) {
      throw new UomError("pack_ratio", "Packaging units must have conversionRatio > 1.");
    }
  }
}

export type BreakdownUnit = {
  conversionRatio: DecimalValue;
};

export type BreakdownPart<T extends BreakdownUnit> = T & {
  count: Decimal;
};

/** Clamp qty for display breakdown; flag negatives so UI can badge without crashing. */
export function displayBaseQty(baseQty: DecimalValue): {
  raw: Decimal;
  safe: Decimal;
  isNegative: boolean;
} {
  const raw = new Decimal(baseQty);
  if (!raw.isFinite()) {
    return { raw, safe: new Decimal(0), isNegative: false };
  }
  if (raw.lt(0)) {
    return { raw, safe: new Decimal(0), isNegative: true };
  }
  return { raw, safe: raw, isNegative: false };
}

export function breakdownBaseQty<T extends BreakdownUnit>(
  baseQty: DecimalValue,
  units: T[],
): { parts: BreakdownPart<T>[]; remainder: Decimal } {
  let remaining = new Decimal(baseQty);
  if (!remaining.isFinite() || remaining.lt(0)) {
    throw new UomError("negative_qty", "baseQty must be a finite value >= 0.");
  }

  const sorted = units
    .map((unit, index) => ({ unit, index, ratio: new Decimal(unit.conversionRatio) }))
    .sort((a, b) => {
      const byRatio = b.ratio.comparedTo(a.ratio);
      return byRatio === 0 ? a.index - b.index : byRatio;
    });

  const assigned = new Map<number, Decimal>();
  for (const item of sorted) {
    const count = remaining.div(item.ratio).toDecimalPlaces(0, Decimal.ROUND_DOWN);
    remaining = remaining.minus(count.times(item.ratio));
    assigned.set(item.index, count);
  }

  return {
    parts: units.map((unit, index) => ({
      ...unit,
      count: assigned.get(index) ?? new Decimal(0),
    })),
    remainder: remaining.toDecimalPlaces(BASE_QTY_DP),
  };
}
