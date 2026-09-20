"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { StockError, type TransferDecision } from "@/lib/stock";
import { createStockTransfer, decideStockTransfer } from "@/lib/transfer-apply";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { createTransferSchema, decideTransferSchema } from "@/lib/validators";

const CREATORS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;
const DECIDERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT", "FIELD_DELEGATE"] as const;

function parseLinesJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function officePath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/transfers?${query}`
    : `/${locale}/dashboard/transfers`;
}

async function fieldPath(query?: string) {
  const locale = await getLocale();
  return query ? `/${locale}/field/stock?${query}` : `/${locale}/field/stock`;
}

async function afterDecide(fromField: boolean, query: string) {
  redirect(fromField ? await fieldPath(query) : await officePath(query));
}

export type CreateTransferActionResult =
  | {
      ok: true;
      transferId: string;
      sourceId: string;
    }
  | {
      ok: false;
      error: string;
      sourceId?: string;
    };

/** Non-redirecting action so the form can upload Camera 4 proof photos, then navigate. */
export async function createTransferResult(
  formData: FormData,
): Promise<CreateTransferActionResult> {
  const session = await requireRole([...CREATORS]);
  await requireWarehouse();

  const parsed = createTransferSchema.safeParse({
    sourceId: formData.get("sourceId"),
    destinationId: formData.get("destinationId"),
    notes: formData.get("notes") || "",
    lines: parseLinesJson(formData.get("linesJson")),
  });

  if (!parsed.success) {
    return { ok: false, error: "invalid" };
  }

  if (
    session.user.role !== "ADMIN" &&
    parsed.data.sourceId !== session.user.warehouseId
  ) {
    return { ok: false, error: "warehouse", sourceId: parsed.data.sourceId };
  }

  try {
    const transfer = await createStockTransfer({
      sourceId: parsed.data.sourceId,
      destinationId: parsed.data.destinationId,
      createdById: session.user.id,
      notes: parsed.data.notes,
      lines: parsed.data.lines,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/transfers`);
    revalidatePath(`/${locale}/dashboard/stock`);
    revalidatePath(`/${locale}/field/stock`);

    return {
      ok: true,
      transferId: transfer.id,
      sourceId: parsed.data.sourceId,
    };
  } catch (error) {
    if (error instanceof StockError) {
      return {
        ok: false,
        error: error.code,
        sourceId: parsed.data.sourceId,
      };
    }
    throw error;
  }
}

export async function createTransferAction(formData: FormData): Promise<void> {
  const result = await createTransferResult(formData);
  const query = new URLSearchParams();

  if (!result.ok) {
    if (result.sourceId) query.set("sourceId", result.sourceId);
    query.set("error", result.error);
    redirect(await officePath(query.toString()));
  }

  query.set("sourceId", result.sourceId);
  query.set("ok", "created");
  query.set("transferId", result.transferId);
  query.set("focus", "photos");
  redirect(await officePath(query.toString()));
}

export async function decideTransferAction(formData: FormData): Promise<void> {
  const session = await requireRole([...DECIDERS]);
  await requireWarehouse();
  const fromField = String(formData.get("from") ?? "") === "field";

  const parsed = decideTransferSchema.safeParse({
    id: formData.get("id"),
    decision: formData.get("decision"),
  });

  if (!parsed.success) {
    await afterDecide(fromField, "error=invalid");
    return;
  }

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: parsed.data.id },
  });
  if (!transfer) {
    await afterDecide(fromField, "error=invalid_transfer");
    return;
  }

  if (
    session.user.role !== "ADMIN" &&
    transfer.destinationId !== session.user.warehouseId
  ) {
    await afterDecide(fromField, "error=warehouse");
    return;
  }

  try {
    await decideStockTransfer({
      transferId: parsed.data.id,
      decidedById: session.user.id,
      decision: parsed.data.decision as TransferDecision,
    });
  } catch (error) {
    if (error instanceof StockError) {
      await afterDecide(fromField, `error=${error.code}`);
      return;
    }
    throw error;
  }

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/transfers`);
  revalidatePath(`/${locale}/dashboard/stock`);
  revalidatePath(`/${locale}/field/stock`);
  await afterDecide(
    fromField,
    parsed.data.decision === "ACCEPTED" ? "ok=accepted" : "ok=rejected",
  );
}
