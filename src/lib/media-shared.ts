export const MEDIA_KINDS = ["STORE", "PRODUCT", "EMPLOYEE", "STOCK"] as const;
export type AppMediaKind = (typeof MEDIA_KINDS)[number];

/** Prisma / API entityType values for MediaAsset links. */
export const MEDIA_ENTITY_TYPES = [
  "User",
  "Product",
  "Store",
  "StockMovement",
  "StockAudit",
  "StockTransfer",
  "Invoice",
  "Transaction",
  "PurchaseOrder",
  "PurchaseReceipt",
  "StorePlacement",
  "Expense",
] as const;
export type MediaEntityType = (typeof MEDIA_ENTITY_TYPES)[number];

export const MEDIA_MAX_EDGE_PX = 1600;
export const MEDIA_MAX_BYTES = 500_000;

export function isMediaKind(value: string): value is AppMediaKind {
  return (MEDIA_KINDS as readonly string[]).includes(value);
}

export function isMediaEntityType(value: string): value is MediaEntityType {
  return (MEDIA_ENTITY_TYPES as readonly string[]).includes(value);
}

/** Rear for store/product/stock; front for employee portraits. */
export function facingModeForKind(kind: AppMediaKind): "user" | "environment" {
  return kind === "EMPLOYEE" ? "user" : "environment";
}

export function thumbKindForMedia(kind: AppMediaKind): "person" | "product" | "store" | "stock" {
  switch (kind) {
    case "EMPLOYEE":
      return "person";
    case "PRODUCT":
      return "product";
    case "STORE":
      return "store";
    case "STOCK":
      return "stock";
  }
}

export function mediaFileUrl(fileName: string): string {
  return `/api/media/file/${encodeURIComponent(fileName)}`;
}

export function isSafeMediaFileName(fileName: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i.test(
    fileName,
  );
}

export type MediaAssetDto = {
  id: string;
  kind: AppMediaKind;
  entityType: string;
  entityId: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
  capturedById: string;
  createdAt: string;
  updatedAt: string;
};

export function toMediaAssetDto(row: {
  id: string;
  kind: AppMediaKind;
  entityType: string;
  entityId: string;
  url: string;
  caption: string | null;
  isPrimary: boolean;
  capturedById: string;
  createdAt: Date;
  updatedAt: Date;
}): MediaAssetDto {
  return {
    id: row.id,
    kind: row.kind,
    entityType: row.entityType,
    entityId: row.entityId,
    url: row.url,
    caption: row.caption,
    isPrimary: row.isPrimary,
    capturedById: row.capturedById,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
