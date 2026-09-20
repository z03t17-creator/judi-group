import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOfficeRole } from "@/lib/constants";
import { isCurrency } from "@/lib/money";
import { loadDashboardSummary } from "@/lib/reports/dashboard-summary-load";
import { toBaghdadYmd } from "@/lib/reports/date";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user || !isOfficeRole(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const to = url.searchParams.get("to") ?? toBaghdadYmd(new Date());
  const fromDefault = (() => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 14);
    return toBaghdadYmd(d);
  })();
  const from = url.searchParams.get("from") ?? fromDefault;
  const currencyRaw = url.searchParams.get("currency") ?? "IQD";

  if (!isCurrency(currencyRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const summary = await loadDashboardSummary({
    from,
    to,
    currency: currencyRaw,
  });

  return NextResponse.json(summary);
}
