-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('SALE_PAYMENT', 'COLLECTION');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN "receiptNumber" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "type" "TransactionType" NOT NULL DEFAULT 'SALE_PAYMENT';

-- Backfill receipt numbers for any existing rows
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY "createdAt", id) AS rn
  FROM "Transaction"
  WHERE "receiptNumber" IS NULL
)
UPDATE "Transaction" t
SET "receiptNumber" = 'TRX-' || LPAD(numbered.rn::text, 6, '0')
FROM numbered
WHERE t.id = numbered.id;

-- Enforce uniqueness and NOT NULL
ALTER TABLE "Transaction" ALTER COLUMN "receiptNumber" SET NOT NULL;
CREATE UNIQUE INDEX "Transaction_receiptNumber_key" ON "Transaction"("receiptNumber");

-- CreateIndex
CREATE INDEX "Transaction_type_idx" ON "Transaction"("type");
