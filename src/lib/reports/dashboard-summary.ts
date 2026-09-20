import Decimal from "decimal.js";
import { MONEY_DP } from "@/lib/invoice";
import { toDecimal, type DecimalValue } from "@/lib/uom";
import { toBaghdadYmd } from "@/lib/reports/date";

export type DashboardInvoice = {
  id: string;
  invoiceType: string;
  status: string;
  subTotal: DecimalValue;
  totalAmount: DecimalValue;
  createdAt: Date;
  storeId: string;
  storeName: string;
  items: {
    productId: string;
    sku: string;
    name: string;
    baseUnitQuantity: DecimalValue;
    totalPrice: DecimalValue;
    isGift: boolean;
    baseCost: DecimalValue;
  }[];
};

export type DashboardPayment = {
  amount: DecimalValue;
  createdAt: Date;
};

export type DashboardStoreDebt = {
  storeId: string;
  storeName: string;
  debt: DecimalValue;
};

export function summarizeDashboard(input: {
  invoices: DashboardInvoice[];
  payments: DashboardPayment[];
  storeDebts: DashboardStoreDebt[];
  from: Date;
  to: Date;
}) {
  const inRange = input.invoices.filter(
    (inv) =>
      inv.status === "COMPLETED" &&
      inv.invoiceType !== "GIFT_PROMOTION" &&
      inv.createdAt >= input.from &&
      inv.createdAt < input.to,
  );

  let grossSales = new Decimal(0);
  let netSales = new Decimal(0);
  let cogs = new Decimal(0);

  const productMap = new Map<
    string,
    { productId: string; sku: string; name: string; unitsSold: Decimal; revenue: Decimal }
  >();
  const storeMap = new Map<string, { storeId: string; storeName: string; totalVolume: Decimal }>();
  const daily = new Map<string, Decimal>();

  for (const inv of inRange) {
    grossSales = grossSales.plus(toDecimal(inv.subTotal));
    netSales = netSales.plus(toDecimal(inv.totalAmount));

    const day = toBaghdadYmd(inv.createdAt);
    daily.set(day, (daily.get(day) ?? new Decimal(0)).plus(toDecimal(inv.totalAmount)));

    const storeBucket = storeMap.get(inv.storeId) ?? {
      storeId: inv.storeId,
      storeName: inv.storeName,
      totalVolume: new Decimal(0),
    };
    storeBucket.totalVolume = storeBucket.totalVolume.plus(toDecimal(inv.totalAmount));
    storeMap.set(inv.storeId, storeBucket);

    for (const item of inv.items) {
      if (item.isGift) continue;
      const lineCogs = toDecimal(item.baseUnitQuantity).times(toDecimal(item.baseCost));
      cogs = cogs.plus(lineCogs);

      const prod = productMap.get(item.productId) ?? {
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        unitsSold: new Decimal(0),
        revenue: new Decimal(0),
      };
      prod.unitsSold = prod.unitsSold.plus(toDecimal(item.baseUnitQuantity));
      prod.revenue = prod.revenue.plus(toDecimal(item.totalPrice));
      productMap.set(item.productId, prod);
    }
  }

  const cashCollected = input.payments
    .filter((p) => p.createdAt >= input.from && p.createdAt < input.to)
    .reduce((sum, p) => sum.plus(toDecimal(p.amount)), new Decimal(0));

  const outstandingDebt = input.storeDebts.reduce(
    (sum, s) => sum.plus(toDecimal(s.debt)),
    new Decimal(0),
  );

  const grossProfit = netSales.minus(cogs).toDecimalPlaces(MONEY_DP);
  const margin = netSales.gt(0)
    ? grossProfit.div(netSales).times(100).toDecimalPlaces(2)
    : new Decimal(0);

  const topProducts = [...productMap.values()]
    .sort((a, b) => b.revenue.cmp(a.revenue))
    .slice(0, 5)
    .map((p) => ({
      productId: p.productId,
      sku: p.sku,
      name: p.name,
      unitsSold: Number(p.unitsSold.toDecimalPlaces(4).toString()),
      revenue: Number(p.revenue.toDecimalPlaces(MONEY_DP).toString()),
    }));

  const debtByStore = new Map(input.storeDebts.map((s) => [s.storeId, toDecimal(s.debt)]));
  const topStores = [...storeMap.values()]
    .sort((a, b) => b.totalVolume.cmp(a.totalVolume))
    .slice(0, 5)
    .map((s) => ({
      storeId: s.storeId,
      storeName: s.storeName,
      totalVolume: Number(s.totalVolume.toDecimalPlaces(MONEY_DP).toString()),
      debt: Number((debtByStore.get(s.storeId) ?? new Decimal(0)).toDecimalPlaces(MONEY_DP).toString()),
    }));

  const dailyNetSales = [...daily.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, amount]) => ({
      date,
      netSales: Number(amount.toDecimalPlaces(MONEY_DP).toString()),
    }));

  return {
    summary: {
      grossSales: Number(grossSales.toDecimalPlaces(MONEY_DP).toString()),
      netSales: Number(netSales.toDecimalPlaces(MONEY_DP).toString()),
      totalCashCollected: Number(cashCollected.toDecimalPlaces(MONEY_DP).toString()),
      totalOutstandingDebt: Number(outstandingDebt.toDecimalPlaces(MONEY_DP).toString()),
      totalCostOfGoodsSold: Number(cogs.toDecimalPlaces(MONEY_DP).toString()),
      grossProfit: Number(grossProfit.toString()),
      profitMarginPercent: Number(margin.toString()),
    },
    topMetrics: { topProducts, topStores },
    dailyNetSales,
  };
}
