-- USD ledger runs in parallel with IQD. No exchange rate is applied between them.
ALTER TABLE "ProductUnit" ADD COLUMN "sellingPriceUsd" DECIMAL(12,4) NOT NULL DEFAULT 0;

ALTER TABLE "StockInventory" ADD COLUMN "customPriceUsd" DECIMAL(12,4);

ALTER TABLE "Store" ADD COLUMN "creditLimitUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
                   ADD COLUMN "currentDebtUsd" DECIMAL(14,2) NOT NULL DEFAULT 0.00;
