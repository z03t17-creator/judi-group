import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isSafeMediaFileName, MEDIA_UPLOAD_DIR } from "@/lib/media";

type RouteContext = { params: Promise<{ name: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { name: rawName } = await context.params;
  const fileName = decodeURIComponent(rawName);

  if (!isSafeMediaFileName(fileName)) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  try {
    const bytes = await readFile(path.join(MEDIA_UPLOAD_DIR, fileName));
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
