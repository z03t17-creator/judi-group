import { describe, expect, it } from "vitest";
import { buildVanReconciliation } from "@/lib/reports/van-reconciliation";
import { baghdadDayBounds } from "@/lib/reports/date";

describe("buildVanReconciliation", () => {
  it("matches opening + loaded - sold - gift + returned = expected", () => {
    const { start, end } = baghdadDayBounds("2026-09-15");
    // Plan example: opening 100, loaded 50, sold 120, gift 2 → expected 28.
    // dayDelta = +50 - 120 - 2 = -72; opening = live - dayDelta = 28 - (-72) = 100.

    const rows = buildVanReconciliation(
      [
        {
          productId: "p1",
          sku: "DRY-092",
          name: "Tea 400g",
          liveBaseQty: 28,
          countedBaseQty: 28,
        },
      ],
      [
        {
          productId: "p1",
          type: "TRANSFER_IN",
          baseQuantity: 50,
          createdAt: new Date(start.getTime() + 60_000),
        },
        {
          productId: "p1",
          type: "SALE",
          baseQuantity: 120,
          createdAt: new Date(start.getTime() + 120_000),
        },
        {
          productId: "p1",
          type: "GIFT",
          baseQuantity: 2,
          createdAt: new Date(start.getTime() + 180_000),
        },
      ],
      start,
      end,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.openingQty).toBe("100");
    expect(rows[0]?.loadedQty).toBe("50");
    expect(rows[0]?.soldQty).toBe("120");
    expect(rows[0]?.giftQty).toBe("2");
    expect(rows[0]?.returnedQty).toBe("0");
    expect(rows[0]?.expectedClosingQty).toBe("28");
    expect(rows[0]?.actualClosingQty).toBe("28");
    expect(rows[0]?.discrepancy).toBe("0");
  });

  it("counts RETURN as inbound separately from RECEIVE", () => {
    const { start, end } = baghdadDayBounds("2026-09-15");
    // opening 10, receive 5, return 3, sold 4 → expected 14. live = 14.
    // dayDelta = +5 + 3 - 4 = +4; opening = 14 - 4 = 10.

    const rows = buildVanReconciliation(
      [
        {
          productId: "p1",
          sku: "A",
          name: "Item",
          liveBaseQty: 14,
          countedBaseQty: 14,
        },
      ],
      [
        {
          productId: "p1",
          type: "RECEIVE",
          baseQuantity: 5,
          createdAt: new Date(start.getTime() + 60_000),
        },
        {
          productId: "p1",
          type: "RETURN",
          baseQuantity: 3,
          createdAt: new Date(start.getTime() + 90_000),
        },
        {
          productId: "p1",
          type: "SALE",
          baseQuantity: 4,
          createdAt: new Date(start.getTime() + 120_000),
        },
      ],
      start,
      end,
    );

    expect(rows[0]?.openingQty).toBe("10");
    expect(rows[0]?.receiveQty).toBe("5");
    expect(rows[0]?.returnedQty).toBe("3");
    expect(rows[0]?.soldQty).toBe("4");
    expect(rows[0]?.expectedClosingQty).toBe("14");
    expect(rows[0]?.discrepancy).toBe("0");
  });

  it("flags a counted discrepancy without changing expected stock", () => {
    const { start, end } = baghdadDayBounds("2026-09-15");
    const rows = buildVanReconciliation(
      [
        {
          productId: "p1",
          sku: "A",
          name: "Item",
          liveBaseQty: 10,
          countedBaseQty: 8,
        },
      ],
      [],
      start,
      end,
    );
    expect(rows[0]?.expectedClosingQty).toBe("10");
    expect(rows[0]?.actualClosingQty).toBe("8");
    expect(rows[0]?.discrepancy).toBe("-2");
  });
});
