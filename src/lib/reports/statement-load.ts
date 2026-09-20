import { prisma } from "@/lib/prisma";
import { type CurrencyCode } from "@/lib/money";
import { rangeBounds } from "@/lib/reports/date";
import {
  ageReceivables,
  buildStatement,
  type LedgerEvent,
} from "@/lib/reports/statement";

export async function loadCustomerStatement(input: {
  storeId: string;
  from: string;
  to: string;
  currency: CurrencyCode;
}) {
  const store = await prisma.store.findUnique({ where: { id: input.storeId } });
  if (!store) {
    return null;
  }

  const { start, end } = rangeBounds(input.from, input.to);

  const [debtInvoices, returnInvoices, collections] = await Promise.all([
    prisma.invoice.findMany({
      where: {
        storeId: input.storeId,
        currency: input.currency,
        invoiceType: "DEBT",
        status: "COMPLETED",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        debtAmount: true,
        createdAt: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        storeId: input.storeId,
        currency: input.currency,
        invoiceType: "RETURN",
        status: "COMPLETED",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        invoiceNumber: true,
        totalAmount: true,
        createdAt: true,
      },
    }),
    prisma.transaction.findMany({
      where: {
        storeId: input.storeId,
        currency: input.currency,
        type: "COLLECTION",
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        receiptNumber: true,
        amount: true,
        createdAt: true,
      },
    }),
  ]);

  const events: LedgerEvent[] = [
    ...debtInvoices.map((inv) => ({
      date: inv.createdAt,
      type: "INVOICE" as const,
      id: inv.id,
      reference: inv.invoiceNumber,
      debit: inv.debtAmount.toString(),
      credit: "0",
    })),
    ...returnInvoices.map((inv) => ({
      date: inv.createdAt,
      type: "INVOICE" as const,
      id: inv.id,
      reference: inv.invoiceNumber,
      debit: "0",
      credit: inv.totalAmount.toString(),
    })),
    ...collections.map((tx) => ({
      date: tx.createdAt,
      type: "PAYMENT" as const,
      id: tx.id,
      reference: tx.receiptNumber,
      debit: "0",
      credit: tx.amount.toString(),
    })),
  ];

  const statement = buildStatement(events, start, end);
  const aging = ageReceivables(
    debtInvoices.map((inv) => ({
      date: inv.createdAt,
      reference: inv.invoiceNumber,
      amount: inv.debtAmount.toString(),
    })),
    collections.map((tx) => ({
      date: tx.createdAt,
      amount: tx.amount.toString(),
    })),
    end.getTime() > Date.now() ? new Date() : new Date(end.getTime() - 1),
  );

  const currentDebt =
    input.currency === "USD" ? store.currentDebtUsd.toString() : store.currentDebt.toString();
  const creditLimit =
    input.currency === "USD" ? store.creditLimitUsd.toString() : store.creditLimit.toString();

  return {
    storeId: store.id,
    storeName: store.storeName,
    currency: input.currency,
    creditLimit,
    currentDebt,
    dateRange: { from: input.from, to: input.to },
    openingBalance: statement.openingBalance,
    closingBalance: statement.closingBalance,
    ledgerEntries: statement.ledgerEntries,
    aging,
  };
}
