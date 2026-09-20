-- AlterTable
ALTER TABLE "ProductUnit" ADD COLUMN "barcode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductUnit_barcode_key" ON "ProductUnit"("barcode");

-- CreateIndex
CREATE INDEX "ProductUnit_barcode_idx" ON "ProductUnit"("barcode");

-- Data migrate: copy product barcode onto its only unit (legacy → unit)
UPDATE "ProductUnit" AS pu
SET "barcode" = p."barcode"
FROM "Product" AS p
WHERE pu."productId" = p.id
  AND p."barcode" IS NOT NULL
  AND pu."barcode" IS NULL
  AND (
    SELECT COUNT(*)::int
    FROM "ProductUnit" AS pu2
    WHERE pu2."productId" = p.id
  ) = 1;
