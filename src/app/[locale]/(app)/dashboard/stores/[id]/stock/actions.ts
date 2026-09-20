"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { applyStorePlacement } from "@/lib/store-stock-apply";
import { StoreStockError } from "@/lib/store-stock";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { createStorePlacementSchema } from "@/lib/validators";

const OFFICE_MUTATORS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;
const FIELD_MUTATORS = ["FIELD_DELEGATE"] as const;

function parseLinesJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function officeStockPath(storeId: string, query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/stores/${storeId}/stock?${query}`
    : `/${locale}/dashboard/stores/${storeId}/stock`;
}

async function fieldStockPath(storeId: string, query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/field/customers/${storeId}/stock?${query}`
    : `/${locale}/field/customers/${storeId}/stock`;
}

export type CreateStorePlacementActionResult =
  | {
      ok: true;
      placementId: string;
      storeId: string;
      warehouseId: string;
      direction: "TO_STORE" | "FROM_STORE";
    }
  | {
      ok: false;
      error: string;
      storeId?: string;
      warehouseId?: string;
    };

export async function createStorePlacementResult(
  formData: FormData,
): Promise<CreateStorePlacementActionResult> {
  const fromField = String(formData.get("from") ?? "") === "field";
  const session = await requireRole(
    fromField ? [...FIELD_MUTATORS] : [...OFFICE_MUTATORS],
  );
  await requireWarehouse();

  const parsed = createStorePlacementSchema.safeParse({
    storeId: formData.get("storeId"),
    warehouseId: formData.get("warehouseId"),
    direction: formData.get("direction"),
    notes: formData.get("notes") || "",
    lines: parseLinesJson(formData.get("linesJson")),
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  if (
    session.user.role !== "ADMIN" &&
    parsed.data.warehouseId !== session.user.warehouseId
  ) {
    return {
      ok: false,
      error: "warehouse",
      storeId: parsed.data.storeId,
      warehouseId: parsed.data.warehouseId,
    };
  }

  try {
    const placement = await applyStorePlacement({
      storeId: parsed.data.storeId,
      warehouseId: parsed.data.warehouseId,
      createdById: session.user.id,
      direction: parsed.data.direction,
      notes: parsed.data.notes,
      lines: parsed.data.lines,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/stores/${parsed.data.storeId}/stock`);
    revalidatePath(`/${locale}/dashboard/stores`);
    revalidatePath(`/${locale}/dashboard/stock`);
    revalidatePath(`/${locale}/field/customers`);
    revalidatePath(`/${locale}/field/customers/${parsed.data.storeId}/stock`);
    revalidatePath(`/${locale}/field/stock`);

    return {
      ok: true,
      placementId: placement.id,
      storeId: parsed.data.storeId,
      warehouseId: parsed.data.warehouseId,
      direction: parsed.data.direction,
    };
  } catch (error) {
    if (error instanceof StoreStockError) {
      return {
        ok: false,
        error: error.code,
        storeId: parsed.data.storeId,
        warehouseId: parsed.data.warehouseId,
      };
    }
    throw error;
  }
}

export async function createStorePlacementAction(formData: FormData): Promise<void> {
  const fromField = String(formData.get("from") ?? "") === "field";
  const result = await createStorePlacementResult(formData);
  const query = new URLSearchParams();

  const storeId =
    result.ok ? result.storeId : (result.storeId ?? String(formData.get("storeId") ?? ""));

  if (!storeId) {
    redirect(fromField ? `/${await getLocale()}/field/customers` : `/${await getLocale()}/dashboard/stores`);
  }

  if (!result.ok) {
    if (result.warehouseId) query.set("warehouseId", result.warehouseId);
    query.set("error", result.error);
    redirect(
      fromField
        ? await fieldStockPath(storeId, query.toString())
        : await officeStockPath(storeId, query.toString()),
    );
  }

  query.set("warehouseId", result.warehouseId);
  query.set(
    "ok",
    result.direction === "TO_STORE" ? "placed" : "returned",
  );
  query.set("placementId", result.placementId);
  query.set("focus", "photos");
  redirect(
    fromField
      ? await fieldStockPath(storeId, query.toString())
      : await officeStockPath(storeId, query.toString()),
  );
}
