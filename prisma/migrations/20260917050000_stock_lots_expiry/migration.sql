-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'FUEL', 'SALARIES', 'SPOILAGE', 'PURCHASE_FREIGHT', 'OTHER');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "shelfLifeDays" INTEGER;

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT,
    "storeId" TEXT,
    "productId" TEXT NOT NULL,
    "baseQty" DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    "expiryDate" DATE,
    "lotCode" TEXT,
    "sourcePurchaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockLot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StockLot_location_xor" CHECK (
      (("warehouseId" IS NOT NULL) AND ("storeId" IS NULL))
      OR (("warehouseId" IS NULL) AND ("storeId" IS NOT NULL))
    )
);

-- CreateTable
CREATE TABLE "StockLotMovement" (
    "id" TEXT NOT NULL,
    "stockLotId" TEXT NOT NULL,
    "stockMovementId" TEXT NOT NULL,
    "baseQuantity" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "StockLotMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IQD',
    "note" TEXT,
    "productId" TEXT,
    "stockLotId" TEXT,
    "warehouseId" TEXT,
    "storeId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockLot_warehouseId_productId_expiryDate_idx" ON "StockLot"("warehouseId", "productId", "expiryDate");

-- CreateIndex
CREATE INDEX "StockLot_storeId_productId_expiryDate_idx" ON "StockLot"("storeId", "productId", "expiryDate");

-- CreateIndex
CREATE INDEX "StockLot_productId_idx" ON "StockLot"("productId");

-- CreateIndex
CREATE INDEX "StockLot_expiryDate_idx" ON "StockLot"("expiryDate");

-- CreateIndex
CREATE INDEX "StockLot_lotCode_idx" ON "StockLot"("lotCode");

-- CreateIndex
CREATE INDEX "StockLot_sourcePurchaseId_idx" ON "StockLot"("sourcePurchaseId");

-- CreateIndex
CREATE INDEX "StockLotMovement_stockLotId_idx" ON "StockLotMovement"("stockLotId");

-- CreateIndex
CREATE INDEX "StockLotMovement_stockMovementId_idx" ON "StockLotMovement"("stockMovementId");

-- CreateIndex
CREATE UNIQUE INDEX "StockLotMovement_stockLotId_stockMovementId_key" ON "StockLotMovement"("stockLotId", "stockMovementId");

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_productId_idx" ON "Expense"("productId");

-- CreateIndex
CREATE INDEX "Expense_stockLotId_idx" ON "Expense"("stockLotId");

-- CreateIndex
CREATE INDEX "Expense_warehouseId_idx" ON "Expense"("warehouseId");

-- CreateIndex
CREATE INDEX "Expense_storeId_idx" ON "Expense"("storeId");

-- CreateIndex
CREATE INDEX "Expense_createdById_idx" ON "Expense"("createdById");

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLot" ADD CONSTRAINT "StockLot_sourcePurchaseId_fkey" FOREIGN KEY ("sourcePurchaseId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotMovement" ADD CONSTRAINT "StockLotMovement_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockLotMovement" ADD CONSTRAINT "StockLotMovement_stockMovementId_fkey" FOREIGN KEY ("stockMovementId") REFERENCES "StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_stockLotId_fkey" FOREIGN KEY ("stockLotId") REFERENCES "StockLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
