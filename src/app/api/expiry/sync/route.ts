import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { syncExpiringLotAlerts } from "@/lib/expiry-alerts";

/** Office-triggered expiry alert sync (also runs on dashboard / expiry page load). */
export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (
    session.user.role !== "ADMIN" &&
    session.user.role !== "WAREHOUSE_ACCOUNTANT"
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const result = await syncExpiringLotAlerts("en");
  return NextResponse.json(result);
}
