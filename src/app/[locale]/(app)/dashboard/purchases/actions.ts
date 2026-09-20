"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  cancelPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
} from "@/lib/purchase-apply";
import { parsePurchaseExpiryDate, PurchaseError } from "@/lib/purchase";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import {
  cancelPurchaseSchema,
  createPurchaseSchema,
  receivePurchaseSchema,
} from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

function parseLinesJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function purchasesPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/purchases?${query}`
    : `/${locale}/dashboard/purchases`;
}

export type CreatePurchaseActionResult =
  | {
      ok: true;
      purchaseOrderId: string;
      receiptId: string | null;
      warehouseId: string;
      received: boolean;
    }
  | {
      ok: false;
      error: string;
      warehouseId?: string;
    };

export async function createPurchaseResult(
  formData: FormData,
): Promise<CreatePurchaseActionResult> {
  const session = await requireRole([...MANAGERS]);
  await requireWarehouse();

  const parsed = createPurchaseSchema.safeParse({
    supplierId: formData.get("supplierId"),
    warehouseId: formData.get("warehouseId"),
    currency: formData.get("currency") || "IQD",
    notes: formData.get("notes") || "",
    freightAmount: formData.get("freightAmount") || undefined,
    freightCurrency: formData.get("freightCurrency") || "",
    receiveNow: formData.get("receiveNow"),
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
      warehouseId: parsed.data.warehouseId,
    };
  }

  const lines = [];
  for (const line of parsed.data.lines) {
    const expiryDate =
      line.expiryDate && line.expiryDate.length > 0
        ? parsePurchaseExpiryDate(line.expiryDate)
        : null;
    if (line.expiryDate && line.expiryDate.length > 0 && !expiryDate) {
      return { ok: false, error: "invalid_expiry", warehouseId: parsed.data.warehouseId };
    }
    lines.push({
      productId: line.productId,
      productUnitId: line.productUnitId,
      quantity: line.quantity,
      unitCost: line.unitCost,
      currency: line.currency,
      expiryDate,
      lotCode: line.lotCode || null,
    });
  }

  try {
    const result = await createPurchaseOrder({
      supplierId: parsed.data.supplierId,
      warehouseId: parsed.data.warehouseId,
      createdById: session.user.id,
      currency: parsed.data.currency,
      notes: parsed.data.notes,
      lines,
      receiveNow: parsed.data.receiveNow,
      freightAmount: parsed.data.freightAmount,
      freightCurrency:
        parsed.data.freightCurrency && parsed.data.freightCurrency.length > 0
          ? parsed.data.freightCurrency
          : parsed.data.currency,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/purchases`);
    revalidatePath(`/${locale}/dashboard/stock`);
    revalidatePath(`/${locale}/dashboard/products`);
    revalidatePath(`/${locale}/dashboard/suppliers`);
    revalidatePath(`/${locale}/dashboard/expenses`);
    revalidatePath(`/${locale}/dashboard/expiry`);

    return {
      ok: true,
      purchaseOrderId: result.order.id,
      receiptId: result.receipt?.id ?? null,
      warehouseId: parsed.data.warehouseId,
      received: Boolean(result.receipt),
    };
  } catch (error) {
    if (error instanceof PurchaseError) {
      return {
        ok: false,
        error: error.code,
        warehouseId: parsed.data.warehouseId,
      };
    }
    throw error;
  }
}

export async function createPurchaseAction(formData: FormData): Promise<void> {
  const result = await createPurchaseResult(formData);
  const query = new URLSearchParams();
  if (!result.ok) {
    if (result.warehouseId) query.set("warehouseId", result.warehouseId);
    query.set("error", result.error);
    redirect(await purchasesPath(query.toString()));
  }
  if (result.warehouseId) query.set("warehouseId", result.warehouseId);
  query.set("ok", result.received ? "received" : "created");
  query.set("purchaseId", result.purchaseOrderId);
  if (result.receiptId) {
    query.set("receiptId", result.receiptId);
    query.set("focus", "photos");
  }
  redirect(await purchasesPath(query.toString()));
}

export type ReceivePurchaseActionResult =
  | { ok: true; purchaseOrderId: string; receiptId: string; warehouseId: string }
  | { ok: false; error: string };

export async function receivePurchaseResult(
  formData: FormData,
): Promise<ReceivePurchaseActionResult> {
  const session = await requireRole([...MANAGERS]);
  await requireWarehouse();

  const parsed = receivePurchaseSchema.safeParse({
    id: formData.get("id"),
    notes: formData.get("notes") || "",
    freightAmount: formData.get("freightAmount") || undefined,
    freightCurrency: formData.get("freightCurrency") || "",
  });
  if (!parsed.success) return { ok: false, error: "invalid" };

  const existing = await prisma.purchaseOrder.findUnique({
    where: { id: parsed.data.id },
    select: { warehouseId: true, currency: true },
  });
  if (!existing) return { ok: false, error: "not_found" };
  if (
    session.user.role !== "ADMIN" &&
    existing.warehouseId !== session.user.warehouseId
  ) {
    return { ok: false, error: "warehouse" };
  }

  try {
    const result = await receivePurchaseOrder({
      purchaseOrderId: parsed.data.id,
      receivedById: session.user.id,
      notes: parsed.data.notes,
      freightAmount: parsed.data.freightAmount,
      freightCurrency:
        parsed.data.freightCurrency && parsed.data.freightCurrency.length > 0
          ? parsed.data.freightCurrency
          : existing.currency,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/purchases`);
    revalidatePath(`/${locale}/dashboard/stock`);
    revalidatePath(`/${locale}/dashboard/products`);
    revalidatePath(`/${locale}/dashboard/expenses`);
    revalidatePath(`/${locale}/dashboard/expiry`);

    return {
      ok: true,
      purchaseOrderId: result.order.id,
      receiptId: result.receipt.id,
      warehouseId: result.order.warehouseId,
    };
  } catch (error) {
    if (error instanceof PurchaseError) {
      return { ok: false, error: error.code };
    }
    throw error;
  }
}

export async function receivePurchaseAction(formData: FormData): Promise<void> {
  const result = await receivePurchaseResult(formData);
  const query = new URLSearchParams();
  if (!result.ok) {
    query.set("error", result.error);
    redirect(await purchasesPath(query.toString()));
  }
  query.set("warehouseId", result.warehouseId);
  query.set("ok", "received");
  query.set("purchaseId", result.purchaseOrderId);
  query.set("receiptId", result.receiptId);
  query.set("focus", "photos");
  redirect(await purchasesPath(query.toString()));
}

export async function cancelPurchaseAction(formData: FormData): Promise<void> {
  const session = await requireRole([...MANAGERS]);
  await requireWarehouse();

  const parsed = cancelPurchaseSchema.safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) redirect(await purchasesPath("error=invalid"));

  try {
    await cancelPurchaseOrder({
      purchaseOrderId: parsed.data.id,
      userId: session.user.id,
    });
  } catch (error) {
    if (error instanceof PurchaseError) {
      redirect(await purchasesPath(`error=${error.code}`));
    }
    throw error;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/purchases`);
  redirect(await purchasesPath("ok=cancelled"));
}
