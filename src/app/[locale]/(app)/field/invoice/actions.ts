"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createCompletedInvoice } from "@/lib/invoice-apply";
import { InvoiceError } from "@/lib/invoice";
import { StockError } from "@/lib/stock";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { revalidateDebtsDirectory } from "@/lib/reports/debts-load";
import { createInvoiceSchema } from "@/lib/validators";

function parseLinesJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function invoicePath(query?: string) {
  const locale = await getLocale();
  return query ? `/${locale}/field/invoice?${query}` : `/${locale}/field/invoice`;
}

export async function createFieldInvoiceAction(formData: FormData): Promise<void> {
  const session = await requireRole(["FIELD_DELEGATE"]);
  await requireWarehouse();
  const warehouseId = session.user.warehouseId;
  if (!warehouseId) {
    redirect(await invoicePath("error=warehouse"));
  }

  const parsed = createInvoiceSchema.safeParse({
    storeId: formData.get("storeId"),
    invoiceType: formData.get("invoiceType"),
    currency: formData.get("currency"),
    discountPercent: formData.get("discountPercent") || "0",
    lines: parseLinesJson(formData.get("linesJson")),
  });

  if (!parsed.success) {
    redirect(await invoicePath("error=invalid"));
  }

  const lines = parsed.data.lines.filter(
    (line) => line.quantity > 0 || line.giftQuantity > 0,
  );
  if (lines.length === 0) {
    redirect(await invoicePath("error=invalid"));
  }

  try {
    const invoice = await createCompletedInvoice({
      storeId: parsed.data.storeId,
      warehouseId,
      createdById: session.user.id,
      invoiceType: parsed.data.invoiceType,
      currency: parsed.data.currency,
      discountPercent: parsed.data.discountPercent,
      maxDiscountAllowed: session.user.maxDiscountAllowed,
      lines,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/field/invoice`);
    revalidatePath(`/${locale}/field/stock`);
    revalidatePath(`/${locale}/field/customers`);
    revalidatePath(`/${locale}/dashboard/invoices`);
    revalidatePath(`/${locale}/dashboard/stores`);
    revalidatePath(`/${locale}/dashboard/debts`);
    revalidateDebtsDirectory();
    redirect(`/${locale}/field/invoice/${invoice.id}`);
  } catch (error) {
    if (error instanceof InvoiceError || error instanceof StockError) {
      redirect(await invoicePath(`error=${error.code}`));
    }
    throw error;
  }
}
