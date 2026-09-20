import { describe, expect, it } from "vitest";
import {
  ageReceivables,
  agingBandFromBuckets,
  buildStatement,
  worseAgingBand,
} from "@/lib/reports/statement";
import { baghdadDayBounds, toBaghdadYmd } from "@/lib/reports/date";

describe("buildStatement", () => {
  it("computes opening, running, and closing balances for AR events", () => {
    const from = baghdadDayBounds("2026-09-01").start;
    const to = baghdadDayBounds("2026-09-15").end;
    const result = buildStatement(
      [
        {
          date: new Date("2026-08-20T10:00:00Z"),
          type: "INVOICE",
          reference: "INV-000001",
          debit: 3_500_000,
          credit: 0,
        },
        {
          date: new Date("2026-09-02T10:15:00Z"),
          type: "INVOICE",
          reference: "INV-000421",
          debit: 2_500_000,
          credit: 0,
        },
        {
          date: new Date("2026-09-05T14:30:00Z"),
          type: "PAYMENT",
          reference: "TRX-000109",
          debit: 0,
          credit: 800_000,
        },
      ],
      from,
      to,
    );

    expect(result.openingBalance).toBe("3500000");
    expect(result.ledgerEntries).toHaveLength(2);
    expect(result.ledgerEntries[0]?.runningBalance).toBe("6000000");
    expect(result.ledgerEntries[1]?.runningBalance).toBe("5200000");
    expect(result.closingBalance).toBe("5200000");
  });
});

describe("ageReceivables", () => {
  it("applies collections FIFO and buckets residual by age", () => {
    const asOf = new Date("2026-09-15T12:00:00Z");
    const aging = ageReceivables(
      [
        { date: new Date("2026-06-01T10:00:00Z"), reference: "INV-1", amount: 1_000_000 },
        { date: new Date("2026-08-20T10:00:00Z"), reference: "INV-2", amount: 500_000 },
        { date: new Date("2026-09-10T10:00:00Z"), reference: "INV-3", amount: 200_000 },
      ],
      [{ date: new Date("2026-09-01T10:00:00Z"), amount: 1_100_000 }],
      asOf,
    );

    // 1M old invoice fully paid, 100k of Aug invoice paid → 400k remaining (~26 days → current)
    // Sept invoice untouched 200k → current
    expect(aging.over90).toBe("0");
    expect(aging.current).toBe("600000");
    expect(aging.days31to60).toBe("0");
    expect(aging.days61to90).toBe("0");
  });
});

describe("agingBandFromBuckets", () => {
  it("picks the oldest unpaid bucket", () => {
    expect(
      agingBandFromBuckets({
        current: "100",
        days31to60: "0",
        days61to90: "50",
        over90: "0",
      }),
    ).toBe("days61to90");
    expect(
      agingBandFromBuckets({
        current: "0",
        days31to60: "0",
        days61to90: "0",
        over90: "0",
      }),
    ).toBe("none");
    expect(worseAgingBand("current", "over90")).toBe("over90");
  });
});

describe("toBaghdadYmd", () => {
  it("shifts UTC into Baghdad calendar date", () => {
    // 2026-09-15 22:00 UTC = 2026-09-16 01:00 Baghdad
    expect(toBaghdadYmd(new Date("2026-09-15T22:00:00Z"))).toBe("2026-09-16");
  });
});
