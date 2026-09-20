import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  parseBackupPayload,
  restoreBackupPayload,
} from "@/lib/db-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 80 * 1024 * 1024; // 80 MB

/** Admin-only: replace all app data from a .judibak backup. */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const confirm = String(form.get("confirm") ?? "").trim();
  if (confirm !== "RESTORE") {
    return NextResponse.json({ error: "confirm_required" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  let raw: unknown;
  try {
    const text = await file.text();
    raw = JSON.parse(text) as unknown;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  let payload;
  try {
    payload = parseBackupPayload(raw);
  } catch (error) {
    const code = error instanceof Error ? error.message : "invalid_backup";
    return NextResponse.json({ error: code }, { status: 400 });
  }

  try {
    const result = await restoreBackupPayload(payload);

    // Best-effort audit after restore (admin user may have been replaced by backup).
    try {
      const admin = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true },
      });
      if (admin) {
        await prisma.auditLog.create({
          data: {
            userId: admin.id,
            action: "DB_RESTORE",
            entityType: "System",
            entityId: result.checksum,
            details: {
              tables: result.tables,
              rows: result.rows,
              files: result.files,
              backupCreatedAt: payload.createdAt,
              backupAppVersion: payload.appVersion,
            },
          },
        });
      }
    } catch (auditError) {
      console.warn("[backup] audit after restore skipped", auditError);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[backup] restore failed", error);
    return NextResponse.json({ error: "restore_failed" }, { status: 500 });
  }
}
