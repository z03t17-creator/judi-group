import { Prisma } from "@prisma/client";
import { nextReceiptNumber } from "@/lib/collection";
import {
  resolveDiscounts,
  toDiscountRuleSnapshot,
  type DiscountRuleSnapshot,
} from "@/lib/discount-engine";
import { getCompanyProfile } from "@/lib/company-profile";
import { prisma } from "@/lib/prisma";
import {
  InvoiceError,
  assertCanSellOnDebt,
  assertDiscountPercent,
  invoiceTotals,
  lineBaseQuantity,
  lineStockQuantity,
  lineTotal,
  nextInvoiceNumber,
  nextStoreDebt,
  nextStoreDebtAfterReturn,
  pickUnitPrice,
  splitPayment,
  type InvoiceKind,
} from "@/lib/invoice";
import { ledgerAmounts, type CurrencyCode } from "@/lib/money";
import { notifyInvoiceCreated } from "@/lib/notification-events";
import { applyStockMovementInTx } from "@/lib/stock-apply";
import { toDecimal, type DecimalValue } from "@/lib/uom";

export type InvoiceLineInput = {
  productId: string;
  productUnitId: string;
  quantity: DecimalValue;
  giftQuantity?: DecimalValue;
};

async function loadDiscountRuleSnapshots(
  tx: Prisma.TransactionClient,
): Promise<DiscountRuleSnapshot[]> {
  const rules = await tx.discountRule.findMany({
    where: { active: true },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
  });
  return rules.map(toDiscountRuleSnapshot);
}

