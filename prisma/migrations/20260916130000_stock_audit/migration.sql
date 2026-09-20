-- CreateTable
CREATE TABLE "StockAudit" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "auditDate" DATE NOT NULL,
    "recordedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditItem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "countedBaseQty" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "StockAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAudit_warehouseId_auditDate_idx" ON "StockAudit"("warehouseId", "auditDate");

-- CreateIndex
CREATE UNIQUE INDEX "StockAudit_warehouseId_auditDate_key" ON "StockAudit"("warehouseId", "auditDate");

-- CreateIndex
CREATE INDEX "StockAuditItem_productId_idx" ON "StockAuditItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAuditItem_auditId_productId_key" ON "StockAuditItem"("auditId", "productId");

-- AddForeignKey
ALTER TABLE "StockAudit" ADD CONSTRAINT "StockAudit_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAudit" ADD CONSTRAINT "StockAudit_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditItem" ADD CONSTRAINT "StockAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "StockAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditItem" ADD CONSTRAINT "StockAuditItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
