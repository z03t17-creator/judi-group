"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { CollectionError, type CollectionActionResult } from "@/lib/collection";
import { recordCollection } from "@/lib/collection-apply";
import { isCurrency } from "@/lib/money";
import { requireRole } from "@/lib/rbac";
import { revalidateDebtsDirectory } from "@/lib/reports/debts-load";
import { createCollectionSchema } from "@/lib/validators";
import type { Role } from "@prisma/client";

const FIELD_ROLES: Role[] = ["FIELD_DELEGATE"];
const OFFICE_COLLECTION_ROLES: Role[] = ["ADMIN", "COLLECTOR_ACCOUNTANT"];

async function collectionPath(
  surface: "field" | "office",
  query?: string,
) {
  const locale = await getLocale();
  const base = surface === "field" ? "field/collection" : "dashboard/collections";
  return query ? `/${locale}/${base}?${query}` : `/${locale}/${base}`;
}

async function postCollectionResult(
  formData: FormData,
  roles: Role[],
): Promise<CollectionActionResult> {
  const session = await requireRole(roles);

  const parsed = createCollectionSchema.safeParse({
    storeId: formData.get("storeId"),
    currency: formData.get("currency"),
    amount: formData.get("amount"),
    paymentMethod: formData.get("paymentMethod"),
    notes: formData.get("notes") || "",
  });

  if (!parsed.success || !isCurrency(parsed.data.currency)) {
    return { ok: false, error: "invalid" };
  }

  try {
    const transaction = await recordCollection({
      storeId: parsed.data.storeId,
      recordedById: session.user.id,
      amount: parsed.data.amount,
      currency: parsed.data.currency,
      paymentMethod: parsed.data.paymentMethod,
      notes: parsed.data.notes,
    });

    const locale = await getLocale();
    revalidatePath(`/${locale}/field/collection`);
    revalidatePath(`/${locale}/field/customers`);
    revalidatePath(`/${locale}/dashboard/collections`);
    revalidatePath(`/${locale}/dashboard/collections/${transaction.id}`);
    revalidatePath(`/${locale}/dashboard/stores`);
    revalidatePath(`/${locale}/dashboard/debts`);
    revalidateDebtsDirectory();

    return { ok: true, transactionId: transaction.id };
  } catch (error) {
    if (error instanceof CollectionError) {
      return { ok: false, error: error.code };
    }
    throw error;
  }
}

async function postCollection(
  formData: FormData,
  roles: Role[],
  surface: "field" | "office",
): Promise<void> {
  const result = await postCollectionResult(formData, roles);
  if (!result.ok) {
    redirect(await collectionPath(surface, `error=${result.error}`));
  }
  if (surface === "office") {
    const locale = await getLocale();
    redirect(`/${locale}/dashboard/collections/${result.transactionId}?recorded=1`);
  }
  redirect(await collectionPath(surface, `ok=${result.transactionId}`));
}

/** Non-redirecting action so the form can upload receipt proof photos, then navigate. */
export async function createOfficeCollectionResult(
  formData: FormData,
): Promise<CollectionActionResult> {
  return postCollectionResult(formData, OFFICE_COLLECTION_ROLES);
}

export async function createFieldCollectionResult(
  formData: FormData,
): Promise<CollectionActionResult> {
  return postCollectionResult(formData, FIELD_ROLES);
}

export async function createFieldCollectionAction(formData: FormData): Promise<void> {
  await postCollection(formData, FIELD_ROLES, "field");
}

export async function createOfficeCollectionAction(formData: FormData): Promise<void> {
  await postCollection(formData, OFFICE_COLLECTION_ROLES, "office");
}
