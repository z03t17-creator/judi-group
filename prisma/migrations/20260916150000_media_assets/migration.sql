-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('STORE', 'PRODUCT', 'EMPLOYEE', 'STOCK');

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "capturedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "primaryMediaId" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "primaryMediaId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "primaryMediaId" TEXT;

-- CreateIndex
CREATE INDEX "MediaAsset_entityType_entityId_idx" ON "MediaAsset"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "MediaAsset_kind_idx" ON "MediaAsset"("kind");

-- CreateIndex
CREATE INDEX "MediaAsset_capturedById_idx" ON "MediaAsset"("capturedById");

-- CreateIndex
CREATE INDEX "MediaAsset_createdAt_idx" ON "MediaAsset"("createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_fileName_idx" ON "MediaAsset"("fileName");

-- CreateIndex
CREATE INDEX "User_primaryMediaId_idx" ON "User"("primaryMediaId");

-- CreateIndex
CREATE INDEX "Product_primaryMediaId_idx" ON "Product"("primaryMediaId");

-- CreateIndex
CREATE INDEX "Store_primaryMediaId_idx" ON "Store"("primaryMediaId");

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_capturedById_fkey" FOREIGN KEY ("capturedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primaryMediaId_fkey" FOREIGN KEY ("primaryMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_primaryMediaId_fkey" FOREIGN KEY ("primaryMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_primaryMediaId_fkey" FOREIGN KEY ("primaryMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
