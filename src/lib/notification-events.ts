import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  createNotifications,
  userIdsByRoles,
  userIdsForWarehouse,
} from "@/lib/notifications";
import {
  expiryAlertEntityId,
  type ExpiryAlertWindow,
} from "@/lib/stock-lot";

async function usersWithRoles(userIds: string[]) {
  if (userIds.length === 0) return [] as { id: string; role: Role }[];
  return prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, role: true },
  });
}

export async function notifyInvoiceCreated(input: {
  invoiceId: string;
  invoiceNumber: string;
  storeName: string;
  createdById: string;
  invoiceType: string;
}) {
  const recipients = await userIdsByRoles(
    ["ADMIN", "WAREHOUSE_ACCOUNTANT", "COLLECTOR_ACCOUNTANT"],
    input.createdById,
  );
  if (recipients.length === 0) return;

  await createNotifications({
    userIds: recipients,
    kind: "INVOICE",
    title: {
      en: `Invoice ${input.invoiceNumber}`,
      ar: `فاتورة ${input.invoiceNumber}`,
      ckb: `پسوڵە ${input.invoiceNumber}`,
    },
    body: {
      en: `${input.storeName} · ${input.invoiceType}`,
      ar: `${input.storeName} · ${input.invoiceType}`,
      ckb: `${input.storeName} · ${input.invoiceType}`,
    },
    href: `/dashboard/invoices/${input.invoiceId}`,
    entityType: "Invoice",
    entityId: input.invoiceId,
    actorId: input.createdById,
  });
}

export async function notifyCollectionRecorded(input: {
  transactionId: string;
  receiptNumber: string;
  storeName: string;
  amountLabel: string;
  recordedById: string;
}) {
  const recipients = await userIdsByRoles(
    ["ADMIN", "COLLECTOR_ACCOUNTANT"],
    input.recordedById,
  );
  if (recipients.length === 0) return;

  await createNotifications({
    userIds: recipients,
    kind: "COLLECTION",
    title: {
      en: `Collection ${input.receiptNumber}`,
      ar: `تحصيل ${input.receiptNumber}`,
      ckb: `کۆکردنەوە ${input.receiptNumber}`,
    },
    body: {
      en: `${input.storeName} · ${input.amountLabel}`,
      ar: `${input.storeName} · ${input.amountLabel}`,
      ckb: `${input.storeName} · ${input.amountLabel}`,
    },
    href: `/dashboard/collections/${input.transactionId}`,
    entityType: "Transaction",
    entityId: input.transactionId,
    actorId: input.recordedById,
  });
}

export async function notifyTransferCreated(input: {
  transferId: string;
  sourceId: string;
  destinationId: string;
  createdById: string;
  itemCount: number;
}) {
  const [destUsers, office] = await Promise.all([
    userIdsForWarehouse(input.destinationId, input.createdById),
    userIdsByRoles(["ADMIN", "WAREHOUSE_ACCOUNTANT"], input.createdById),
  ]);
  const users = await usersWithRoles([...new Set([...destUsers, ...office])]);
  if (users.length === 0) return;

  const title = {
    en: "New stock transfer",
    ar: "تحويل مخزون جديد",
    ckb: "گواستنەوەی نوێی کۆگا",
  };
  const body = {
    en: `${input.itemCount} line(s) waiting for review`,
    ar: `${input.itemCount} بند بانتظار المراجعة`,
    ckb: `${input.itemCount} هێڵ چاوەڕوانی پێداچوونەوەیە`,
  };

  const officeIds = users.filter((u) => u.role !== "FIELD_DELEGATE").map((u) => u.id);
  const fieldIds = users.filter((u) => u.role === "FIELD_DELEGATE").map((u) => u.id);

  if (officeIds.length > 0) {
    await createNotifications({
      userIds: officeIds,
      kind: "TRANSFER",
      title,
      body,
      href: "/dashboard/transfers",
      entityType: "StockTransfer",
      entityId: input.transferId,
      actorId: input.createdById,
    });
  }
  if (fieldIds.length > 0) {
    await createNotifications({
      userIds: fieldIds,
      kind: "TRANSFER",
      title,
      body,
      href: "/field/stock",
      entityType: "StockTransfer",
      entityId: input.transferId,
      actorId: input.createdById,
    });
  }
}

