import type { LocalizedText } from "@/lib/i18n";

export type ProductUnitFormValue = {
  id?: string;
  barcode: string;
  nameEn: string;
  nameAr: string;
  nameCkb: string;
  conversionRatio: string;
  sellingPrice: string;
  sellingPriceUsd: string;
  isBaseUnit: boolean;
};

export type ProductPriceCurrencyMode = "IQD" | "USD" | "BOTH";

export type ProductFormValues = {
  id?: string;
  sku: string;
  barcode: string;
  nameEn: string;
  nameAr: string;
  nameCkb: string;
  categoryId: string;
  subcategoryId: string;
  priceCurrency: ProductPriceCurrencyMode;
  baseCost: string;
  shelfLifeDays: string;
  units: ProductUnitFormValue[];
};

export type UnitPresetKey = "PIECE" | "PACK" | "CARTON";

export const UNIT_PRESETS: Record<
  UnitPresetKey,
  {
    key: UnitPresetKey;
    nameEn: string;
    nameAr: string;
    nameCkb: string;
    conversionRatio: string;
    defaultRatio: string;
  }
> = {
  PIECE: {
    key: "PIECE",
    nameEn: "Piece",
    nameAr: "قطعة",
    nameCkb: "دانە",
    conversionRatio: "1",
    defaultRatio: "1",
  },
  PACK: {
    key: "PACK",
    nameEn: "Pack",
    nameAr: "ربطة",
    nameCkb: "پاکەت",
    conversionRatio: "6",
    defaultRatio: "6",
  },
  CARTON: {
    key: "CARTON",
    nameEn: "Carton",
    nameAr: "كرتونة",
    nameCkb: "کارتۆن",
    conversionRatio: "24",
    defaultRatio: "24",
  },
};

const PRESET_ALIASES: Record<UnitPresetKey, string[]> = {
  PIECE: ["piece", "قطعة", "دانە", "pcs", "pc"],
  PACK: ["pack", "ربطة", "پاکەت", "bundle"],
  CARTON: ["carton", "كرتونة", "کارتۆن", "box", "case"],
};

export function matchUnitPreset(unit: {
  nameEn: string;
  nameAr?: string;
  nameCkb?: string;
}): UnitPresetKey | null {
  const tokens = [unit.nameEn, unit.nameAr ?? "", unit.nameCkb ?? ""]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  for (const key of Object.keys(UNIT_PRESETS) as UnitPresetKey[]) {
    const aliases = PRESET_ALIASES[key];
    if (tokens.some((token) => aliases.includes(token))) return key;
  }
  return null;
}

export function unitFromPreset(
  key: UnitPresetKey,
  options?: { isBaseUnit?: boolean; id?: string },
): ProductUnitFormValue {
  const preset = UNIT_PRESETS[key];
  const isBaseUnit = options?.isBaseUnit ?? key === "PIECE";
  return {
    id: options?.id,
    barcode: "",
    nameEn: preset.nameEn,
    nameAr: preset.nameAr,
    nameCkb: preset.nameCkb,
    conversionRatio: isBaseUnit ? "1" : preset.defaultRatio,
    sellingPrice: "",
    sellingPriceUsd: "",
    isBaseUnit,
  };
}

/** @deprecated Prefer unitFromPreset */
export const emptyUnit = (isBaseUnit = false): ProductUnitFormValue =>
  unitFromPreset(isBaseUnit ? "PIECE" : "PACK", { isBaseUnit });

export const defaultCreateValues: ProductFormValues = {
  sku: "",
  barcode: "",
  nameEn: "",
  nameAr: "",
  nameCkb: "",
  categoryId: "",
  subcategoryId: "",
  priceCurrency: "BOTH",
  baseCost: "0",
  shelfLifeDays: "",
  units: [
    unitFromPreset("PIECE", { isBaseUnit: true }),
    unitFromPreset("PACK"),
    unitFromPreset("CARTON"),
  ],
};

export function productToFormValues(product: {
  id: string;
  sku: string;
  barcode: string | null;
  name: unknown;
  categoryId: string;
  subcategoryId: string | null;
  priceCurrency: ProductPriceCurrencyMode;
  baseCost: { toString(): string };
  shelfLifeDays?: number | null;
  units: {
    id: string;
    barcode: string | null;
    unitName: unknown;
    conversionRatio: { toString(): string };
    sellingPrice: { toString(): string };
    sellingPriceUsd: { toString(): string };
    isBaseUnit: boolean;
  }[];
}): ProductFormValues {
  const name = product.name as LocalizedText;
  return {
    id: product.id,
    sku: product.sku,
    barcode: product.barcode ?? "",
    nameEn: name.en,
    nameAr: name.ar,
    nameCkb: name.ckb,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    priceCurrency: product.priceCurrency,
    baseCost: product.baseCost.toString(),
    shelfLifeDays:
      product.shelfLifeDays != null ? String(product.shelfLifeDays) : "",
    units: product.units.map((unit) => {
      const unitName = unit.unitName as LocalizedText;
      const matched = matchUnitPreset({
        nameEn: unitName.en,
        nameAr: unitName.ar,
        nameCkb: unitName.ckb,
      });
      const names = matched
        ? {
            nameEn: UNIT_PRESETS[matched].nameEn,
            nameAr: UNIT_PRESETS[matched].nameAr,
            nameCkb: UNIT_PRESETS[matched].nameCkb,
          }
        : {
            nameEn: unitName.en,
            nameAr: unitName.ar,
            nameCkb: unitName.ckb,
          };
      return {
        id: unit.id,
        barcode: unit.barcode ?? "",
        ...names,
        conversionRatio: unit.isBaseUnit
          ? "1"
          : unit.conversionRatio.toString(),
        sellingPrice: unit.sellingPrice.toString(),
        sellingPriceUsd: unit.sellingPriceUsd.toString(),
        isBaseUnit: unit.isBaseUnit,
      };
    }),
  };
}
