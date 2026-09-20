"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createCompletedReturn } from "@/lib/invoice-apply";
import { InvoiceError } from "@/lib/invoice";
import { StockError } from "@/lib/stock";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { revalidateDebtsDirectory } from "@/lib/reports/debts-load";
import { createReturnSchema } from "@/lib/validators";

function parseLinesJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function returnPath(query?: string) {
  const locale = await getLocale();
  return query ? `/${locale}/field/return?${query}` : `/${locale}/field/return`;
}

export async function createFieldReturnAction(formData: FormData): Promise<void> {
  const session = await requireRole(["FIELD_DELEGATE"]);
  await requireWarehouse();
  const warehouseId = session.user.warehouseId;
  if (!warehouseId) {
    redirect(await returnPath("error=warehouse"));
  }

  const parsed = createReturnSchema.safeParse({
    storeId: formData.get("storeId"),
    currency: formData.get("currency"),
    discountPercent: formData.get("discountPercent") || "0",
    lines: parseLinesJson(formData.get("linesJson")),
  });

  if (!parsed.success) {
    redirect(await returnPath("error=invalid"));
  }

  const lines = parsed.data.lines.filter((line) => line.quantity > 0);
  if (lines.length === 0) {
    redirect(await returnPath("error=invalid"));
  }

  try {
    const invoice = await createCompletedReturn({
      storeId: parsed.data.storeId,
      warehouseId,
      createdById: session.user.id,
      currency: parsed.data.currency,
      discountPercent: parsed.data.discountPercent,
      maxDiscountAllowed: session.user.maxDiscountAllowed,
      lines,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/field/return`);
    revalidatePath(`/${locale}/field/stock`);
    revalidatePath(`/${locale}/field/customers`);
    revalidatePath(`/${locale}/dashboard/invoices`);
    revalidatePath(`/${locale}/dashboard/stores`);
    revalidatePath(`/${locale}/dashboard/debts`);
    revalidateDebtsDirectory();
    redirect(`/${locale}/field/invoice/${invoice.id}`);
  } catch (error) {
    if (error instanceof InvoiceError || error instanceof StockError) {
      redirect(await returnPath(`error=${error.code}`));
    }
    throw error;
  }
}
