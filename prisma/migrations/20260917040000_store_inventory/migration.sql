-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'STORE_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'STORE_IN';

-- CreateEnum
CREATE TYPE "StorePlacementDirection" AS ENUM ('TO_STORE', 'FROM_STORE');

-- CreateTable
CREATE TABLE "StoreInventory" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "baseQty" DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePlacement" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "direction" "StorePlacementDirection" NOT NULL,
    "createdById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorePlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorePlacementItem" (
    "id" TEXT NOT NULL,
    "placementId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productUnitId" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "baseQuantity" DECIMAL(14,4) NOT NULL,
    "expiryDate" DATE,
    "lotCode" TEXT,

    CONSTRAINT "StorePlacementItem_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN "storePlacementId" TEXT;

-- CreateIndex
CREATE INDEX "StoreInventory_storeId_idx" ON "StoreInventory"("storeId");

-- CreateIndex
CREATE INDEX "StoreInventory_productId_idx" ON "StoreInventory"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreInventory_storeId_productId_key" ON "StoreInventory"("storeId", "productId");

-- CreateIndex
CREATE INDEX "StorePlacement_storeId_createdAt_idx" ON "StorePlacement"("storeId", "createdAt");

-- CreateIndex
CREATE INDEX "StorePlacement_warehouseId_createdAt_idx" ON "StorePlacement"("warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "StorePlacement_direction_createdAt_idx" ON "StorePlacement"("direction", "createdAt");

-- CreateIndex
CREATE INDEX "StorePlacement_createdById_idx" ON "StorePlacement"("createdById");

-- CreateIndex
CREATE INDEX "StorePlacementItem_placementId_idx" ON "StorePlacementItem"("placementId");

-- CreateIndex
CREATE INDEX "StorePlacementItem_productId_idx" ON "StorePlacementItem"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_storePlacementId_idx" ON "StockMovement"("storePlacementId");

-- AddForeignKey
ALTER TABLE "StoreInventory" ADD CONSTRAINT "StoreInventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreInventory" ADD CONSTRAINT "StoreInventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePlacement" ADD CONSTRAINT "StorePlacement_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePlacement" ADD CONSTRAINT "StorePlacement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePlacement" ADD CONSTRAINT "StorePlacement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePlacementItem" ADD CONSTRAINT "StorePlacementItem_placementId_fkey" FOREIGN KEY ("placementId") REFERENCES "StorePlacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePlacementItem" ADD CONSTRAINT "StorePlacementItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorePlacementItem" ADD CONSTRAINT "StorePlacementItem_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_storePlacementId_fkey" FOREIGN KEY ("storePlacementId") REFERENCES "StorePlacement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
