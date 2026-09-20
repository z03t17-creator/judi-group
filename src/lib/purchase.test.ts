import { describe, expect, it } from "vitest";
import {
  costPerBaseUnit,
  nextPurchaseOrderNumber,
  nextPurchaseReceiptNumber,
  parsePurchaseExpiryDate,
  weightedAverageBaseCost,
} from "@/lib/purchase";

describe("costPerBaseUnit", () => {
  it("divides carton cost across pieces", () => {
    expect(costPerBaseUnit(24000, 24).toString()).toBe("1000");
  });
});

describe("weightedAverageBaseCost", () => {
  it("uses incoming cost when on-hand is zero", () => {
    expect(weightedAverageBaseCost(0, 0, 48, 1000).toString()).toBe("1000");
  });

  it("weights existing and incoming IQD costs", () => {
    // 100 @ 1000 + 100 @ 2000 => 1500
    expect(weightedAverageBaseCost(100, 1000, 100, 2000).toString()).toBe("1500");
  });

  it("keeps more weight on larger on-hand", () => {
    // 240 @ 1000 + 48 @ 2000 => (240000 + 96000) / 288 = 1166.6667
    expect(weightedAverageBaseCost(240, 1000, 48, 2000).toString()).toBe("1166.6667");
  });
});

describe("nextPurchaseOrderNumber", () => {
  it("increments PO numbers", () => {
    expect(nextPurchaseOrderNumber(null)).toBe("PO-000001");
    expect(nextPurchaseOrderNumber("PO-000001")).toBe("PO-000002");
  });
});

describe("nextPurchaseReceiptNumber", () => {
  it("increments PR numbers", () => {
    expect(nextPurchaseReceiptNumber(null)).toBe("PR-000001");
    expect(nextPurchaseReceiptNumber("PR-000007")).toBe("PR-000008");
  });
});

describe("parsePurchaseExpiryDate", () => {
  it("parses YYYY-MM-DD", () => {
    const date = parsePurchaseExpiryDate("2026-12-31");
    expect(date?.toISOString().slice(0, 10)).toBe("2026-12-31");
  });

  it("rejects invalid dates", () => {
    expect(parsePurchaseExpiryDate("2026-13-01")).toBeNull();
    expect(parsePurchaseExpiryDate("")).toBeNull();
  });
});
