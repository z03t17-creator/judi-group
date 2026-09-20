import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isOfficeRole } from "@/lib/constants";
import { isCurrency } from "@/lib/money";
import { loadCustomerStatement } from "@/lib/reports/statement-load";

export async function GET(
  request: Request,
  context: { params: Promise<{ storeId: string }> },
) {
  const session = await auth();
  if (!session?.user || !isOfficeRole(session.user.role)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { storeId } = await context.params;
  const url = new URL(request.url);
  const from = url.searchParams.get("from") ?? defaultFrom();
  const to = url.searchParams.get("to") ?? defaultTo();
  const currencyRaw = url.searchParams.get("currency") ?? "IQD";

  if (!isCurrency(currencyRaw) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const statement = await loadCustomerStatement({
    storeId,
    from,
    to,
    currency: currencyRaw,
  });

  if (!statement) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(statement);
}

function defaultTo() {
  return new Date().toISOString().slice(0, 10);
}

function defaultFrom() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 30);
  return d.toISOString().slice(0, 10);
}
