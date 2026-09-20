import { describe, expect, it } from "vitest";
import {
  allocateFefo,
  compareLotsFefo,
  daysUntilExpiry,
  expiryAlertEntityId,
  expiryAlertWindowForDays,
  suggestExpiryFromShelfLife,
  totalAllocatedBase,
} from "@/lib/stock-lot";

describe("compareLotsFefo", () => {
  it("orders earlier expiry first and null last", () => {
    const a = { expiryDate: new Date("2026-01-01") };
    const b = { expiryDate: new Date("2026-06-01") };
    const c = { expiryDate: null };
    expect(compareLotsFefo(a, b)).toBeLessThan(0);
    expect(compareLotsFefo(b, a)).toBeGreaterThan(0);
    expect(compareLotsFefo(c, a)).toBeGreaterThan(0);
    expect(compareLotsFefo(a, c)).toBeLessThan(0);
  });
});

describe("allocateFefo", () => {
  it("picks the soonest expiry first", () => {
    const slices = allocateFefo(
      [
        {
          id: "later",
          baseQty: "100",
          expiryDate: new Date("2026-12-01"),
          lotCode: "B",
          sourcePurchaseId: null,
        },
        {
          id: "soon",
          baseQty: "40",
          expiryDate: new Date("2026-03-01"),
          lotCode: "A",
          sourcePurchaseId: null,
        },
      ],
      50,
    );
    expect(slices).toHaveLength(2);
    expect(slices[0]?.lotId).toBe("soon");
    expect(slices[0]?.baseQuantity.toString()).toBe("40");
    expect(slices[1]?.lotId).toBe("later");
    expect(slices[1]?.baseQuantity.toString()).toBe("10");
    expect(totalAllocatedBase(slices).toString()).toBe("50");
  });

  it("allocates only what lots have (remainder untracked)", () => {
    const slices = allocateFefo(
      [
        {
          id: "only",
          baseQty: "12",
          expiryDate: new Date("2026-04-01"),
          lotCode: null,
          sourcePurchaseId: null,
        },
      ],
      20,
    );
    expect(totalAllocatedBase(slices).toString()).toBe("12");
  });
});

describe("daysUntilExpiry / windows", () => {
  it("computes calendar-day distance", () => {
    const today = new Date(Date.UTC(2026, 8, 17)); // Sep 17 2026
    expect(daysUntilExpiry(new Date(Date.UTC(2026, 8, 17)), today)).toBe(0);
    expect(daysUntilExpiry(new Date(Date.UTC(2026, 8, 24)), today)).toBe(7);
    expect(daysUntilExpiry(new Date(Date.UTC(2026, 8, 10)), today)).toBe(-7);
  });

  it("maps days into alert windows", () => {
    expect(expiryAlertWindowForDays(-1)).toBe("expired");
    expect(expiryAlertWindowForDays(3)).toBe(7);
    expect(expiryAlertWindowForDays(10)).toBe(14);
    expect(expiryAlertWindowForDays(20)).toBe(30);
    expect(expiryAlertWindowForDays(45)).toBeNull();
  });

  it("builds dedupe entity ids", () => {
    expect(expiryAlertEntityId("lot-1", 7)).toBe("lot-1:w7");
    expect(expiryAlertEntityId("lot-1", "expired")).toBe("lot-1:wexpired");
  });
});

describe("suggestExpiryFromShelfLife", () => {
  it("adds shelf-life days to the UTC calendar date", () => {
    const from = new Date(Date.UTC(2026, 0, 1));
    expect(suggestExpiryFromShelfLife(30, from)).toBe("2026-01-31");
    expect(suggestExpiryFromShelfLife(null, from)).toBeNull();
    expect(suggestExpiryFromShelfLife(0, from)).toBeNull();
  });
});
