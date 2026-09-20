import { describe, expect, it } from "vitest";
import { canSellOnDebt } from "@/lib/credit";
import { signedBaseDelta } from "@/lib/stock";
import {
  InvoiceError,
  assertCanSellOnDebt,
  assertDiscountPercent,
  invoiceTotals,
  lineBaseQuantity,
  lineStockQuantity,
  lineTotal,
  nextInvoiceNumber,
  nextStoreDebt,
  nextStoreDebtAfterReturn,
  resolveUnitPrice,
  pickUnitPrice,
  splitPayment,
} from "@/lib/invoice";

describe("lineTotal", () => {
  it("prices 2 cartons at 52000 as 104000", () => {
    expect(lineTotal(2, 52_000).toString()).toBe("104000");
  });
});

describe("invoiceTotals", () => {
  it("applies a 3% cap to 100000 leaving 97000", () => {
    assertDiscountPercent(3, 3);
    const totals = invoiceTotals(100_000, 3);
    expect(totals.discountAmount.toString()).toBe("3000");
    expect(totals.totalAmount.toString()).toBe("97000");
  });

  it("rejects 5% when the cap is 3%", () => {
    expect(() => assertDiscountPercent(5, 3)).toThrow(InvoiceError);
    try {
      assertDiscountPercent(5, 3);
    } catch (error) {
      expect((error as InvoiceError).code).toBe("discount_cap");
    }
  });
});

describe("canSellOnDebt", () => {
  it("blocks a 12M debt sale when 11M remains", () => {
    expect(canSellOnDebt(15_000_000, 4_000_000, 12_000_000)).toBe(false);
    expect(() => assertCanSellOnDebt(15_000_000, 4_000_000, 12_000_000)).toThrow(InvoiceError);
    try {
      assertCanSellOnDebt(15_000_000, 4_000_000, 12_000_000);
    } catch (error) {
      expect((error as InvoiceError).code).toBe("credit_blocked");
    }
  });

  it("never allows debt when the credit limit is 0", () => {
    expect(canSellOnDebt(0, 0, 1000)).toBe(false);
  });
});

describe("splitPayment and nextStoreDebt", () => {
  it("leaves current debt unchanged on a cash sale", () => {
    const paid = splitPayment("CASH", 52_000);
    expect(paid.paidAmount.toString()).toBe("52000");
    expect(paid.debtAmount.toString()).toBe("0");
    expect(nextStoreDebt(4_000_000, "CASH", 52_000).toString()).toBe("4000000");
  });

  it("adds a debt sale onto current debt", () => {
    expect(nextStoreDebt(0, "DEBT", 52_000).toString()).toBe("52000");
  });
});

describe("nextStoreDebtAfterReturn", () => {
  it("reduces debt by the return total", () => {
    expect(nextStoreDebtAfterReturn(100_000, 40_000).toString()).toBe("60000");
  });

  it("floors debt at zero when the return exceeds AR", () => {
    expect(nextStoreDebtAfterReturn(25_000, 40_000).toString()).toBe("0");
  });
});

describe("sale stock delta", () => {
  it("decrements 2 cartons as 48 base SALE units", () => {
    const base = lineBaseQuantity(2, 24);
    expect(base.toString()).toBe("48");
    expect(signedBaseDelta("SALE", base).toString()).toBe("-48");
  });

  it("decrements gift units as outbound GIFT", () => {
    expect(signedBaseDelta("GIFT", 2).toString()).toBe("-2");
  });

  it("increments return units as inbound RETURN", () => {
    expect(signedBaseDelta("RETURN", 5).toString()).toBe("5");
  });
});

describe("lineStockQuantity", () => {
  it("adds gift units onto sold units for van decrement", () => {
    expect(lineStockQuantity(2, 1).toString()).toBe("3");
    expect(lineStockQuantity(0, 2).toString()).toBe("2");
  });

  it("rejects a line with neither sold nor gift qty", () => {
    expect(() => lineStockQuantity(0, 0)).toThrow(InvoiceError);
  });
});

describe("resolveUnitPrice", () => {
  it("prefers a van custom price when present", () => {
    expect(resolveUnitPrice(52_000, 50_000).toString()).toBe("50000");
    expect(resolveUnitPrice(52_000, null).toString()).toBe("52000");
  });

  it("picks USD list or custom prices without mixing IQD", () => {
    expect(
      pickUnitPrice(
        { sellingPrice: 52_000, sellingPriceUsd: 40 },
        { customPrice: 50_000, customPriceUsd: null },
        "USD",
      ).toString(),
    ).toBe("40");
    expect(
      pickUnitPrice(
        { sellingPrice: 52_000, sellingPriceUsd: 40 },
        { customPrice: 50_000, customPriceUsd: 38 },
        "USD",
      ).toString(),
    ).toBe("38");
    expect(
      pickUnitPrice(
        { sellingPrice: 52_000, sellingPriceUsd: 40 },
        { customPrice: 50_000, customPriceUsd: 38 },
        "IQD",
      ).toString(),
    ).toBe("50000");
  });
});

describe("nextInvoiceNumber", () => {
  it("starts at INV-000001 and increments", () => {
    expect(nextInvoiceNumber(null)).toBe("INV-000001");
    expect(nextInvoiceNumber("INV-000001")).toBe("INV-000002");
  });

  it("honors custom prefix and pad width", () => {
    expect(nextInvoiceNumber(null, { prefix: "JG", padWidth: 4 })).toBe("JG-0001");
    expect(nextInvoiceNumber("JG-0001", { prefix: "JG", padWidth: 4 })).toBe("JG-0002");
    expect(nextInvoiceNumber("INV-000099", { prefix: "JG", padWidth: 4 })).toBe("JG-0100");
  });
});

