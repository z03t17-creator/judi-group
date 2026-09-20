import { describe, expect, it } from "vitest";
import {
  StockError,
  applyTransferDecision,
  assertTransferRoute,
  movementBaseQuantity,
  nextBaseQty,
  signedBaseDelta,
} from "@/lib/stock";

describe("signedBaseDelta", () => {
  it("adds receive quantity as a positive base delta", () => {
    expect(signedBaseDelta("RECEIVE", 48).toString()).toBe("48");
  });

  it("subtracts write-off quantity as a negative base delta", () => {
    expect(signedBaseDelta("WRITE_OFF", 3).toString()).toBe("-3");
  });

  it("treats SALE as outbound like a write-off", () => {
    expect(signedBaseDelta("SALE", 48).toString()).toBe("-48");
  });

  it("treats GIFT as outbound like a sale", () => {
    expect(signedBaseDelta("GIFT", 2).toString()).toBe("-2");
  });

  it("treats RETURN as inbound like a receive", () => {
    expect(signedBaseDelta("RETURN", 5).toString()).toBe("5");
  });
});

describe("nextBaseQty", () => {
  it("receives 2 cartons (48) onto 240 and lands at 288", () => {
    const base = movementBaseQuantity(2, 24);
    const delta = signedBaseDelta("RECEIVE", base);
    expect(nextBaseQty(240, delta).toString()).toBe("288");
  });

  it("writes off 3 pieces from 240 and lands at 237", () => {
    const base = movementBaseQuantity(3, 1);
    const delta = signedBaseDelta("WRITE_OFF", base);
    expect(nextBaseQty(240, delta).toString()).toBe("237");
  });

  it("rejects a write-off of 300 from 240", () => {
    const base = movementBaseQuantity(300, 1);
    const delta = signedBaseDelta("WRITE_OFF", base);
    expect(() => nextBaseQty(240, delta)).toThrow(StockError);
    try {
      nextBaseQty(240, delta);
    } catch (error) {
      expect(error).toBeInstanceOf(StockError);
      expect((error as StockError).code).toBe("insufficient_stock");
    }
  });
});

describe("applyTransferDecision", () => {
  it("accepts 2 cartons (48) from 285 onto an empty van and lands at 237 / 48", () => {
    const base = movementBaseQuantity(2, 24);
    const result = applyTransferDecision("PENDING", "ACCEPTED", 285, 0, [
      { baseQuantity: base },
    ]);
    expect(result.sourceQty.toString()).toBe("237");
    expect(result.destQty.toString()).toBe("48");
  });

  it("rejects a pending load without moving stock", () => {
    const result = applyTransferDecision("PENDING", "REJECTED", 285, 0, [
      { baseQuantity: 48 },
    ]);
    expect(result.sourceQty.toString()).toBe("285");
    expect(result.destQty.toString()).toBe("0");
  });

  it("rejects accepting 300 from 285", () => {
    expect(() =>
      applyTransferDecision("PENDING", "ACCEPTED", 285, 0, [{ baseQuantity: 300 }]),
    ).toThrow(StockError);
    try {
      applyTransferDecision("PENDING", "ACCEPTED", 285, 0, [{ baseQuantity: 300 }]);
    } catch (error) {
      expect((error as StockError).code).toBe("insufficient_stock");
    }
  });

  it("blocks a second decision on a transfer that is no longer pending", () => {
    expect(() =>
      applyTransferDecision("ACCEPTED", "REJECTED", 237, 48, [{ baseQuantity: 48 }]),
    ).toThrow(StockError);
    try {
      applyTransferDecision("ACCEPTED", "REJECTED", 237, 48, [{ baseQuantity: 48 }]);
    } catch (error) {
      expect((error as StockError).code).toBe("transfer_not_pending");
    }
  });

  it("rejects a transfer to the same warehouse", () => {
    expect(() => assertTransferRoute("hub", "hub")).toThrow(StockError);
    try {
      assertTransferRoute("hub", "hub");
    } catch (error) {
      expect((error as StockError).code).toBe("same_warehouse");
    }
  });
});
