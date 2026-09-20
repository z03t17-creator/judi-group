"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireRole } from "@/lib/rbac";
import { saveStockAudit } from "@/lib/stock-audit-apply";

const saveSchema = z.object({
  warehouseId: z.string().uuid(),
  auditDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional().or(z.literal("")),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        countedBaseQty: z.coerce.number().min(0),
      }),
    )
    .min(0),
});

export async function saveVanAuditAction(formData: FormData): Promise<void> {
  const session = await requireRole(["ADMIN", "WAREHOUSE_ACCOUNTANT"]);
  const locale = await getLocale();

  let items: unknown = [];
  try {
    items = JSON.parse(String(formData.get("itemsJson") || "[]"));
  } catch {
    items = [];
  }

  const parsed = saveSchema.safeParse({
    warehouseId: formData.get("warehouseId"),
    auditDate: formData.get("auditDate"),
    notes: formData.get("notes") || "",
    items,
  });

  if (!parsed.success) {
    redirect(
      `/${locale}/dashboard/reports/van/${formData.get("warehouseId")}?date=${formData.get("auditDate")}&error=invalid`,
    );
  }

  await saveStockAudit({
    warehouseId: parsed.data.warehouseId,
    auditDate: parsed.data.auditDate,
    recordedById: session.user.id,
    notes: parsed.data.notes,
    items: parsed.data.items.map((item) => ({
      productId: item.productId,
      countedBaseQty: item.countedBaseQty,
    })),
  });

  revalidatePath(`/${locale}/dashboard/reports/van/${parsed.data.warehouseId}`);
  revalidatePath(`/${locale}/field/stock`);
  redirect(
    `/${locale}/dashboard/reports/van/${parsed.data.warehouseId}?date=${parsed.data.auditDate}&ok=1`,
  );
}
