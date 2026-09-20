"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { StockError } from "@/lib/stock";
import { applyStockMovement } from "@/lib/stock-apply";
import { parsePurchaseExpiryDate } from "@/lib/purchase";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { stockMovementSchema } from "@/lib/validators";

const MUTATORS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function stockPath(query?: string) {
  const locale = await getLocale();
  return query ? `/${locale}/dashboard/stock?${query}` : `/${locale}/dashboard/stock`;
}

function withWarehouse(query: URLSearchParams, warehouseId: string) {
  query.set("warehouseId", warehouseId);
  return query.toString();
}

export type StockMovementActionResult =
  | {
      ok: true;
      movementId: string;
      type: "RECEIVE" | "WRITE_OFF";
      warehouseId: string;
    }
  | {
      ok: false;
      error: string;
      warehouseId?: string;
    };

/** Non-redirecting action so the form can upload Camera 4 proof photos, then navigate. */
export async function applyStockMovementResult(
  formData: FormData,
): Promise<StockMovementActionResult> {
  const session = await requireRole([...MUTATORS]);
  await requireWarehouse();

  const parsed = stockMovementSchema.safeParse({
    warehouseId: formData.get("warehouseId"),
    productId: formData.get("productId"),
    productUnitId: formData.get("productUnitId"),
    type: formData.get("type"),
    quantity: formData.get("quantity"),
    notes: formData.get("notes") || "",
    lotCode: formData.get("lotCode") || "",
    expiryDate: formData.get("expiryDate") || "",
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  if (
    session.user.role !== "ADMIN" &&
    parsed.data.warehouseId !== session.user.warehouseId
  ) {
    return { ok: false, error: "warehouse", warehouseId: parsed.data.warehouseId };
  }

  const expiryDate =
    parsed.data.type === "RECEIVE" && parsed.data.expiryDate
      ? parsePurchaseExpiryDate(parsed.data.expiryDate)
      : null;
  if (parsed.data.type === "RECEIVE" && parsed.data.expiryDate && !expiryDate) {
    return { ok: false, error: "invalid_expiry", warehouseId: parsed.data.warehouseId };
  }

  const lotCode =
    parsed.data.type === "RECEIVE" && parsed.data.lotCode?.trim()
      ? parsed.data.lotCode.trim()
      : null;
  const trackLot =
    parsed.data.type === "RECEIVE" && (expiryDate != null || Boolean(lotCode));

  try {
    const { movement } = await applyStockMovement({
      warehouseId: parsed.data.warehouseId,
      productId: parsed.data.productId,
      productUnitId: parsed.data.productUnitId,
      recordedById: session.user.id,
      type: parsed.data.type,
      quantity: parsed.data.quantity,
      notes: parsed.data.notes,
      lot: trackLot ? { expiryDate, lotCode } : null,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/stock`);

    return {
      ok: true,
      movementId: movement.id,
      type: parsed.data.type === "RECEIVE" ? "RECEIVE" : "WRITE_OFF",
      warehouseId: parsed.data.warehouseId,
    };
  } catch (error) {
    if (error instanceof StockError) {
      return {
        ok: false,
        error: error.code,
        warehouseId: parsed.data.warehouseId,
      };
    }
    throw error;
  }
}

export async function applyStockMovementAction(formData: FormData): Promise<void> {
  const result = await applyStockMovementResult(formData);
  const query = new URLSearchParams();

  if (!result.ok) {
    if (result.warehouseId) withWarehouse(query, result.warehouseId);
    query.set("error", result.error);
    redirect(await stockPath(query.toString()));
  }

  withWarehouse(query, result.warehouseId);
  query.set("ok", result.type === "RECEIVE" ? "received" : "writtenOff");
  query.set("movementId", result.movementId);
  query.set("focus", "photos");
  redirect(await stockPath(query.toString()));
}
