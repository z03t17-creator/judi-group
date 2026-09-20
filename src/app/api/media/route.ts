import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  isMediaEntityType,
  isMediaKind,
  setPrimaryMedia,
  toMediaAssetDto,
  writeMediaJpeg,
  type AppMediaKind,
} from "@/lib/media";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const entityType = url.searchParams.get("entityType") ?? "";
  const entityId = url.searchParams.get("entityId") ?? "";
  const kindRaw = url.searchParams.get("kind");

  if (!entityType || !entityId) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const where: {
    entityType: string;
    entityId: string;
    kind?: AppMediaKind;
  } = { entityType, entityId };

  if (kindRaw) {
    if (!isMediaKind(kindRaw)) {
      return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
    }
    where.kind = kindRaw;
  }

  const rows = await prisma.mediaAsset.findMany({
    where,
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ items: rows.map(toMediaAssetDto) });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const kindRaw = String(form.get("kind") ?? "");
  const entityType = String(form.get("entityType") ?? "");
  const entityId = String(form.get("entityId") ?? "");
  const captionRaw = form.get("caption");
  const caption =
    typeof captionRaw === "string" && captionRaw.trim() ? captionRaw.trim().slice(0, 280) : null;
  const makePrimary = String(form.get("isPrimary") ?? "") === "true" || form.get("isPrimary") === "1";
  const file = form.get("file");

  if (!isMediaKind(kindRaw) || !isMediaEntityType(entityType) || !entityId) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }

  // Accept camera JPEG or browser-picked images; we always store as JPEG bytes from client.
  if (file.size > 2_000_000) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength < 100) {
    return NextResponse.json({ error: "invalid_image" }, { status: 400 });
  }

  const { fileName, url } = await writeMediaJpeg(buffer);

  const created = await prisma.mediaAsset.create({
    data: {
      kind: kindRaw,
      entityType,
      entityId,
      url,
      fileName,
      caption,
      isPrimary: false,
      capturedById: session.user.id,
    },
  });

  const shouldPrimary =
    makePrimary ||
    (await prisma.mediaAsset.count({ where: { entityType, entityId } })) === 1;

  if (shouldPrimary) {
    await setPrimaryMedia({
      mediaId: created.id,
      entityType,
      entityId,
    });
  }

  const fresh = await prisma.mediaAsset.findUniqueOrThrow({ where: { id: created.id } });
  return NextResponse.json({ item: toMediaAssetDto(fresh) }, { status: 201 });
}
