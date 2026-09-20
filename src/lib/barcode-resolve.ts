/** Client-side barcode / SKU resolution against an in-memory product list. */

export type BarcodeMatchKind = "unit" | "product" | "sku";

export type BarcodeHit = {
  productId: string;
  productUnitId: string;
  matchedOn: BarcodeMatchKind;
};

export type BarcodeResolvableUnit = {
  id: string;
  barcode?: string | null;
  conversionRatio: string;
  isBaseUnit?: boolean;
};

export type BarcodeResolvableProduct = {
  id: string;
  sku: string;
  barcode?: string | null;
  units: BarcodeResolvableUnit[];
};

export type ResolveBarcodeOptions = {
  /**
   * When the hit is product barcode or SKU (not a unit barcode),
   * which unit to pick. Sales default to largest pack; stock to base.
   */
  fallbackUnit?: "largest" | "base";
};

function normalizeCode(raw: string) {
  return raw.trim().toLowerCase();
}

function pickFallbackUnit(
  units: BarcodeResolvableUnit[],
  mode: "largest" | "base",
): BarcodeResolvableUnit | undefined {
  if (!units.length) return undefined;
  if (mode === "base") {
    return units.find((unit) => unit.isBaseUnit) ?? [...units].sort(
      (a, b) => Number(a.conversionRatio) - Number(b.conversionRatio),
    )[0];
  }
  return [...units].sort(
    (a, b) => Number(b.conversionRatio) - Number(a.conversionRatio),
  )[0];
}

/**
 * Resolve a scanned / typed code to product + unit.
 * Priority: unit barcode → product barcode → SKU (exact).
 */
export function resolveProductBarcode(
  products: BarcodeResolvableProduct[],
  raw: string,
  options?: ResolveBarcodeOptions,
): BarcodeHit | null {
  const needle = normalizeCode(raw);
  if (!needle) return null;

  const fallback = options?.fallbackUnit ?? "largest";

  for (const product of products) {
    for (const unit of product.units) {
      if ((unit.barcode ?? "").toLowerCase() === needle) {
        return {
          productId: product.id,
          productUnitId: unit.id,
          matchedOn: "unit",
        };
      }
    }
  }

  for (const product of products) {
    if ((product.barcode ?? "").toLowerCase() === needle) {
      const unit = pickFallbackUnit(product.units, fallback);
      if (!unit) return null;
      return {
        productId: product.id,
        productUnitId: unit.id,
        matchedOn: "product",
      };
    }
  }

  for (const product of products) {
    if (product.sku.toLowerCase() === needle) {
      const unit = pickFallbackUnit(product.units, fallback);
      if (!unit) return null;
      return {
        productId: product.id,
        productUnitId: unit.id,
        matchedOn: "sku",
      };
    }
  }

  return null;
}

/** Soft filter: product matches query via sku, name, product barcode, or any unit barcode. */
export function productMatchesBarcodeQuery(
  product: BarcodeResolvableProduct & { name?: string },
  raw: string,
): boolean {
  const needle = normalizeCode(raw);
  if (!needle) return true;
  if (product.sku.toLowerCase().includes(needle)) return true;
  if ((product.name ?? "").toLowerCase().includes(needle)) return true;
  if ((product.barcode ?? "").toLowerCase().includes(needle)) return true;
  return product.units.some((unit) =>
    (unit.barcode ?? "").toLowerCase().includes(needle),
  );
}
