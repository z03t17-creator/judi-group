import { describe, expect, it } from "vitest";
import {
  creditStatus,
  remainingCredit,
  canSellOnDebt,
  worseCreditStatus,
} from "@/lib/credit";
import { haversineKm, sortStoresByDistance } from "@/lib/geo";

describe("remainingCredit", () => {
  it("subtracts 4M debt from a 15M limit to 11M", () => {
    expect(remainingCredit(15_000_000, 4_000_000).toString()).toBe("11000000");
  });
});

describe("creditStatus", () => {
  it("treats 0 limit and 0 debt as ok", () => {
    expect(creditStatus(0, 0)).toBe("ok");
  });

  it("warns when 80% of the limit is used", () => {
    expect(creditStatus(10_000_000, 8_000_000)).toBe("warn");
  });

  it("blocks when debt meets the limit", () => {
    expect(creditStatus(15_000_000, 15_000_000)).toBe("blocked");
  });

  it("keeps the worse of IQD and USD statuses", () => {
    expect(worseCreditStatus("ok", "warn")).toBe("warn");
    expect(worseCreditStatus("blocked", "warn")).toBe("blocked");
  });
});

describe("canSellOnDebt", () => {
  it("allows a 11M sale against 11M remaining", () => {
    expect(canSellOnDebt(15_000_000, 4_000_000, 11_000_000)).toBe(true);
  });
});

describe("haversineKm", () => {
  it("returns 0 for the same point", () => {
    expect(haversineKm(36.191, 44.009, 36.191, 44.009)).toBe(0);
  });
});

describe("sortStoresByDistance", () => {
  it("orders a nearer store ahead of a farther one", () => {
    const origin = { latitude: 36.191, longitude: 44.009 };
    const sorted = sortStoresByDistance(
      [
        { id: "far", latitude: 36.25, longitude: 44.1 },
        { id: "near", latitude: 36.192, longitude: 44.01 },
        { id: "none", latitude: null, longitude: null },
      ],
      origin,
    );
    expect(sorted.map((store) => store.id)).toEqual(["near", "far", "none"]);
    expect(sorted[0].distanceKm!).toBeLessThan(sorted[1].distanceKm!);
  });
});
