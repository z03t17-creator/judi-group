import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOfficeRole } from "@/lib/constants";
import { loadVanReconciliation } from "@/lib/reports/van-reconciliation-load";
import { toBaghdadYmd } from "@/lib/reports/date";

export async function GET(
  request: Request,
  context: { params: Promise<{ vanId: string }> },
) {
  const session = await auth();
  if (!session?.user || !isOfficeRole(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { vanId } = await context.params;
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? toBaghdadYmd(new Date());

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const report = await loadVanReconciliation({ vanId, date, locale: "en" });
  if (!report) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    vanId: report.vanId,
    driverName: report.driverName,
    reconciliationDate: report.reconciliationDate,
    auditItems: report.auditItems.map((item) => ({
      productId: item.productId,
      sku: item.sku,
      name: item.name,
      openingQty: Number(item.openingQty),
      loadedQty: Number(item.loadedQty),
      soldQty: Number(item.soldQty),
      giftQty: Number(item.giftQty),
      returnedQty: Number(item.returnedQty),
      expectedClosingQty: Number(item.expectedClosingQty),
      actualClosingQty: Number(item.actualClosingQty),
      discrepancy: Number(item.discrepancy),
    })),
  });
}