export async function createCompletedInvoice(input: {
  storeId: string;
  warehouseId: string;
  createdById: string;
  invoiceType: InvoiceKind;
  currency: CurrencyCode;
  discountPercent: DecimalValue;
  maxDiscountAllowed: DecimalValue;
  lines: InvoiceLineInput[];
}) {
  if (input.lines.length === 0) {
    throw new InvoiceError("invalid_quantity", "At least one invoice line is required.");
  }

  // Cap check early (engine also asserts) so empty-rule paths stay consistent.
  assertDiscountPercent(input.discountPercent, input.maxDiscountAllowed);

  const company = await getCompanyProfile();
  const numberOpts = {
    prefix: company.invoicePrefix,
    padWidth: company.invoicePadWidth,
  };

  const { invoice, storeName, invoiceNumber } = await prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) {
      throw new InvoiceError("invalid_warehouse", "Warehouse was not found.");
    }

    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${input.storeId} FOR UPDATE`;
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store) {
      throw new InvoiceError("invalid_store", "Store was not found.");
    }

    const discountRules = await loadDiscountRuleSnapshots(tx);

    const engineLines: {
      productId: string;
      categoryId: string;
      productUnitId: string;
      quantity: string;
      giftQuantity: string;
      listUnitPrice: string;
      conversionRatio: string;
    }[] = [];
    const stockMoves: {
      productId: string;
      productUnitId: string;
      quantity: string;
      type: "SALE" | "GIFT";
    }[] = [];

    for (const line of input.lines) {
      const soldQty = toDecimal(line.quantity);
      const giftQty = toDecimal(line.giftQuantity ?? 0);

      const [product, unit, inventory] = await Promise.all([
        tx.product.findUnique({ where: { id: line.productId } }),
        tx.productUnit.findUnique({ where: { id: line.productUnitId } }),
        tx.stockInventory.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: input.warehouseId,
              productId: line.productId,
            },
          },
        }),
      ]);

      if (!product) {
        throw new InvoiceError("invalid_product", "Product was not found.");
      }
      if (!unit || unit.productId !== line.productId) {
        throw new InvoiceError("invalid_unit", "Unit does not belong to this product.");
      }

      const listUnitPrice = pickUnitPrice(
        {
          sellingPrice: unit.sellingPrice.toString(),
          sellingPriceUsd: unit.sellingPriceUsd.toString(),
        },
        {
          customPrice: inventory?.customPrice?.toString() ?? null,
          customPriceUsd: inventory?.customPriceUsd?.toString() ?? null,
        },
        input.currency,
      );

      engineLines.push({
        productId: line.productId,
        categoryId: product.categoryId,
        productUnitId: line.productUnitId,
        quantity: soldQty.toString(),
        giftQuantity: giftQty.toString(),
        listUnitPrice: listUnitPrice.toString(),
        conversionRatio: unit.conversionRatio.toString(),
      });
    }

    const resolved = resolveDiscounts({
      rules: discountRules,
      storeTier: store.tier,
      currency: input.currency,
      lines: engineLines.map((line) => ({
        productId: line.productId,
        categoryId: line.categoryId,
        productUnitId: line.productUnitId,
        quantity: line.quantity,
        giftQuantity: line.giftQuantity,
        listUnitPrice: line.listUnitPrice,
      })),
      manualDiscountPercent: input.discountPercent,
      maxDiscountAllowed: input.maxDiscountAllowed,
    });

    if (resolved.lines.length === 0) {
      throw new InvoiceError("invalid_quantity", "At least one invoice line is required.");
    }

    const items: {
      productId: string;
      productUnitId: string;
      quantity: Prisma.Decimal;
      baseUnitQuantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      discountPercent: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      isGift: boolean;
    }[] = [];

    for (const line of resolved.lines) {
      const meta = engineLines.find(
        (row) =>
          row.productId === line.productId && row.productUnitId === line.productUnitId,
      );
      if (!meta) {
        throw new InvoiceError("invalid_product", "Product was not found.");
      }
      const ratio = meta.conversionRatio;
      const pricedUnit = new Prisma.Decimal(line.unitPrice.toDecimalPlaces(4).toString());
      // Validates sold+gift > 0 before splitting into SALE / GIFT movements.
      lineStockQuantity(line.quantity, line.giftQuantity);

      if (line.quantity.gt(0)) {
        const baseUnitQuantity = lineBaseQuantity(line.quantity, ratio);
        items.push({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: new Prisma.Decimal(line.quantity.toString()),
          baseUnitQuantity: new Prisma.Decimal(baseUnitQuantity.toString()),
          unitPrice: pricedUnit,
          discountPercent: new Prisma.Decimal(line.lineDiscountPercent.toString()),
          totalPrice: new Prisma.Decimal(line.lineNet.toString()),
          isGift: false,
        });
        stockMoves.push({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: line.quantity.toString(),
          type: "SALE",
        });
      }

      if (line.giftQuantity.gt(0)) {
        const baseUnitQuantity = lineBaseQuantity(line.giftQuantity, ratio);
        items.push({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: new Prisma.Decimal(line.giftQuantity.toString()),
          baseUnitQuantity: new Prisma.Decimal(baseUnitQuantity.toString()),
          unitPrice: pricedUnit,
          discountPercent: new Prisma.Decimal(0),
          totalPrice: new Prisma.Decimal(0),
          isGift: true,
        });
        stockMoves.push({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: line.giftQuantity.toString(),
          type: "GIFT",
        });
      }
    }

    const payment = splitPayment(input.invoiceType, resolved.totalAmount);
    const ledger = ledgerAmounts(
      {
        creditLimit: store.creditLimit.toString(),
        currentDebt: store.currentDebt.toString(),
        creditLimitUsd: store.creditLimitUsd.toString(),
        currentDebtUsd: store.currentDebtUsd.toString(),
      },
      input.currency,
    );

    if (input.invoiceType === "DEBT") {
      assertCanSellOnDebt(ledger.limit, ledger.debt, resolved.totalAmount);
    }

    const last = await tx.invoice.findFirst({
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });
    const invoiceNumber = nextInvoiceNumber(last?.invoiceNumber ?? null, numberOpts);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        storeId: store.id,
        warehouseId: warehouse.id,
        createdById: input.createdById,
        invoiceType: input.invoiceType,
        status: "COMPLETED",
        currency: input.currency,
        subTotal: new Prisma.Decimal(resolved.subTotal.toString()),
        discountPercent: new Prisma.Decimal(resolved.manualDiscountPercent.toString()),
        discountAmount: new Prisma.Decimal(resolved.discountAmount.toString()),
        totalAmount: new Prisma.Decimal(resolved.totalAmount.toString()),
        paidAmount: new Prisma.Decimal(payment.paidAmount.toString()),
        debtAmount: new Prisma.Decimal(payment.debtAmount.toString()),
        items: { create: items },
      },
    });

    for (const move of stockMoves) {
      await applyStockMovementInTx(tx, {
        warehouseId: input.warehouseId,
        productId: move.productId,
        productUnitId: move.productUnitId,
        recordedById: input.createdById,
        type: move.type,
        quantity: move.quantity,
        notes: invoice.invoiceNumber,
      });
    }

    if (input.invoiceType === "CASH") {
      const lastTx = await tx.transaction.findFirst({
        orderBy: { receiptNumber: "desc" },
        select: { receiptNumber: true },
      });
      const receiptNumber = nextReceiptNumber(lastTx?.receiptNumber ?? null);
      await tx.transaction.create({
        data: {
          receiptNumber,
          storeId: store.id,
          invoiceId: invoice.id,
          recordedById: input.createdById,
          type: "SALE_PAYMENT",
          amount: new Prisma.Decimal(payment.paidAmount.toString()),
          paymentMethod: "CASH",
          currency: input.currency,
          notes: invoice.invoiceNumber,
        },
      });
    } else {
      const nextDebt = nextStoreDebt(ledger.debt, "DEBT", resolved.totalAmount);
      await tx.store.update({
        where: { id: store.id },
        data:
          input.currency === "USD"
            ? { currentDebtUsd: new Prisma.Decimal(nextDebt.toString()) }
            : { currentDebt: new Prisma.Decimal(nextDebt.toString()) },
      });
    }

    await tx.auditLog.create({
      data: {
        userId: input.createdById,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber,
          invoiceType: input.invoiceType,
          currency: input.currency,
          totalAmount: resolved.totalAmount.toString(),
          storeId: store.id,
          warehouseId: warehouse.id,
          discountChips: resolved.chips,
          ruleDiscountAmount: resolved.ruleDiscountAmount.toString(),
        },
      },
    });

    return { invoice, storeName: store.storeName, invoiceNumber };
  });

  void notifyInvoiceCreated({
    invoiceId: invoice.id,
    invoiceNumber,
    storeName,
    createdById: input.createdById,
    invoiceType: input.invoiceType,
  }).catch(() => {
    /* best-effort alerts */
  });

  return invoice;
}

/**
 * Field return (مرتجع): stock comes back onto the van; store AR is reduced.
 * No gifts / promo engine — discount stays simple (0–cap) like before.
 */
export async function createCompletedReturn(input: {
  storeId: string;
  warehouseId: string;
  createdById: string;
  currency: CurrencyCode;
  discountPercent: DecimalValue;
  maxDiscountAllowed: DecimalValue;
  lines: InvoiceLineInput[];
}) {
  if (input.lines.length === 0) {
    throw new InvoiceError("invalid_quantity", "At least one return line is required.");
  }

  const discountPercent = assertDiscountPercent(input.discountPercent, input.maxDiscountAllowed);

  const company = await getCompanyProfile();
  const numberOpts = {
    prefix: company.invoicePrefix,
    padWidth: company.invoicePadWidth,
  };

  return prisma.$transaction(async (tx) => {
    const warehouse = await tx.warehouse.findUnique({ where: { id: input.warehouseId } });
    if (!warehouse) {
      throw new InvoiceError("invalid_warehouse", "Warehouse was not found.");
    }

    await tx.$queryRaw`SELECT id FROM "Store" WHERE id = ${input.storeId} FOR UPDATE`;
    const store = await tx.store.findUnique({ where: { id: input.storeId } });
    if (!store) {
      throw new InvoiceError("invalid_store", "Store was not found.");
    }

    const items: {
      productId: string;
      productUnitId: string;
      quantity: Prisma.Decimal;
      baseUnitQuantity: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      discountPercent: Prisma.Decimal;
      totalPrice: Prisma.Decimal;
      isGift: boolean;
    }[] = [];
    const stockMoves: {
      productId: string;
      productUnitId: string;
      quantity: string;
    }[] = [];

    let subTotal = new Prisma.Decimal(0);

    for (const line of input.lines) {
      const qty = toDecimal(line.quantity);
      if (qty.lte(0)) continue;

      const [product, unit, inventory] = await Promise.all([
        tx.product.findUnique({ where: { id: line.productId } }),
        tx.productUnit.findUnique({ where: { id: line.productUnitId } }),
        tx.stockInventory.findUnique({
          where: {
            warehouseId_productId: {
              warehouseId: input.warehouseId,
              productId: line.productId,
            },
          },
        }),
      ]);

      if (!product) {
        throw new InvoiceError("invalid_product", "Product was not found.");
      }
      if (!unit || unit.productId !== line.productId) {
        throw new InvoiceError("invalid_unit", "Unit does not belong to this product.");
      }

      const unitPrice = pickUnitPrice(
        {
          sellingPrice: unit.sellingPrice.toString(),
          sellingPriceUsd: unit.sellingPriceUsd.toString(),
        },
        {
          customPrice: inventory?.customPrice?.toString() ?? null,
          customPriceUsd: inventory?.customPriceUsd?.toString() ?? null,
        },
        input.currency,
      );
      const pricedUnit = new Prisma.Decimal(unitPrice.toDecimalPlaces(4).toString());
      const ratio = unit.conversionRatio.toString();
      const totalPrice = lineTotal(qty, unitPrice);
      const baseUnitQuantity = lineBaseQuantity(qty, ratio);
      subTotal = new Prisma.Decimal(subTotal.plus(totalPrice.toString()).toString());

      items.push({
        productId: line.productId,
        productUnitId: line.productUnitId,
        quantity: new Prisma.Decimal(qty.toString()),
        baseUnitQuantity: new Prisma.Decimal(baseUnitQuantity.toString()),
        unitPrice: pricedUnit,
        discountPercent: new Prisma.Decimal(0),
        totalPrice: new Prisma.Decimal(totalPrice.toString()),
        isGift: false,
      });

      stockMoves.push({
        productId: line.productId,
        productUnitId: line.productUnitId,
        quantity: qty.toString(),
      });
    }

    if (items.length === 0) {
      throw new InvoiceError("invalid_quantity", "At least one return line is required.");
    }

    const totals = invoiceTotals(subTotal.toString(), discountPercent);
    const ledger = ledgerAmounts(
      {
        creditLimit: store.creditLimit.toString(),
        currentDebt: store.currentDebt.toString(),
        creditLimitUsd: store.creditLimitUsd.toString(),
        currentDebtUsd: store.currentDebtUsd.toString(),
      },
      input.currency,
    );
    const nextDebt = nextStoreDebtAfterReturn(ledger.debt, totals.totalAmount);

    const last = await tx.invoice.findFirst({
      orderBy: { invoiceNumber: "desc" },
      select: { invoiceNumber: true },
    });
    const invoiceNumber = nextInvoiceNumber(last?.invoiceNumber ?? null, numberOpts);

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        storeId: store.id,
        warehouseId: warehouse.id,
        createdById: input.createdById,
        invoiceType: "RETURN",
        status: "COMPLETED",
        currency: input.currency,
        subTotal: new Prisma.Decimal(totals.subTotal.toString()),
        discountPercent: new Prisma.Decimal(discountPercent.toString()),
        discountAmount: new Prisma.Decimal(totals.discountAmount.toString()),
        totalAmount: new Prisma.Decimal(totals.totalAmount.toString()),
        paidAmount: new Prisma.Decimal(0),
        debtAmount: new Prisma.Decimal(0),
        items: { create: items },
      },
    });

    for (const move of stockMoves) {
      await applyStockMovementInTx(tx, {
        warehouseId: input.warehouseId,
        productId: move.productId,
        productUnitId: move.productUnitId,
        recordedById: input.createdById,
        type: "RETURN",
        quantity: move.quantity,
        notes: invoice.invoiceNumber,
      });
    }

    await tx.store.update({
      where: { id: store.id },
      data:
        input.currency === "USD"
          ? { currentDebtUsd: new Prisma.Decimal(nextDebt.toString()) }
          : { currentDebt: new Prisma.Decimal(nextDebt.toString()) },
    });

    await tx.auditLog.create({
      data: {
        userId: input.createdById,
        action: "INVOICE_CREATED",
        entityType: "Invoice",
        entityId: invoice.id,
        details: {
          invoiceNumber,
          invoiceType: "RETURN",
          currency: input.currency,
          totalAmount: totals.totalAmount.toString(),
          storeId: store.id,
          warehouseId: warehouse.id,
          debtBefore: String(ledger.debt),
          debtAfter: nextDebt.toString(),
        },
      },
    });

    return invoice;
  });
}
