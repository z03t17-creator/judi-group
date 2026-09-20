"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { parseExpenseDate } from "@/lib/expense";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { expenseInputSchema, updateExpenseSchema } from "@/lib/validators";

const MANAGERS = ["ADMIN", "WAREHOUSE_ACCOUNTANT"] as const;

async function expensesPath(query?: string) {
  const locale = await getLocale();
  return query
    ? `/${locale}/dashboard/expenses?${query}`
    : `/${locale}/dashboard/expenses`;
}

function optionalId(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

async function revalidateExpensePaths() {
  const locale = await getLocale();
  revalidatePath(`/${locale}/dashboard/expenses`);
  revalidatePath(`/${locale}/dashboard/reports`);
  revalidatePath(`/${locale}/dashboard/expiry`);
}

export async function createExpenseAction(formData: FormData): Promise<void> {
  const session = await requireRole([...MANAGERS]);
  const parsed = expenseInputSchema.safeParse({
    date: formData.get("date"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "IQD",
    note: formData.get("note") || "",
    productId: formData.get("productId") || "",
    warehouseId: formData.get("warehouseId") || "",
    storeId: formData.get("storeId") || "",
    stockLotId: formData.get("stockLotId") || "",
  });
  if (!parsed.success) redirect(await expensesPath("error=invalid"));

  const date = parseExpenseDate(parsed.data.date);
  if (!date) redirect(await expensesPath("error=invalid"));

  const expense = await prisma.expense.create({
    data: {
      date,
      category: parsed.data.category,
      amount: new Prisma.Decimal(String(parsed.data.amount)),
      currency: parsed.data.currency,
      note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
      productId: optionalId(parsed.data.productId),
      warehouseId: optionalId(parsed.data.warehouseId),
      storeId: optionalId(parsed.data.storeId),
      stockLotId: optionalId(parsed.data.stockLotId),
      createdById: session.user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EXPENSE_CREATE",
      entityType: "Expense",
      entityId: expense.id,
      details: {
        category: expense.category,
        amount: expense.amount.toString(),
        currency: expense.currency,
      },
    },
  });

  await revalidateExpensePaths();
  redirect(await expensesPath(`ok=created&focus=${expense.id}`));
}

export async function updateExpenseAction(formData: FormData): Promise<void> {
  const session = await requireRole([...MANAGERS]);
  const parsed = updateExpenseSchema.safeParse({
    id: formData.get("id"),
    date: formData.get("date"),
    category: formData.get("category"),
    amount: formData.get("amount"),
    currency: formData.get("currency") || "IQD",
    note: formData.get("note") || "",
    productId: formData.get("productId") || "",
    warehouseId: formData.get("warehouseId") || "",
    storeId: formData.get("storeId") || "",
    stockLotId: formData.get("stockLotId") || "",
  });
  if (!parsed.success) redirect(await expensesPath("error=invalid"));

  const date = parseExpenseDate(parsed.data.date);
  if (!date) redirect(await expensesPath("error=invalid"));

  const existing = await prisma.expense.findUnique({
    where: { id: parsed.data.id },
    select: { id: true },
  });
  if (!existing) redirect(await expensesPath("error=not_found"));

  const expense = await prisma.expense.update({
    where: { id: parsed.data.id },
    data: {
      date,
      category: parsed.data.category,
      amount: new Prisma.Decimal(String(parsed.data.amount)),
      currency: parsed.data.currency,
      note: parsed.data.note?.trim() ? parsed.data.note.trim() : null,
      productId: optionalId(parsed.data.productId),
      warehouseId: optionalId(parsed.data.warehouseId),
      storeId: optionalId(parsed.data.storeId),
      stockLotId: optionalId(parsed.data.stockLotId),
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EXPENSE_UPDATE",
      entityType: "Expense",
      entityId: expense.id,
      details: {
        category: expense.category,
        amount: expense.amount.toString(),
        currency: expense.currency,
      },
    },
  });

  await revalidateExpensePaths();
  redirect(await expensesPath(`ok=updated&focus=${expense.id}`));
}

export async function deleteExpenseAction(formData: FormData): Promise<void> {
  const session = await requireRole([...MANAGERS]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(await expensesPath("error=invalid"));

  const existing = await prisma.expense.findUnique({
    where: { id },
    select: { id: true, category: true, amount: true, currency: true },
  });
  if (!existing) redirect(await expensesPath("error=not_found"));

  await prisma.mediaAsset.deleteMany({
    where: { entityType: "Expense", entityId: id },
  });
  await prisma.expense.delete({ where: { id } });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      action: "EXPENSE_DELETE",
      entityType: "Expense",
      entityId: id,
      details: {
        category: existing.category,
        amount: existing.amount.toString(),
        currency: existing.currency,
      },
    },
  });

  await revalidateExpensePaths();
  redirect(await expensesPath("ok=deleted"));
}
