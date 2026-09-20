import { prisma } from "@/lib/prisma";

export type DbBarcodeHit = {
  productId: string;
  productUnitId: string;
  matchedOn: "unit" | "product";
};

/**
 * Server-side barcode lookup for stock / purchases / transfers.
 * Unit barcodes win; product-level barcode falls back to base (or largest) unit.
 */
export async function resolveBarcodeFromDb(
  raw: string,
  options?: { fallbackUnit?: "largest" | "base" },
): Promise<DbBarcodeHit | null> {
  const code = raw.trim();
  if (!code) return null;

  const unit = await prisma.productUnit.findFirst({
    where: { barcode: { equals: code, mode: "insensitive" } },
    select: { id: true, productId: true },
  });
  if (unit) {
    return {
      productId: unit.productId,
      productUnitId: unit.id,
      matchedOn: "unit",
    };
  }

  const product = await prisma.product.findFirst({
    where: { barcode: { equals: code, mode: "insensitive" } },
    include: {
      units: {
        select: {
          id: true,
          isBaseUnit: true,
          conversionRatio: true,
        },
      },
    },
  });
  if (!product?.units.length) return null;

  const mode = options?.fallbackUnit ?? "base";
  const sorted =
    mode === "base"
      ? [...product.units].sort((a, b) => {
          if (a.isBaseUnit !== b.isBaseUnit) return a.isBaseUnit ? -1 : 1;
          return Number(a.conversionRatio) - Number(b.conversionRatio);
        })
      : [...product.units].sort(
          (a, b) => Number(b.conversionRatio) - Number(a.conversionRatio),
        );
  const pick = sorted[0];
  if (!pick) return null;

  return {
    productId: product.id,
    productUnitId: pick.id,
    matchedOn: "product",
  };
}
