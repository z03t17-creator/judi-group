import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  backupFileName,
  createBackupPayload,
} from "@/lib/db-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin-only: download a full logical DB + media backup (.judibak). */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const payload = await createBackupPayload();
    const body = JSON.stringify(payload);
    const fileName = backupFileName(new Date(payload.createdAt));

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[backup] create failed", error);
    return NextResponse.json({ error: "backup_failed" }, { status: 500 });
  }
}
