import { describe, expect, it } from "vitest";
import {
  CollectionError,
  assertCollectionAmount,
  nextDebtAfterCollection,
  nextReceiptNumber,
} from "@/lib/collection";

describe("nextReceiptNumber", () => {
  it("starts at TRX-000001", () => {
    expect(nextReceiptNumber(null)).toBe("TRX-000001");
  });

  it("increments from the last receipt", () => {
    expect(nextReceiptNumber("TRX-000042")).toBe("TRX-000043");
  });
});

describe("assertCollectionAmount", () => {
  it("accepts a partial collection within debt", () => {
    expect(assertCollectionAmount(5_000_000, 800_000).toString()).toBe("800000");
  });

  it("rejects zero or negative amounts", () => {
    expect(() => assertCollectionAmount(1000, 0)).toThrow(CollectionError);
    try {
      assertCollectionAmount(1000, 0);
    } catch (error) {
      expect((error as CollectionError).code).toBe("invalid_amount");
    }
  });

  it("rejects overpay", () => {
    expect(() => assertCollectionAmount(500, 501)).toThrow(CollectionError);
    try {
      assertCollectionAmount(500, 501);
    } catch (error) {
      expect((error as CollectionError).code).toBe("overpay");
    }
  });

  it("rejects collection when debt is zero", () => {
    expect(() => assertCollectionAmount(0, 100)).toThrow(CollectionError);
    try {
      assertCollectionAmount(0, 100);
    } catch (error) {
      expect((error as CollectionError).code).toBe("no_debt");
    }
  });
});

describe("nextDebtAfterCollection", () => {
  it("reduces IQD debt by the collected amount", () => {
    expect(nextDebtAfterCollection(5_200_000, 800_000).toString()).toBe("4400000");
  });

  it("clears debt when collecting the full balance", () => {
    expect(nextDebtAfterCollection(2500, 2500).toString()).toBe("0");
  });
});
