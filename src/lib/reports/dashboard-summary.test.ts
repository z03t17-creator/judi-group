import { describe, expect, it } from "vitest";
import { summarizeDashboard } from "@/lib/reports/dashboard-summary";
import { baghdadDayBounds } from "@/lib/reports/date";

describe("summarizeDashboard", () => {
  it("aggregates sales, COGS, cash, and top metrics without mixing currencies", () => {
    const from = baghdadDayBounds("2026-09-01").start;
    const to = baghdadDayBounds("2026-09-15").end;

    const result = summarizeDashboard({
      from,
      to,
      invoices: [
        {
          id: "1",
          invoiceType: "CASH",
          status: "COMPLETED",
          subTotal: 100_000,
          totalAmount: 97_000,
          createdAt: new Date("2026-09-05T10:00:00Z"),
          storeId: "s1",
          storeName: "Al-Amal",
          items: [
            {
              productId: "p1",
              sku: "CHS-500",
              name: "Cheese",
              baseUnitQuantity: 24,
              totalPrice: 100_000,
              isGift: false,
              baseCost: 1800,
            },
          ],
        },
        {
          id: "2",
          invoiceType: "GIFT_PROMOTION",
          status: "COMPLETED",
          subTotal: 50_000,
          totalAmount: 0,
          createdAt: new Date("2026-09-06T10:00:00Z"),
          storeId: "s1",
          storeName: "Al-Amal",
          items: [],
        },
      ],
      payments: [
        { amount: 97_000, createdAt: new Date("2026-09-05T10:00:00Z") },
        { amount: 20_000, createdAt: new Date("2026-09-08T10:00:00Z") },
      ],
      storeDebts: [{ storeId: "s1", storeName: "Al-Amal", debt: 500_000 }],
    });

    expect(result.summary.grossSales).toBe(100000);
    expect(result.summary.netSales).toBe(97000);
    expect(result.summary.totalCashCollected).toBe(117000);
    expect(result.summary.totalOutstandingDebt).toBe(500000);
    expect(result.summary.totalCostOfGoodsSold).toBe(43200); // 24 * 1800
    expect(result.summary.grossProfit).toBe(53800);
    expect(result.topMetrics.topProducts[0]?.sku).toBe("CHS-500");
    expect(result.dailyNetSales).toHaveLength(1);
  });
});
