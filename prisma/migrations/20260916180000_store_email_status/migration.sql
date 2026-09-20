-- AlterTable
ALTER TABLE "Store" ADD COLUMN "email" TEXT;
ALTER TABLE "Store" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ACTIVE';

-- CreateIndex
CREATE INDEX "Store_email_idx" ON "Store"("email");
CREATE INDEX "Store_status_idx" ON "Store"("status");
CREATE INDEX "Store_tier_idx" ON "Store"("tier");
