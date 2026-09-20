import { describe, expect, it } from "vitest";
import { groupInvoiceLines, thermalQuantityLabel } from "@/lib/invoice-view";
import { createInvoiceSchema } from "@/lib/validators";

describe("groupInvoiceLines", () => {
  it("merges a sold row and a gift row for the same unit", () => {
    const { lines, giftQtyTotal } = groupInvoiceLines([
      {
        id: "sold",
        productId: "p1",
        productUnitId: "u1",
        quantity: 2,
        isGift: false,
        unitPrice: 52000,
        totalPrice: 104000,
        productName: "Cheese",
        sku: "CH-1",
        unitName: "Carton",
        productThumbUrl: "/uploads/cheese.jpg",
      },
      {
        id: "gift",
        productId: "p1",
        productUnitId: "u1",
        quantity: 1,
        isGift: true,
        unitPrice: 52000,
        totalPrice: 0,
        productName: "Cheese",
        sku: "CH-1",
        unitName: "Carton",
        productThumbUrl: "/uploads/cheese.jpg",
      },
    ]);

    expect(giftQtyTotal).toBe("1");
    expect(lines).toHaveLength(1);
    expect(lines[0]?.soldQty).toBe("2");
    expect(lines[0]?.giftQty).toBe("1");
    expect(lines[0]?.lineTotal).toBe("104000");
  });
});

describe("thermalQuantityLabel", () => {
  it("appends the gift label when gift qty is present", () => {
    expect(thermalQuantityLabel("2", "1", "Free 1", (value) => value)).toBe("2 · Free 1");
    expect(thermalQuantityLabel("2", "0", "Free 0", (value) => value)).toBe("2");
  });
});

describe("createInvoiceSchema gifts", () => {
  const ids = {
    storeId: "11111111-1111-4111-8111-111111111111",
    productId: "22222222-2222-4222-8222-222222222222",
    productUnitId: "33333333-3333-4333-8333-333333333333",
  };

  it("accepts a gift-only line", () => {
    const parsed = createInvoiceSchema.safeParse({
      storeId: ids.storeId,
      invoiceType: "CASH",
      currency: "IQD",
      discountPercent: 0,
      lines: [
        {
          productId: ids.productId,
          productUnitId: ids.productUnitId,
          quantity: 0,
          giftQuantity: 2,
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects a line with neither sold nor gift qty", () => {
    const parsed = createInvoiceSchema.safeParse({
      storeId: ids.storeId,
      invoiceType: "CASH",
      currency: "IQD",
      discountPercent: 0,
      lines: [
        {
          productId: ids.productId,
          productUnitId: ids.productUnitId,
          quantity: 0,
          giftQuantity: 0,
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });
});
