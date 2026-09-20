import { NextResponse } from "next/server";
import { getVapidKeys } from "@/lib/vapid";

/** Public VAPID key for client push subscribe — always available after server start. */
export async function GET() {
  const keys = await getVapidKeys();
  return NextResponse.json(
    {
      publicKey: keys.publicKey,
      subject: keys.subject,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
