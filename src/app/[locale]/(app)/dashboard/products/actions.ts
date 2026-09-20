"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { assertValidUnitSet, UomError } from "@/lib/uom";
import { productInputSchema, updateProductSchema } from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

class ProductUnitInUseError extends Error {
  constructor() {
    super("inUse");
    this.name = "ProductUnitInUseError";
  }
}

class BarcodeTakenError extends Error {
  constructor() {
    super("barcodeTaken");
    this.name = "BarcodeTakenError";
  }
}

async function productsPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/products?${query}`
    : `/${locale}/dashboard/products`;
}

async function productPath(id: string, query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/products/${id}?${query}`
    : `/${locale}/dashboard/products/${id}`;
}

function parseUnitsJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function toProductData(input: {
  sku: string;
  barcode?: string;
  nameEn?: string;
  nameAr?: string;
  nameCkb?: string;
  categoryId: string;
  subcategoryId?: string;
  priceCurrency: "IQD" | "USD" | "BOTH";
  baseCost: number;
  shelfLifeDays?: number | "" | null;
  units: {
    id?: string;
    barcode?: string;
    nameEn: string;
    nameAr: string;
    nameCkb: string;
    conversionRatio: number;
    sellingPrice: number;
    sellingPriceUsd: number;
    isBaseUnit: boolean;
  }[];
}) {
  assertValidUnitSet(
    input.units.map((unit) => ({
      isBaseUnit: unit.isBaseUnit,
      conversionRatio: unit.conversionRatio,
    })),
  );

  const subcategoryId =
    input.subcategoryId && input.subcategoryId.trim()
      ? input.subcategoryId.trim()
      : null;

  const useIqd = input.priceCurrency === "IQD" || input.priceCurrency === "BOTH";
  const useUsd = input.priceCurrency === "USD" || input.priceCurrency === "BOTH";

  return {
    sku: input.sku.trim().toUpperCase(),
    barcode: input.barcode?.trim() ? input.barcode.trim() : null,
    name: {
      en: (input.nameEn ?? "").trim(),
      ar: (input.nameAr ?? "").trim(),
      ckb: (input.nameCkb ?? "").trim(),
    },
    categoryId: input.categoryId,
    subcategoryId,
    priceCurrency: input.priceCurrency,
    baseCost: new Prisma.Decimal(input.baseCost),
    shelfLifeDays:
      input.shelfLifeDays === "" ||
      input.shelfLifeDays == null ||
      !Number.isFinite(Number(input.shelfLifeDays))
        ? null
        : Math.floor(Number(input.shelfLifeDays)),
    units: input.units.map((unit) => ({
      id: unit.id?.trim() || undefined,
      barcode: unit.barcode?.trim() ? unit.barcode.trim() : null,
      unitName: { en: unit.nameEn, ar: unit.nameAr, ckb: unit.nameCkb },
      conversionRatio: new Prisma.Decimal(unit.conversionRatio),
      sellingPrice: new Prisma.Decimal(useIqd ? unit.sellingPrice : 0),
      sellingPriceUsd: new Prisma.Decimal(useUsd ? unit.sellingPriceUsd : 0),
      isBaseUnit: unit.isBaseUnit,
    })),
  };
}

/**
 * Barcodes must be unique across Product and ProductUnit.
 * Same draft may reuse product-level barcode on one of its own units (legacy sync).
 */
