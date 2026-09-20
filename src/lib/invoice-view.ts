import { toDecimal, type DecimalValue } from "@/lib/uom";

export type GroupableInvoiceItem = {
  id: string;
  productId: string;
  productUnitId: string;
  quantity: DecimalValue;
  isGift: boolean;
  unitPrice: DecimalValue;
  totalPrice: DecimalValue;
  productName: string;
  sku: string;
  unitName: string;
  productThumbUrl: string | null;
};

export type GroupedInvoiceLine = {
  id: string;
  productName: string;
  sku: string;
  unitName: string;
  soldQty: string;
  giftQty: string;
  unitPrice: string;
  lineTotal: string;
  productThumbUrl: string | null;
};

/** Merge sold + gift rows that share a product/unit into one document line. */
export function groupInvoiceLines(items: GroupableInvoiceItem[]): {
  lines: GroupedInvoiceLine[];
  giftQtyTotal: string;
} {
  const grouped = new Map<
    string,
    {
      id: string;
      productName: string;
      sku: string;
      unitName: string;
      soldQty: ReturnType<typeof toDecimal>;
      giftQty: ReturnType<typeof toDecimal>;
      unitPrice: ReturnType<typeof toDecimal>;
      lineTotal: ReturnType<typeof toDecimal>;
      productThumbUrl: string | null;
    }
  >();
  let giftQtyTotal = toDecimal(0);

  for (const item of items) {
    const key = `${item.productId}:${item.productUnitId}`;
    const qty = toDecimal(item.quantity);
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        id: item.id,
        productName: item.productName,
        sku: item.sku,
        unitName: item.unitName,
        soldQty: item.isGift ? toDecimal(0) : qty,
        giftQty: item.isGift ? qty : toDecimal(0),
        unitPrice: toDecimal(item.unitPrice),
        lineTotal: item.isGift ? toDecimal(0) : toDecimal(item.totalPrice),
        productThumbUrl: item.productThumbUrl,
      });
    } else if (item.isGift) {
      existing.giftQty = existing.giftQty.plus(qty);
    } else {
      existing.soldQty = existing.soldQty.plus(qty);
      existing.lineTotal = existing.lineTotal.plus(toDecimal(item.totalPrice));
    }
    if (item.isGift) {
      giftQtyTotal = giftQtyTotal.plus(qty);
    }
  }

  return {
    giftQtyTotal: giftQtyTotal.toString(),
    lines: [...grouped.values()].map((line) => ({
      id: line.id,
      productName: line.productName,
      sku: line.sku,
      unitName: line.unitName,
      soldQty: line.soldQty.toString(),
      giftQty: line.giftQty.toString(),
      unitPrice: line.unitPrice.toString(),
      lineTotal: line.lineTotal.toString(),
      productThumbUrl: line.productThumbUrl,
    })),
  };
}

export function thermalQuantityLabel(
  soldQty: string,
  giftQty: string,
  giftLabel: string,
  formatQty: (value: string) => string,
): string {
  const gift = Number(giftQty);
  if (Number.isFinite(gift) && gift > 0) {
    return `${formatQty(soldQty)} · ${giftLabel}`;
  }
  return formatQty(soldQty);
}
