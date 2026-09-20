-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSubcategory_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add nullable FKs first
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
ALTER TABLE "Product" ADD COLUMN "subcategoryId" TEXT;

-- Backfill categories from legacy JSON category.en key (or full JSON text)
INSERT INTO "ProductCategory" ("id", "name", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       p.category,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON ((category->>'en')) category
  FROM "Product"
  WHERE category IS NOT NULL
  ORDER BY (category->>'en')
) p;

UPDATE "Product" AS prod
SET "categoryId" = cat."id"
FROM "ProductCategory" AS cat
WHERE prod."categoryId" IS NULL
  AND (cat.name->>'en') = (prod.category->>'en');

-- Fallback any leftover products into a General category
INSERT INTO "ProductCategory" ("id", "name", "createdAt", "updatedAt")
SELECT 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       '{"en":"General","ar":"عام","ckb":"گشتی"}'::jsonb,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
WHERE NOT EXISTS (
  SELECT 1 FROM "ProductCategory" WHERE "id" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
);

UPDATE "Product"
SET "categoryId" = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
WHERE "categoryId" IS NULL;

ALTER TABLE "Product" ALTER COLUMN "categoryId" SET NOT NULL;
ALTER TABLE "Product" DROP COLUMN "category";

CREATE INDEX "ProductSubcategory_categoryId_idx" ON "ProductSubcategory"("categoryId");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");

ALTER TABLE "ProductSubcategory" ADD CONSTRAINT "ProductSubcategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey"
  FOREIGN KEY ("subcategoryId") REFERENCES "ProductSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
