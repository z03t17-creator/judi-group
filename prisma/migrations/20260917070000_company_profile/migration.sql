-- Singleton company branding + invoice numbering
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nameEn" TEXT NOT NULL DEFAULT 'Judi',
    "nameAr" TEXT NOT NULL DEFAULT 'جودي',
    "nameCkb" TEXT NOT NULL DEFAULT 'جودی',
    "taglineEn" TEXT NOT NULL DEFAULT 'Distribution & Inventory ERP',
    "taglineAr" TEXT NOT NULL DEFAULT 'نظام التوزيع والمخزون',
    "taglineCkb" TEXT NOT NULL DEFAULT 'سیستەمی دابەشکردن و کۆگا',
    "address" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "taxId" TEXT,
    "logoUrl" TEXT,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV',
    "invoicePadWidth" INTEGER NOT NULL DEFAULT 6,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

INSERT INTO "CompanyProfile" ("id", "updatedAt")
VALUES ('default', CURRENT_TIMESTAMP)
ON CONFLICT ("id") DO NOTHING;
