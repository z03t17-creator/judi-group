import { describe, expect, it } from "vitest";
import {
  UomError,
  assertValidUnitSet,
  breakdownBaseQty,
  displayBaseQty,
  sumBaseDecrement,
  toBaseQuantity,
} from "./uom";

const cheeseUnits = [
  { name: "Carton", conversionRatio: 24, isBaseUnit: false },
  { name: "Pack", conversionRatio: 6, isBaseUnit: false },
  { name: "Piece", conversionRatio: 1, isBaseUnit: true },
];

describe("toBaseQuantity", () => {
  it("converts 2 cartons of 24 to 48 base units", () => {
    expect(toBaseQuantity(2, 24).toString()).toBe("48");
  });
});

describe("sumBaseDecrement", () => {
  it("adds 2 cartons + 3 pieces to 51 base units", () => {
    const total = sumBaseDecrement([
      { quantity: 2, conversionRatio: 24 },
      { quantity: 3, conversionRatio: 1 },
    ]);
    expect(total.toString()).toBe("51");
  });

  it("converts 3 packs of 6 to 18 base units", () => {
    expect(sumBaseDecrement([{ quantity: 3, conversionRatio: 6 }]).toString()).toBe(
      "18",
    );
  });
});

describe("assertValidUnitSet", () => {
  it("accepts one base unit with packaging ratios above 1", () => {
    expect(() => assertValidUnitSet(cheeseUnits)).not.toThrow();
  });

  it("rejects an empty unit set", () => {
    expect(() => assertValidUnitSet([])).toThrow(UomError);
    try {
      assertValidUnitSet([]);
    } catch (error) {
      expect((error as UomError).code).toBe("no_units");
    }
  });

  it("rejects zero base units", () => {
    expect(() =>
      assertValidUnitSet([{ isBaseUnit: false, conversionRatio: 24 }]),
    ).toThrowError(/Exactly one base unit/);
  });

  it("rejects two base units", () => {
    expect(() =>
      assertValidUnitSet([
        { isBaseUnit: true, conversionRatio: 1 },
        { isBaseUnit: true, conversionRatio: 1 },
      ]),
    ).toThrowError(/Exactly one base unit/);
  });

  it("rejects a base unit whose ratio is not 1", () => {
    expect(() =>
      assertValidUnitSet([{ isBaseUnit: true, conversionRatio: 2 }]),
    ).toThrowError(/must be 1/);
  });

  it("rejects packaging units with ratio <= 1", () => {
    expect(() =>
      assertValidUnitSet([
        { isBaseUnit: true, conversionRatio: 1 },
        { isBaseUnit: false, conversionRatio: 1 },
      ]),
    ).toThrowError(/conversionRatio > 1/);
  });
});

describe("displayBaseQty", () => {
  it("clamps negatives to zero and flags them", () => {
    const result = displayBaseQty(-12);
    expect(result.isNegative).toBe(true);
    expect(result.safe.toString()).toBe("0");
    expect(result.raw.toString()).toBe("-12");
  });

  it("passes through non-negative qty", () => {
    const result = displayBaseQty(48);
    expect(result.isNegative).toBe(false);
    expect(result.safe.toString()).toBe("48");
  });
});

describe("breakdownBaseQty", () => {
  it("breaks 51 into 2 cartons, 0 packs, 3 pieces", () => {
    const { parts, remainder } = breakdownBaseQty(51, cheeseUnits);
    expect(parts[0].count.toString()).toBe("2");
    expect(parts[1].count.toString()).toBe("0");
    expect(parts[2].count.toString()).toBe("3");
    expect(remainder.toString()).toBe("0");
  });

  it("breaks 53 into 2 cartons, 0 packs, 5 pieces", () => {
    const { parts, remainder } = breakdownBaseQty(53, cheeseUnits);
    expect(parts[0].count.toString()).toBe("2");
    expect(parts[1].count.toString()).toBe("0");
    expect(parts[2].count.toString()).toBe("5");
    expect(remainder.toString()).toBe("0");
  });

  it("can break a clamped negative via displayBaseQty", () => {
    const { safe } = displayBaseQty(-5);
    const { parts, remainder } = breakdownBaseQty(safe, cheeseUnits);
    expect(parts.every((part) => part.count.isZero())).toBe(true);
    expect(remainder.toString()).toBe("0");
  });
});
