import { Prisma } from "@prisma/client";
import {
  CollectionError,
  assertCollectionAmount,
  nextDebtAfterCollection,
  nextReceiptNumber,
  type PaymentMethod,
} from "@/lib/collection";
import { ledgerAmounts, type CurrencyCode } from "@/lib/money";
import { notifyCollectionRecorded } from "@/lib/notification-events";
import { prisma } from "@/lib/prisma";

export async function recordCollection(input: {
  storeId: string;
  recordedById: string;
  amount: string | number;
  currency: CurrencyCode;
  paymentMethod: PaymentMethod;
  notes?: string | null;
}) {
  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${input.storeId} FOR UPDATE`;
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store) {
      throw new CollectionError("invalid_store", "Store was not found.");
    }

    const ledger = ledgerAmounts(
      {
        creditLimit: store.creditLimit.toString(),
        currentDebt: store.currentDebt.toString(),
        creditLimitUsd: store.creditLimitUsd.toString(),
        currentDebtUsd: store.currentDebtUsd.toString(),
      },
      input.currency,
    );

    const amount = assertCollectionAmount(ledger.debt, input.amount);
    const nextDebt = nextDebtAfterCollection(ledger.debt, amount);

    const last = await tx.transaction.findFirst({
      orderBy: { receiptNumber: "desc" },
      select: { receiptNumber: true },
    });
    const receiptNumber = nextReceiptNumber(last?.receiptNumber ?? null);

    const transaction = await tx.transaction.create({
      data: {
        receiptNumber,
        storeId: store.id,
        recordedById: input.recordedById,
        type: "COLLECTION",
        amount: new Prisma.Decimal(amount.toString()),
        paymentMethod: input.paymentMethod,
        currency: input.currency,
        notes: input.notes?.trim() || null,
      },
    });

    await tx.store.update({
      where: { id: store.id },
      data:
        input.currency === "USD"
          ? { currentDebtUsd: new Prisma.Decimal(nextDebt.toString()) }
          : { currentDebt: new Prisma.Decimal(nextDebt.toString()) },
    });

    await tx.auditLog.create({
      data: {
        userId: input.recordedById,
        action: "COLLECTION_RECORDED",
        entityType: "Transaction",
        entityId: transaction.id,
        details: {
          receiptNumber,
          storeId: store.id,
          currency: input.currency,
          amount: amount.toString(),
          paymentMethod: input.paymentMethod,
          previousDebt: ledger.debt.toString(),
          nextDebt: nextDebt.toString(),
        },
      },
    });

    return {
      transaction,
      storeName: store.storeName,
      receiptNumber,
      amountLabel: `${amount.toString()} ${input.currency}`,
    };
  });

  void notifyCollectionRecorded({
    transactionId: result.transaction.id,
    receiptNumber: result.receiptNumber,
    storeName: result.storeName,
    amountLabel: result.amountLabel,
    recordedById: input.recordedById,
  }).catch(() => {
    /* best-effort alerts */
  });

  return result.transaction;
}
