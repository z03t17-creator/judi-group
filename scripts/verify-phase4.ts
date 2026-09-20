import { loadDashboardSummary } from "../src/lib/reports/dashboard-summary-load";
import { loadCustomerStatement } from "../src/lib/reports/statement-load";
import { loadVanReconciliation } from "../src/lib/reports/van-reconciliation-load";

async function main() {
  const from = "2026-09-01";
  const to = "2026-09-16";
  const dash = await loadDashboardSummary({ from, to, currency: "IQD" });
  console.log("dash net", dash.summary.netSales, "products", dash.topMetrics.topProducts.length);
  const stmt = await loadCustomerStatement({
    storeId: "33333333-3333-3333-3333-333333333333",
    from,
    to,
    currency: "IQD",
  });
  console.log("stmt close", stmt?.closingBalance, "entries", stmt?.ledgerEntries.length);
  const recon = await loadVanReconciliation({
    vanId: "22222222-2222-2222-2222-222222222222",
    date: to,
  });
  console.log("recon items", recon?.auditItems.length, recon?.driverName);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
