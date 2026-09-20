-- Reclassify customer-return stock posts that were recorded as RECEIVE.
UPDATE "StockMovement" AS sm
SET type = 'RETURN'
FROM "Invoice" AS inv
WHERE sm.type = 'RECEIVE'
  AND sm.notes IS NOT NULL
  AND sm.notes = inv."invoiceNumber"
  AND inv."invoiceType" = 'RETURN';
