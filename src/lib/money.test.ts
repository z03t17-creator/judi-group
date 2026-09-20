import { describe, expect, it } from "vitest";
import { canSellOnDebt, remainingCredit } from "@/lib/credit";
import { lineTotal, nextStoreDebt } from "@/lib/invoice";
import {
  formatDualMoney,
  formatMoney,
  formatNumber,
  ledgerAmounts,
  parseFormattedNumber,
} from "@/lib/money";

describe("formatNumber", () => {
  it("uses Latin digits with comma thousand separators", () => {
    expect(formatNumber(25_000_000, { fractionDigits: 0 })).toBe("25,000,000");
    expect(formatNumber(20_000, { fractionDigits: 0 })).toBe("20,000");
    expect(formatNumber(40, { fractionDigits: 2 })).toBe("40.00");
  });
});

describe("parseFormattedNumber", () => {
  it("strips commas before parsing", () => {
    expect(parseFormattedNumber("25,000,000")).toBe("25000000");
    expect(parseFormattedNumber("1,234.50")).toBe("1234.50");
  });
});

describe("formatMoney", () => {
  it("formats IQD and USD with thousand separators", () => {
    expect(formatMoney(52_000, "IQD")).toBe("52,000 IQD");
    expect(formatMoney(40, "USD")).toBe("$40.00");
    expect(formatMoney(15_000_000, "IQD")).toBe("15,000,000 IQD");
    expect(formatMoney(10_000.5, "USD")).toBe("$10,000.50");
  });

  it("merges dual ledgers with separators", () => {
    expect(formatDualMoney(37_500, 40)).toBe("37,500 IQD · $40.00");
  });
});

describe("separate IQD and USD ledgers", () => {
  it("prices 2 IQD cartons at 52000 as 104000", () => {
    expect(lineTotal(2, 52_000).toString()).toBe("104000");
  });

  it("prices 2 USD cartons at 40 as 80", () => {
    expect(lineTotal(2, 40).toString()).toBe("80");
  });

  it("does not change IQD currentDebt when a USD debt of 50 is posted", () => {
    const iqdDebt = "52000";
    const usdDebt = nextStoreDebt(0, "DEBT", 50);
    expect(usdDebt.toString()).toBe("50");
    expect(iqdDebt).toBe("52000");
    expect(nextStoreDebt(iqdDebt, "CASH", 50).toString()).toBe("52000");
  });

  it("does not use the IQD 15M limit to allow or deny a USD amount", () => {
    const store = {
      creditLimit: 15_000_000,
      currentDebt: 52_000,
      creditLimitUsd: 10_000,
      currentDebtUsd: 9_990,
    };
    const iqd = ledgerAmounts(store, "IQD");
    const usd = ledgerAmounts(store, "USD");
    expect(remainingCredit(iqd.limit, iqd.debt).toString()).toBe("14948000");
    expect(canSellOnDebt(iqd.limit, iqd.debt, 50)).toBe(true);
    expect(canSellOnDebt(usd.limit, usd.debt, 50)).toBe(false);
  });
});