export async function notifyTransferDecided(input: {
  transferId: string;
  createdById: string;
  decidedById: string;
  decision: "ACCEPTED" | "REJECTED";
}) {
  const recipientIds = [
    ...(await userIdsByRoles(["ADMIN", "WAREHOUSE_ACCOUNTANT"], input.decidedById)),
  ];
  if (input.createdById !== input.decidedById) {
    recipientIds.push(input.createdById);
  }
  const users = await usersWithRoles([...new Set(recipientIds)]);
  if (users.length === 0) return;

  const accepted = input.decision === "ACCEPTED";
  const title = {
    en: accepted ? "Transfer accepted" : "Transfer rejected",
    ar: accepted ? "تم قبول التحويل" : "تم رفض التحويل",
    ckb: accepted ? "گواستنەوە قبوڵکرا" : "گواستنەوە ڕەتکرایەوە",
  };
  const body = {
    en: accepted ? "Stock moved between warehouses." : "No stock was moved.",
    ar: accepted ? "تم نقل المخزون بين المستودعات." : "لم يتم نقل أي مخزون.",
    ckb: accepted ? "کۆگا لە نێوان کۆگاکان جوڵێنرا." : "هیچ کۆگایەک نەجوڵێنرا.",
  };

  const officeIds = users.filter((u) => u.role !== "FIELD_DELEGATE").map((u) => u.id);
  const fieldIds = users.filter((u) => u.role === "FIELD_DELEGATE").map((u) => u.id);

  if (officeIds.length > 0) {
    await createNotifications({
      userIds: officeIds,
      kind: "TRANSFER",
      title,
      body,
      href: "/dashboard/transfers",
      entityType: "StockTransfer",
      entityId: input.transferId,
      actorId: input.decidedById,
    });
  }
  if (fieldIds.length > 0) {
    await createNotifications({
      userIds: fieldIds,
      kind: "TRANSFER",
      title,
      body,
      href: "/field/stock",
      entityType: "StockTransfer",
      entityId: input.transferId,
      actorId: input.decidedById,
    });
  }
}

export async function notifyLotWrittenOff(input: {
  lotId: string;
  expenseId: string;
  recordedById: string;
  baseQuantity: string;
  amount: string;
  lotCode: string | null;
  expiryDate: string | null;
}) {
  const recipients = await userIdsByRoles(
    ["ADMIN", "WAREHOUSE_ACCOUNTANT"],
    input.recordedById,
  );
  // Always include actor so they see confirmation in alerts.
  const userIds = [...new Set([...recipients, input.recordedById])];
  if (userIds.length === 0) return;

  const lotLabel = input.lotCode ? `Lot ${input.lotCode}` : "Lot";
  const exp = input.expiryDate ?? "—";

  await createNotifications({
    userIds,
    kind: "STOCK",
    title: {
      en: "Expired stock written off",
      ar: "شطب مخزون منتهي الصلاحية",
      ckb: "کۆگای بەسەرچوو نووسرایەوە",
    },
    body: {
      en: `${lotLabel} · exp ${exp} · ${input.baseQuantity} base · ${input.amount} IQD`,
      ar: `${lotLabel} · انتهاء ${exp} · ${input.baseQuantity} أساس · ${input.amount} د.ع`,
      ckb: `${lotLabel} · بەسەرچوون ${exp} · ${input.baseQuantity} بنەڕەت · ${input.amount} دینار`,
    },
    href: `/dashboard/expenses?focus=${input.expenseId}`,
    entityType: "Expense",
    entityId: input.expenseId,
    actorId: input.recordedById,
  });
}

export async function notifyExpiringLot(input: {
  lotId: string;
  window: ExpiryAlertWindow;
  productLabel: string;
  locationLabel: string;
  expiryDate: string;
  baseQuantity: string;
  daysLeft: number;
}) {
  const recipients = await userIdsByRoles(["ADMIN", "WAREHOUSE_ACCOUNTANT"]);
  if (recipients.length === 0) return;

  const entityId = expiryAlertEntityId(input.lotId, input.window);

  const existing = await prisma.userNotification.findFirst({
    where: {
      entityType: "StockLot",
      entityId,
    },
    select: { id: true },
  });
  if (existing) return;

  const windowLabel =
    input.window === "expired"
      ? { en: "Expired", ar: "منتهي", ckb: "بەسەرچوو" }
      : {
          en: `Expires in ≤${input.window} days`,
          ar: `ينتهي خلال ≤${input.window} أيام`,
          ckb: `لە ماوەی ≤${input.window} ڕۆژدا بەسەردەچێت`,
        };

  await createNotifications({
    userIds: recipients,
    kind: "STOCK",
    title: {
      en: `${windowLabel.en}: ${input.productLabel}`,
      ar: `${windowLabel.ar}: ${input.productLabel}`,
      ckb: `${windowLabel.ckb}: ${input.productLabel}`,
    },
    body: {
      en: `${input.locationLabel} · ${input.baseQuantity} base · exp ${input.expiryDate}`,
      ar: `${input.locationLabel} · ${input.baseQuantity} أساس · انتهاء ${input.expiryDate}`,
      ckb: `${input.locationLabel} · ${input.baseQuantity} بنەڕەت · بەسەرچوون ${input.expiryDate}`,
    },
    href: "/dashboard/expiry",
    entityType: "StockLot",
    entityId,
  });
}

