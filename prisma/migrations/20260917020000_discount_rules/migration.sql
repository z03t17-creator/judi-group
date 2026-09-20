-- CreateEnum
CREATE TYPE "DiscountRuleKind" AS ENUM ('MONEY', 'PERCENT', 'GIFT', 'TIER_PRICE', 'SPECIAL');

-- CreateEnum
CREATE TYPE "DiscountValueType" AS ENUM ('PERCENT', 'MONEY');

-- CreateEnum
CREATE TYPE "DiscountScope" AS ENUM ('INVOICE', 'LINE');

-- CreateTable
CREATE TABLE "DiscountRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DiscountRuleKind" NOT NULL,
    "scope" "DiscountScope" NOT NULL DEFAULT 'INVOICE',
    "valueType" "DiscountValueType" NOT NULL DEFAULT 'PERCENT',
    "amount" DECIMAL(14,4) NOT NULL,
    "currency" TEXT,
    "storeTiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "productIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "categoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "stackWithGift" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscountRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DiscountRule_active_idx" ON "DiscountRule"("active");

-- CreateIndex
CREATE INDEX "DiscountRule_priority_idx" ON "DiscountRule"("priority");

-- CreateIndex
CREATE INDEX "DiscountRule_startsAt_endsAt_idx" ON "DiscountRule"("startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "DiscountRule_kind_idx" ON "DiscountRule"("kind");
