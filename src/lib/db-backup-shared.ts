export const BACKUP_FORMAT = "judi-erp-backup" as const;
export const BACKUP_VERSION = 1 as const;
export const BACKUP_FILE_EXT = ".judibak";

/** Insert order (parents before children). Keep in sync with Prisma models. */
export const BACKUP_TABLE_ORDER = [
  "CompanyProfile",
  "Warehouse",
  "User",
  "ProductCategory",
  "ProductSubcategory",
  "Product",
  "ProductUnit",
  "Store",
  "MediaAsset",
  "Supplier",
  "DiscountRule",
  "StockInventory",
  "StoreInventory",
  "PurchaseOrder",
  "PurchaseOrderLine",
  "PurchaseReceipt",
  "StockLot",
  "StockTransfer",
  "StockTransferItem",
  "StorePlacement",
  "StorePlacementItem",
  "Invoice",
  "InvoiceItem",
  "Transaction",
  "StockMovement",
  "StockLotMovement",
  "StockAudit",
  "StockAuditItem",
  "Expense",
  "AuditLog",
  "UserNotification",
  "PushSubscription",
] as const;

export type BackupTableName = (typeof BACKUP_TABLE_ORDER)[number];