async function assertBarcodesAvailable(
  productBarcode: string | null,
  units: { id?: string; barcode: string | null }[],
  excludeProductId?: string,
) {
  const unitCodes: { code: string; excludeUnitId?: string }[] = [];
  for (const unit of units) {
    if (!unit.barcode) continue;
    unitCodes.push({
      code: unit.barcode,
      excludeUnitId: unit.id,
    });
  }

  const draftKeys = new Set<string>();
  for (const entry of unitCodes) {
    const key = entry.code.toLowerCase();
    if (draftKeys.has(key)) throw new BarcodeTakenError();
    draftKeys.add(key);
  }

  for (const entry of unitCodes) {
    const otherProduct = await prisma.product.findFirst({
      where: {
        barcode: { equals: entry.code, mode: "insensitive" },
        ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
      },
      select: { id: true },
    });
    if (otherProduct) throw new BarcodeTakenError();

    const otherUnit = await prisma.productUnit.findFirst({
      where: {
        barcode: { equals: entry.code, mode: "insensitive" },
        ...(entry.excludeUnitId ? { id: { not: entry.excludeUnitId } } : {}),
      },
      select: { id: true },
    });
    if (otherUnit) throw new BarcodeTakenError();
  }

  if (!productBarcode) return;

  const productKey = productBarcode.toLowerCase();
  // Product-level code may equal one of this product's unit codes.
  if (!draftKeys.has(productKey)) {
    const otherUnit = await prisma.productUnit.findFirst({
      where: {
        barcode: { equals: productBarcode, mode: "insensitive" },
        ...(excludeProductId ? { productId: { not: excludeProductId } } : {}),
      },
      select: { id: true },
    });
    if (otherUnit) throw new BarcodeTakenError();
  }

  const otherProduct = await prisma.product.findFirst({
    where: {
      barcode: { equals: productBarcode, mode: "insensitive" },
      ...(excludeProductId ? { id: { not: excludeProductId } } : {}),
    },
    select: { id: true },
  });
  if (otherProduct) throw new BarcodeTakenError();
}

function uniqueError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    const target = String(error.meta?.target ?? "");
    if (target.includes("barcode")) return "barcodeTaken";
    return "skuTaken";
  }
  return null;
}

async function assertCategoryLinks(categoryId: string, subcategoryId: string | null) {
  const category = await prisma.productCategory.findUnique({
    where: { id: categoryId },
  });
  if (!category) return false;
  if (!subcategoryId) return true;
  const sub = await prisma.productSubcategory.findFirst({
    where: { id: subcategoryId, categoryId },
  });
  return Boolean(sub);
}

