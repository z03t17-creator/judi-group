import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { mediaFileUrl, isSafeMediaFileName } from "@/lib/media-shared";

export {
  MEDIA_KINDS,
  MEDIA_ENTITY_TYPES,
  MEDIA_MAX_EDGE_PX,
  MEDIA_MAX_BYTES,
  isMediaKind,
  isMediaEntityType,
  facingModeForKind,
  thumbKindForMedia,
  mediaFileUrl,
  isSafeMediaFileName,
  toMediaAssetDto,
  type AppMediaKind,
  type MediaEntityType,
  type MediaAssetDto,
} from "@/lib/media-shared";

export const MEDIA_UPLOAD_DIR = path.join(process.cwd(), "uploads");

export async function ensureUploadDir(): Promise<void> {
  await mkdir(MEDIA_UPLOAD_DIR, { recursive: true });
}

export async function writeMediaJpeg(buffer: Buffer): Promise<{ fileName: string; url: string }> {
  await ensureUploadDir();
  const fileName = `${randomUUID()}.jpg`;
  await writeFile(path.join(MEDIA_UPLOAD_DIR, fileName), buffer);
  return { fileName, url: mediaFileUrl(fileName) };
}

export async function deleteMediaFile(fileName: string): Promise<void> {
  if (!isSafeMediaFileName(fileName)) return;
  try {
    await unlink(path.join(MEDIA_UPLOAD_DIR, fileName));
  } catch {
    // Missing file is fine — DB row is source of truth for cleanup attempts.
  }
}

export function canDeleteMedia(args: {
  role: Role;
  userId: string;
  capturedById: string;
}): boolean {
  return args.role === "ADMIN" || args.userId === args.capturedById;
}

/** Clear other primaries for the same entity and sync Store/Product/User.primaryMediaId. */
export async function setPrimaryMedia(args: {
  mediaId: string;
  entityType: string;
  entityId: string;
}): Promise<void> {
  const { mediaId, entityType, entityId } = args;

  await prisma.$transaction(async (tx) => {
    await tx.mediaAsset.updateMany({
      where: { entityType, entityId, isPrimary: true, NOT: { id: mediaId } },
      data: { isPrimary: false },
    });
    await tx.mediaAsset.update({
      where: { id: mediaId },
      data: { isPrimary: true },
    });

    if (entityType === "User") {
      await tx.user.update({
        where: { id: entityId },
        data: { primaryMediaId: mediaId },
      });
    } else if (entityType === "Product") {
      await tx.product.update({
        where: { id: entityId },
        data: { primaryMediaId: mediaId },
      });
    } else if (entityType === "Store") {
      await tx.store.update({
        where: { id: entityId },
        data: { primaryMediaId: mediaId },
      });
    }
  });
}

export async function clearPrimaryIfNeeded(args: {
  mediaId: string;
  entityType: string;
  entityId: string;
  wasPrimary: boolean;
}): Promise<void> {
  if (!args.wasPrimary) return;

  if (args.entityType === "User") {
    await prisma.user.updateMany({
      where: { id: args.entityId, primaryMediaId: args.mediaId },
      data: { primaryMediaId: null },
    });
  } else if (args.entityType === "Product") {
    await prisma.product.updateMany({
      where: { id: args.entityId, primaryMediaId: args.mediaId },
      data: { primaryMediaId: null },
    });
  } else if (args.entityType === "Store") {
    await prisma.store.updateMany({
      where: { id: args.entityId, primaryMediaId: args.mediaId },
      data: { primaryMediaId: null },
    });
  }
}
