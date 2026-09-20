"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { createCompletedInvoice } from "@/lib/invoice-apply";
import { InvoiceError } from "@/lib/invoice";
import { StockError } from "@/lib/stock";
import { requireRole, requireWarehouse } from "@/lib/rbac";
import { revalidateDebtsDirectory } from "@/lib/reports/debts-load";
import { createOfficeInvoiceSchema } from "@/lib/validators";

function parseLinesJson(raw: FormDataEntryValue | null) {
  if (typeof raw !== "string" || !raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

async function officeInvoicePath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/invoices/new?${query}`
    : `/${locale}/dashboard/invoices/new`;
}

export async function createOfficeInvoiceAction(formData: FormData): Promise<void> {
  const session = await requireRole(["ADMIN", "WAREHOUSE_ACCOUNTANT"]);
  await requireWarehouse();

  const parsed = createOfficeInvoiceSchema.safeParse({
    storeId: formData.get("storeId"),
    warehouseId: formData.get("warehouseId"),
    invoiceType: formData.get("invoiceType"),
    currency: formData.get("currency"),
    discountPercent: formData.get("discountPercent") || "0",
    lines: parseLinesJson(formData.get("linesJson")),
  });

  if (!parsed.success) {
    redirect(await officeInvoicePath("error=invalid"));
  }

  if (
    session.user.role !== "ADMIN" &&
    parsed.data.warehouseId !== session.user.warehouseId
  ) {
    redirect(await officeInvoicePath("error=warehouse"));
  }

  const lines = parsed.data.lines.filter(
    (line) => line.quantity > 0 || line.giftQuantity > 0,
  );
  if (lines.length === 0) {
    redirect(await officeInvoicePath("error=invalid"));
  }

  const warehouseQuery = `warehouseId=${encodeURIComponent(parsed.data.warehouseId)}`;

  try {
    const invoice = await createCompletedInvoice({
      storeId: parsed.data.storeId,
      warehouseId: parsed.data.warehouseId,
      createdById: session.user.id,
      invoiceType: parsed.data.invoiceType,
      currency: parsed.data.currency,
      discountPercent: parsed.data.discountPercent,
      maxDiscountAllowed: session.user.maxDiscountAllowed,
      lines,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/invoices`);
    revalidatePath(`/${locale}/dashboard/stock`);
    revalidatePath(`/${locale}/dashboard/stores`);
    revalidatePath(`/${locale}/dashboard/debts`);
    revalidateDebtsDirectory();
    revalidatePath(`/${locale}/field/invoice`);
    revalidatePath(`/${locale}/field/stock`);
    redirect(`/${locale}/dashboard/invoices/${invoice.id}`);
  } catch (error) {
    if (error instanceof InvoiceError || error instanceof StockError) {
      redirect(
        await officeInvoicePath(`${warehouseQuery}&error=${error.code}`),
      );
    }
    throw error;
  }
}