export async function createProductAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);

  const parsed = productInputSchema.safeParse({
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || "",
    nameEn: formData.get("nameEn") || "",
    nameAr: formData.get("nameAr") || "",
    nameCkb: formData.get("nameCkb") || "",
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId") || "",
    priceCurrency: formData.get("priceCurrency") || "BOTH",
    baseCost: formData.get("baseCost"),
    shelfLifeDays: formData.get("shelfLifeDays") || "",
    units: parseUnitsJson(formData.get("unitsJson")),
  });

  if (!parsed.success) {
    redirect(await productsPath("error=invalid"));
  }

  try {
    const data = toProductData(parsed.data);
    if (!(await assertCategoryLinks(data.categoryId, data.subcategoryId))) {
      redirect(await productsPath("error=invalid"));
    }
    await assertBarcodesAvailable(
      data.barcode,
      data.units.map((unit) => ({ barcode: unit.barcode })),
    );

    const created = await prisma.product.create({
      data: {
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        categoryId: data.categoryId,
        subcategoryId: data.subcategoryId,
        priceCurrency: data.priceCurrency,
        baseCost: data.baseCost,
        shelfLifeDays: data.shelfLifeDays,
        units: {
          create: data.units.map(({ id: _id, ...unit }) => unit),
        },
      },
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/products`);
    revalidatePath(`/${locale}/dashboard/products/${created.id}`);
    revalidatePath(`/${locale}/field/catalog`);
    redirect(await productPath(created.id, "ok=created&focus=photos"));
  } catch (error) {
    if (error instanceof UomError) {
      redirect(await productsPath(`error=${error.code}`));
    }
    if (error instanceof BarcodeTakenError) {
      redirect(await productsPath("error=barcodeTaken"));
    }
    const unique = uniqueError(error);
    if (unique) redirect(await productsPath(`error=${unique}`));
    throw error;
  }
}

export async function updateProductAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);

  const parsed = updateProductSchema.safeParse({
    id: formData.get("id"),
    sku: formData.get("sku"),
    barcode: formData.get("barcode") || "",
    nameEn: formData.get("nameEn") || "",
    nameAr: formData.get("nameAr") || "",
    nameCkb: formData.get("nameCkb") || "",
    categoryId: formData.get("categoryId"),
    subcategoryId: formData.get("subcategoryId") || "",
    priceCurrency: formData.get("priceCurrency") || "BOTH",
    baseCost: formData.get("baseCost"),
    shelfLifeDays: formData.get("shelfLifeDays") || "",
    units: parseUnitsJson(formData.get("unitsJson")),
  });

  if (!parsed.success) {
    redirect(await productsPath("error=invalid"));
  }

  try {
    const data = toProductData(parsed.data);
    if (!(await assertCategoryLinks(data.categoryId, data.subcategoryId))) {
      redirect(await productPath(parsed.data.id, "error=invalid"));
    }

    await assertBarcodesAvailable(
      data.barcode,
      data.units.map((unit, index) => ({
        id: parsed.data.units[index]?.id?.trim() || undefined,
        barcode: unit.barcode,
      })),
      parsed.data.id,
    );

    // Keep existing unit IDs so invoice / stock / transfer FKs stay valid.
    // deleteMany + recreate breaks any product already used in the ledger.
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: parsed.data.id },
        data: {
          sku: data.sku,
          barcode: data.barcode,
          name: data.name,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          priceCurrency: data.priceCurrency,
          baseCost: data.baseCost,
          shelfLifeDays: data.shelfLifeDays,
        },
      });

      const existing = await tx.productUnit.findMany({
        where: { productId: parsed.data.id },
        select: {
          id: true,
          _count: {
            select: {
              invoiceItems: true,
              stockMovements: true,
              transferItems: true,
            },
          },
        },
      });
      const existingById = new Map(existing.map((unit) => [unit.id, unit]));
      const keptIds = new Set<string>();

      for (let index = 0; index < data.units.length; index += 1) {
        const unit = data.units[index];
        const incomingId = parsed.data.units[index]?.id?.trim() || "";
        const unitData = {
          barcode: unit.barcode,
          unitName: unit.unitName,
          conversionRatio: unit.conversionRatio,
          sellingPrice: unit.sellingPrice,
          sellingPriceUsd: unit.sellingPriceUsd,
          isBaseUnit: unit.isBaseUnit,
        };

        if (incomingId && existingById.has(incomingId)) {
          await tx.productUnit.update({
            where: { id: incomingId },
            data: unitData,
          });
          keptIds.add(incomingId);
        } else {
          await tx.productUnit.create({
            data: {
              productId: parsed.data.id,
              ...unitData,
            },
          });
        }
      }

      for (const old of existing) {
        if (keptIds.has(old.id)) continue;
        const referenced =
          old._count.invoiceItems > 0 ||
          old._count.stockMovements > 0 ||
          old._count.transferItems > 0;
        if (referenced) {
          throw new ProductUnitInUseError();
        }
        await tx.productUnit.delete({ where: { id: old.id } });
      }
    });
  } catch (error) {
    if (error instanceof UomError) {
      redirect(await productPath(parsed.data.id, `error=${error.code}`));
    }
    if (error instanceof BarcodeTakenError) {
      redirect(await productPath(parsed.data.id, "error=barcodeTaken"));
    }
    if (
      error instanceof ProductUnitInUseError ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
    ) {
      redirect(await productPath(parsed.data.id, "error=inUse"));
    }
    const unique = uniqueError(error);
    if (unique) redirect(await productPath(parsed.data.id, `error=${unique}`));
    throw error;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/products`);
  revalidatePath(`/${locale}/dashboard/products/${parsed.data.id}`);
  revalidatePath(`/${locale}/field/catalog`);
  redirect(await productPath(parsed.data.id, "ok=updated"));
}

export async function deleteProductAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await productsPath("error=invalid"));

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          inventories: true,
          invoiceItems: true,
          transferItems: true,
          stockMovements: true,
        },
      },
    },
  });

  if (!product) redirect(await productsPath("error=invalid"));
  if (
    product._count.inventories > 0 ||
    product._count.invoiceItems > 0 ||
    product._count.transferItems > 0 ||
    product._count.stockMovements > 0
  ) {
    redirect(await productsPath("error=inUse"));
  }

  await prisma.product.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/products`);
  revalidatePath(`/${locale}/field/catalog`);
  redirect(await productsPath("ok=deleted"));
}
