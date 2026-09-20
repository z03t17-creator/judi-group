-- CreateEnum
CREATE TYPE "ProductPriceCurrency" AS ENUM ('IQD', 'USD', 'BOTH');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "priceCurrency" "ProductPriceCurrency" NOT NULL DEFAULT 'BOTH';
