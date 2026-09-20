import { describe, expect, it } from "vitest";
import { StoreStockError, nextStoreBaseQty } from "@/lib/store-stock";
import { signedBaseDelta } from "@/lib/stock";

describe("nextStoreBaseQty", () => {
  it("adds placed base qty onto store inventory", () => {
    expect(nextStoreBaseQty(10, 5).toString()).toBe("15");
  });

  it("rejects a return that exceeds store on-hand", () => {
    expect(() => nextStoreBaseQty(4, -5)).toThrow(StoreStockError);
    try {
      nextStoreBaseQty(4, -5);
    } catch (error) {
      expect(error).toBeInstanceOf(StoreStockError);
      expect((error as StoreStockError).code).toBe("insufficient_store_stock");
    }
  });
});

describe("store movement deltas", () => {
  it("treats STORE_OUT as outbound from warehouse", () => {
    expect(signedBaseDelta("STORE_OUT", 12).toString()).toBe("-12");
  });

  it("treats STORE_IN as inbound to warehouse", () => {
    expect(signedBaseDelta("STORE_IN", 12).toString()).toBe("12");
  });
});
