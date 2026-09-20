import { describe, expect, it } from "vitest";
import {
  resolveDiscounts,
  type DiscountRuleSnapshot,
} from "@/lib/discount-engine";
import { InvoiceError } from "@/lib/invoice";

function rule(partial: Partial<DiscountRuleSnapshot> & Pick<DiscountRuleSnapshot, "id" | "name" | "kind">): DiscountRuleSnapshot {
  return {
    scope: "INVOICE",
    valueType: "PERCENT",
    amount: "10",
    currency: null,
    storeTiers: [],
    productIds: [],
    categoryIds: [],
    startsAt: null,
    endsAt: null,
    priority: 100,
    active: true,
    stackWithGift: false,
    ...partial,
  };
}

describe("resolveDiscounts", () => {
  it("applies wholesale tier % off list price before line total", () => {
    const result = resolveDiscounts({
      storeTier: "WHOLESALE",
      currency: "IQD",
      manualDiscountPercent: 0,
      maxDiscountAllowed: 5,
      rules: [
        rule({
          id: "tier-1",
          name: "Wholesale",
          kind: "TIER_PRICE",
          scope: "LINE",
          amount: "10",
          storeTiers: ["WHOLESALE"],
        }),
      ],
      lines: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          categoryId: "22222222-2222-2222-2222-222222222222",
          productUnitId: "33333333-3333-3333-3333-333333333333",
          quantity: 2,
          listUnitPrice: 10_000,
        },
      ],
    });

    expect(result.lines[0]!.unitPrice.toString()).toBe("9000");
    expect(result.subTotal.toString()).toBe("18000");
    expect(result.totalAmount.toString()).toBe("18000");
    expect(result.chips.some((c) => c.kind === "TIER_PRICE")).toBe(true);
  });

  it("applies timed invoice money rule without needing a high personal cap", () => {
    const now = new Date("2026-09-17T10:00:00.000Z");
    const result = resolveDiscounts({
      storeTier: "SUPERMARKET",
      currency: "IQD",
      now,
      manualDiscountPercent: 0,
      maxDiscountAllowed: 0,
      rules: [
        rule({
          id: "money-1",
          name: "Launch off",
          kind: "MONEY",
          scope: "INVOICE",
          valueType: "MONEY",
          amount: "5000",
          currency: "IQD",
          startsAt: "2026-09-01T00:00:00.000Z",
          endsAt: "2026-09-30T23:59:59.000Z",
        }),
      ],
      lines: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          categoryId: "22222222-2222-2222-2222-222222222222",
          productUnitId: "33333333-3333-3333-3333-333333333333",
          quantity: 1,
          listUnitPrice: 50_000,
        },
      ],
    });

    expect(result.ruleDiscountAmount.toString()).toBe("5000");
    expect(result.totalAmount.toString()).toBe("45000");
    expect(result.manualDiscountAmount.toString()).toBe("0");
  });

  it("ignores rules outside the timed window", () => {
    const result = resolveDiscounts({
      storeTier: "SUPERMARKET",
      currency: "IQD",
      now: new Date("2026-10-01T00:00:00.000Z"),
      manualDiscountPercent: 0,
      maxDiscountAllowed: 0,
      rules: [
        rule({
          id: "money-1",
          name: "Expired",
          kind: "PERCENT",
          amount: "50",
          startsAt: "2026-09-01T00:00:00.000Z",
          endsAt: "2026-09-30T23:59:59.000Z",
        }),
      ],
      lines: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          categoryId: "22222222-2222-2222-2222-222222222222",
          productUnitId: "33333333-3333-3333-3333-333333333333",
          quantity: 1,
          listUnitPrice: 10_000,
        },
      ],
    });

    expect(result.discountAmount.toString()).toBe("0");
    expect(result.totalAmount.toString()).toBe("10000");
  });

  it("suggests gift qty from GIFT rules (max with user gift)", () => {
    const result = resolveDiscounts({
      storeTier: "MINIMARKET",
      currency: "IQD",
      manualDiscountPercent: 0,
      maxDiscountAllowed: 0,
      rules: [
        rule({
          id: "gift-1",
          name: "Buy get",
          kind: "GIFT",
          scope: "LINE",
          amount: "2",
          productIds: ["11111111-1111-1111-1111-111111111111"],
        }),
      ],
      lines: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          categoryId: "22222222-2222-2222-2222-222222222222",
          productUnitId: "33333333-3333-3333-3333-333333333333",
          quantity: 5,
          giftQuantity: 1,
          listUnitPrice: 1_000,
        },
      ],
    });

    expect(result.lines[0]!.giftQuantity.toString()).toBe("2");
    expect(result.lines[0]!.suggestedGiftQuantity.toString()).toBe("2");
  });

  it("picks the highest special among invoice peers", () => {
    const result = resolveDiscounts({
      storeTier: "SUPERMARKET",
      currency: "IQD",
      manualDiscountPercent: 0,
      maxDiscountAllowed: 0,
      rules: [
        rule({
          id: "s1",
          name: "Small",
          kind: "SPECIAL",
          valueType: "PERCENT",
          amount: "5",
          priority: 10,
        }),
        rule({
          id: "s2",
          name: "Big",
          kind: "SPECIAL",
          valueType: "PERCENT",
          amount: "15",
          priority: 10,
        }),
      ],
      lines: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          categoryId: "22222222-2222-2222-2222-222222222222",
          productUnitId: "33333333-3333-3333-3333-333333333333",
          quantity: 1,
          listUnitPrice: 100_000,
        },
      ],
    });

    expect(result.ruleDiscountAmount.toString()).toBe("15000");
    expect(result.chips.some((c) => c.ruleId === "s2")).toBe(true);
  });

  it("still caps manual percent even when admin rules apply", () => {
    expect(() =>
      resolveDiscounts({
        storeTier: "SUPERMARKET",
        currency: "IQD",
        manualDiscountPercent: 5,
        maxDiscountAllowed: 3,
        rules: [],
        lines: [
          {
            productId: "11111111-1111-1111-1111-111111111111",
            categoryId: "22222222-2222-2222-2222-222222222222",
            productUnitId: "33333333-3333-3333-3333-333333333333",
            quantity: 1,
            listUnitPrice: 10_000,
          },
        ],
      }),
    ).toThrow(InvoiceError);
  });

  it("blocks SPECIAL without stackWithGift when gifts are on the cart", () => {
    const result = resolveDiscounts({
      storeTier: "SUPERMARKET",
      currency: "IQD",
      manualDiscountPercent: 0,
      maxDiscountAllowed: 0,
      rules: [
        rule({
          id: "gift-1",
          name: "Freebie",
          kind: "GIFT",
          scope: "LINE",
          amount: "1",
        }),
        rule({
          id: "special-1",
          name: "No stack",
          kind: "SPECIAL",
          valueType: "PERCENT",
          amount: "20",
          stackWithGift: false,
        }),
        rule({
          id: "special-2",
          name: "Stacks",
          kind: "SPECIAL",
          valueType: "PERCENT",
          amount: "10",
          stackWithGift: true,
          priority: 50,
        }),
      ],
      lines: [
        {
          productId: "11111111-1111-1111-1111-111111111111",
          categoryId: "22222222-2222-2222-2222-222222222222",
          productUnitId: "33333333-3333-3333-3333-333333333333",
          quantity: 1,
          listUnitPrice: 10_000,
        },
      ],
    });

    expect(result.lines[0]!.giftQuantity.toString()).toBe("1");
    expect(result.ruleDiscountAmount.toString()).toBe("1000");
    expect(result.chips.some((c) => c.ruleId === "special-2")).toBe(true);
    expect(result.chips.some((c) => c.ruleId === "special-1")).toBe(false);
  });
});
