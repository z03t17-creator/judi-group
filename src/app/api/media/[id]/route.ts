import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  canDeleteMedia,
  clearPrimaryIfNeeded,
  deleteMediaFile,
  setPrimaryMedia,
  toMediaAssetDto,
  writeMediaJpeg,
} from "@/lib/media";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const file = form.get("file");
    const captionRaw = form.get("caption");
    const makePrimary = String(form.get("isPrimary") ?? "");

    const data: {
      caption?: string | null;
      url?: string;
      fileName?: string;
    } = {};

    if (typeof captionRaw === "string") {
      data.caption = captionRaw.trim() ? captionRaw.trim().slice(0, 280) : null;
    }

    if (file instanceof File && file.size > 0) {
      if (file.size > 2_000_000) {
        return NextResponse.json({ error: "file_too_large" }, { status: 400 });
      }
      const buffer = Buffer.from(await file.arrayBuffer());
      const written = await writeMediaJpeg(buffer);
      await deleteMediaFile(existing.fileName);
      data.url = written.url;
      data.fileName = written.fileName;
    }

    const updated = await prisma.mediaAsset.update({
      where: { id },
      data,
    });

    if (makePrimary === "true" || makePrimary === "1") {
      await setPrimaryMedia({
        mediaId: id,
        entityType: existing.entityType,
        entityId: existing.entityId,
      });
    }

    const fresh =
      makePrimary === "true" || makePrimary === "1"
        ? await prisma.mediaAsset.findUniqueOrThrow({ where: { id } })
        : updated;
    return NextResponse.json({ item: toMediaAssetDto(fresh) });
  }

  let body: { caption?: string | null; isPrimary?: boolean };
  try {
    body = (await request.json()) as { caption?: string | null; isPrimary?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (body.caption !== undefined) {
    const caption =
      typeof body.caption === "string" && body.caption.trim()
        ? body.caption.trim().slice(0, 280)
        : null;
    await prisma.mediaAsset.update({
      where: { id },
      data: { caption },
    });
  }

  if (body.isPrimary === true) {
    await setPrimaryMedia({
      mediaId: id,
      entityType: existing.entityType,
      entityId: existing.entityId,
    });
  }

  const fresh = await prisma.mediaAsset.findUniqueOrThrow({ where: { id } });
  return NextResponse.json({ item: toMediaAssetDto(fresh) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (
    !canDeleteMedia({
      role: session.user.role,
      userId: session.user.id,
      capturedById: existing.capturedById,
    })
  ) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  await clearPrimaryIfNeeded({
    mediaId: existing.id,
    entityType: existing.entityType,
    entityId: existing.entityId,
    wasPrimary: existing.isPrimary,
  });

  await prisma.mediaAsset.delete({ where: { id } });
  await deleteMediaFile(existing.fileName);

  return NextResponse.json({ ok: true });
}
