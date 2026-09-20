-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER_OUT';
ALTER TYPE "StockMovementType" ADD VALUE 'TRANSFER_IN';

-- AlterTable StockTransfer
ALTER TABLE "StockTransfer" ADD COLUMN "createdById" TEXT NOT NULL;
ALTER TABLE "StockTransfer" ADD COLUMN "decidedById" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "notes" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "decidedAt" TIMESTAMP(3);
ALTER TABLE "StockTransfer" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "StockTransfer" ALTER COLUMN "status" TYPE "StockTransferStatus" USING ("status"::"StockTransferStatus");
ALTER TABLE "StockTransfer" ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable StockTransferItem
ALTER TABLE "StockTransferItem" ADD COLUMN "productUnitId" TEXT NOT NULL;
ALTER TABLE "StockTransferItem" ADD COLUMN "quantity" DECIMAL(10,2) NOT NULL;

-- AlterTable StockMovement
ALTER TABLE "StockMovement" ADD COLUMN "transferId" TEXT;

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");
CREATE INDEX "StockTransfer_sourceId_createdAt_idx" ON "StockTransfer"("sourceId", "createdAt");
CREATE INDEX "StockTransfer_destinationId_createdAt_idx" ON "StockTransfer"("destinationId", "createdAt");
CREATE INDEX "StockTransferItem_transferId_idx" ON "StockTransferItem"("transferId");
CREATE INDEX "StockTransferItem_productId_idx" ON "StockTransferItem"("productId");
CREATE INDEX "StockMovement_transferId_idx" ON "StockMovement"("transferId");

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransferItem" ADD CONSTRAINT "StockTransferItem_productUnitId_fkey" FOREIGN KEY ("productUnitId") REFERENCES "ProductUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
