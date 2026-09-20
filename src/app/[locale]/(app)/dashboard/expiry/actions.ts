"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { ExpiryError, writeOffStockLot } from "@/lib/expiry-write-off";
import { requireRole, requireWarehouse } from "@/lib/rbac";

const MUTATORS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function expiryPath(query?: string) {
  const locale = await getLocale();
  return query ? `/${locale}/dashboard/expiry?${query}` : `/${locale}/dashboard/expiry`;
}

export async function writeOffLotAction(formData: FormData): Promise<void> {
  const session = await requireRole([...MUTATORS]);
  await requireWarehouse();

  const stockLotId = String(formData.get("stockLotId") || "");
  const note = String(formData.get("note") || "");

  if (!stockLotId) {
    redirect(await expiryPath("error=invalid"));
  }

  try {
    const result = await writeOffStockLot({
      stockLotId,
      recordedById: session.user.id,
      note: note || null,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/dashboard/expiry`);
    revalidatePath(`/${locale}/dashboard/stock`);
    revalidatePath(`/${locale}/dashboard/alerts`);
    revalidatePath(`/${locale}/dashboard/expenses`);

    const query = new URLSearchParams({
      ok: "writtenOff",
      lotId: result.lotId,
      expenseId: result.expenseId,
    });
    redirect(await expiryPath(query.toString()));
  } catch (error) {
    if (error instanceof ExpiryError) {
      redirect(await expiryPath(`error=${error.code}`));
    }
    throw error;
  }
}
