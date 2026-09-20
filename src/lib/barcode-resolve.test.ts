import { describe, expect, it } from "vitest";
import {
  productMatchesBarcodeQuery,
  resolveProductBarcode,
  type BarcodeResolvableProduct,
} from "./barcode-resolve";

const products: BarcodeResolvableProduct[] = [
  {
    id: "p1",
    sku: "CHS-500",
    barcode: "6281000005001",
    units: [
      {
        id: "u-piece",
        barcode: "6281000005011",
        conversionRatio: "1",
        isBaseUnit: true,
      },
      {
        id: "u-pack",
        barcode: "6281000005021",
        conversionRatio: "6",
        isBaseUnit: false,
      },
      {
        id: "u-carton",
        barcode: "6281000005031",
        conversionRatio: "24",
        isBaseUnit: false,
      },
    ],
  },
  {
    id: "p2",
    sku: "OIL-1L",
    barcode: null,
    units: [
      {
        id: "u2-base",
        barcode: null,
        conversionRatio: "1",
        isBaseUnit: true,
      },
    ],
  },
];

describe("resolveProductBarcode", () => {
  it("resolves unit barcode to that unit", () => {
    expect(resolveProductBarcode(products, "6281000005021")).toEqual({
      productId: "p1",
      productUnitId: "u-pack",
      matchedOn: "unit",
    });
  });

  it("resolves product barcode to largest unit by default", () => {
    expect(resolveProductBarcode(products, "6281000005001")).toEqual({
      productId: "p1",
      productUnitId: "u-carton",
      matchedOn: "product",
    });
  });

  it("resolves product barcode to base unit when requested", () => {
    expect(
      resolveProductBarcode(products, "6281000005001", { fallbackUnit: "base" }),
    ).toEqual({
      productId: "p1",
      productUnitId: "u-piece",
      matchedOn: "product",
    });
  });

  it("resolves SKU exact match", () => {
    expect(resolveProductBarcode(products, "oil-1l")).toEqual({
      productId: "p2",
      productUnitId: "u2-base",
      matchedOn: "sku",
    });
  });

  it("returns null for unknown codes", () => {
    expect(resolveProductBarcode(products, "nope")).toBeNull();
  });
});

describe("productMatchesBarcodeQuery", () => {
  it("matches unit barcodes in soft search", () => {
    expect(
      productMatchesBarcodeQuery(
        { ...products[0]!, name: "Cheese" },
        "6281000005031",
      ),
    ).toBe(true);
  });
});
