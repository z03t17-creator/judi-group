"use server";

import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { DiscountRuleKind, DiscountScope, DiscountValueType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { parseBaghdadDateTimeLocal } from "@/lib/reports/date";
import { discountRuleInputSchema, updateDiscountRuleSchema } from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function discountsPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/discounts?${query}`
    : `/${locale}/dashboard/discounts`;
}

function normalizeRuleFields(data: {
  kind: DiscountRuleKind;
  scope: DiscountScope;
  valueType: DiscountValueType;
  currency?: string | "";
  startsAt?: string | "";
  endsAt?: string | "";
}) {
  let scope = data.scope;
  let valueType = data.valueType;
  let currency: string | null =
    data.currency && data.currency.length > 0 ? data.currency : null;

  if (data.kind === "GIFT" || data.kind === "TIER_PRICE") {
    scope = "LINE";
    valueType = data.kind === "TIER_PRICE" ? "PERCENT" : "PERCENT";
    currency = null;
  } else if (data.kind === "MONEY") {
    valueType = "MONEY";
  } else if (data.kind === "PERCENT") {
    valueType = "PERCENT";
    currency = null;
  }

  const startsAt =
    data.startsAt && data.startsAt.length > 0
      ? parseBaghdadDateTimeLocal(data.startsAt)
      : null;
  const endsAt =
    data.endsAt && data.endsAt.length > 0
      ? parseBaghdadDateTimeLocal(data.endsAt)
      : null;

  if (data.startsAt && data.startsAt.length > 0 && !startsAt) {
    return { error: "invalid" as const };
  }
  if (data.endsAt && data.endsAt.length > 0 && !endsAt) {
    return { error: "invalid" as const };
  }
  if (startsAt && endsAt && endsAt < startsAt) {
    return { error: "window" as const };
  }

  return { scope, valueType, currency, startsAt, endsAt };
}

function formList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .map((value) => String(value).trim())
    .filter(Boolean);
}

export async function createDiscountRuleAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = discountRuleInputSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    scope: formData.get("scope") || "INVOICE",
    valueType: formData.get("valueType") || "PERCENT",
    amount: formData.get("amount"),
    currency: formData.get("currency") || "",
    storeTiers: formList(formData, "storeTiers"),
    productIds: formList(formData, "productIds"),
    categoryIds: formList(formData, "categoryIds"),
    startsAt: formData.get("startsAt") || "",
    endsAt: formData.get("endsAt") || "",
    priority: formData.get("priority") || "100",
    active: formData.get("active") ?? "true",
    stackWithGift: formData.get("stackWithGift"),
  });
  if (!parsed.success) redirect(await discountsPath("error=invalid"));

  const normalized = normalizeRuleFields(parsed.data);
  if ("error" in normalized) redirect(await discountsPath(`error=${normalized.error}`));

  await prisma.discountRule.create({
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      scope: normalized.scope,
      valueType: normalized.valueType,
      amount: parsed.data.amount,
      currency: normalized.currency,
      storeTiers: parsed.data.storeTiers,
      productIds: parsed.data.productIds,
      categoryIds: parsed.data.categoryIds,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      priority: parsed.data.priority,
      active: parsed.data.active,
      stackWithGift: parsed.data.stackWithGift,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/discounts`);
  revalidatePath(`/${locale}/field/invoice`);
  redirect(await discountsPath("ok=created"));
}

export async function updateDiscountRuleAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const parsed = updateDiscountRuleSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    kind: formData.get("kind"),
    scope: formData.get("scope") || "INVOICE",
    valueType: formData.get("valueType") || "PERCENT",
    amount: formData.get("amount"),
    currency: formData.get("currency") || "",
    storeTiers: formList(formData, "storeTiers"),
    productIds: formList(formData, "productIds"),
    categoryIds: formList(formData, "categoryIds"),
    startsAt: formData.get("startsAt") || "",
    endsAt: formData.get("endsAt") || "",
    priority: formData.get("priority") || "100",
    active: formData.get("active") ?? "true",
    stackWithGift: formData.get("stackWithGift"),
  });
  if (!parsed.success) redirect(await discountsPath("error=invalid"));

  const normalized = normalizeRuleFields(parsed.data);
  if ("error" in normalized) redirect(await discountsPath(`error=${normalized.error}`));

  await prisma.discountRule.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      kind: parsed.data.kind,
      scope: normalized.scope,
      valueType: normalized.valueType,
      amount: parsed.data.amount,
      currency: normalized.currency,
      storeTiers: parsed.data.storeTiers,
      productIds: parsed.data.productIds,
      categoryIds: parsed.data.categoryIds,
      startsAt: normalized.startsAt,
      endsAt: normalized.endsAt,
      priority: parsed.data.priority,
      active: parsed.data.active,
      stackWithGift: parsed.data.stackWithGift,
    },
  });

  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/discounts`);
  revalidatePath(`/${locale}/field/invoice`);
  redirect(await discountsPath("ok=updated"));
}

export async function deleteDiscountRuleAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await discountsPath("error=invalid"));

  await prisma.discountRule.delete({ where: { id } });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/discounts`);
  revalidatePath(`/${locale}/field/invoice`);
  redirect(await discountsPath("ok=deleted"));
}

export async function toggleDiscountRuleAction(formData: FormData): Promise<void> {
  await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("active") ?? "") === "true";
  if (!id) redirect(await discountsPath("error=invalid"));

  await prisma.discountRule.update({
    where: { id },
    data: { active: next },
  });
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/discounts`);
  revalidatePath(`/${locale}/field/invoice`);
  redirect(await discountsPath(next ? "ok=activated" : "ok=paused"));
}
