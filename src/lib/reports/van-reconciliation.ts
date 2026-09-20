import Decimal from "decimal.js";
import { BASE_QTY_DP, toDecimal, type DecimalValue } from "@/lib/uom";
import { signedBaseDelta, type StockMovementKind } from "@/lib/stock";

export type ReconMovement = {
  productId: string;
  type: StockMovementKind;
  baseQuantity: DecimalValue;
  createdAt: Date;
};

export type ReconProduct = {
  productId: string;
  sku: string;
  name: string;
  liveBaseQty: DecimalValue;
  countedBaseQty?: DecimalValue | null;
};

export type AuditItemRow = {
  productId: string;
  sku: string;
  name: string;
  openingQty: string;
  loadedQty: string;
  receiveQty: string;
  soldQty: string;
  giftQty: string;
  returnedQty: string;
  writeOffQty: string;
  transferOutQty: string;
  expectedClosingQty: string;
  actualClosingQty: string;
  discrepancy: string;
};

/**
 * Reconstruct per-product van reconciliation for a business day window [dayStart, dayEnd).
 * opening = liveQty - sum(signed deltas during the day)
 */
export function buildVanReconciliation(
  products: ReconProduct[],
  movements: ReconMovement[],
  dayStart: Date,
  dayEnd: Date,
): AuditItemRow[] {
  const byProduct = new Map<
    string,
    {
      product: ReconProduct;
      loaded: Decimal;
      receive: Decimal;
      sold: Decimal;
      gift: Decimal;
      returned: Decimal;
      writeOff: Decimal;
      transferOut: Decimal;
      dayDelta: Decimal;
    }
  >();

  for (const product of products) {
    byProduct.set(product.productId, {
      product,
      loaded: new Decimal(0),
      receive: new Decimal(0),
      sold: new Decimal(0),
      gift: new Decimal(0),
      returned: new Decimal(0),
      writeOff: new Decimal(0),
      transferOut: new Decimal(0),
      dayDelta: new Decimal(0),
    });
  }

  for (const mov of movements) {
    if (mov.createdAt < dayStart || mov.createdAt >= dayEnd) continue;
    let bucket = byProduct.get(mov.productId);
    if (!bucket) {
      // Movement for a product with no live inventory row — still show it
      bucket = {
        product: {
          productId: mov.productId,
          sku: "",
          name: mov.productId,
          liveBaseQty: 0,
          countedBaseQty: null,
        },
        loaded: new Decimal(0),
        receive: new Decimal(0),
        sold: new Decimal(0),
        gift: new Decimal(0),
        returned: new Decimal(0),
        writeOff: new Decimal(0),
        transferOut: new Decimal(0),
        dayDelta: new Decimal(0),
      };
      byProduct.set(mov.productId, bucket);
    }

    const qty = toDecimal(mov.baseQuantity).toDecimalPlaces(BASE_QTY_DP);
    const delta = signedBaseDelta(mov.type, qty);
    bucket.dayDelta = bucket.dayDelta.plus(delta);

    switch (mov.type) {
      case "TRANSFER_IN":
      case "STORE_IN":
        bucket.loaded = bucket.loaded.plus(qty);
        break;
      case "RECEIVE":
        bucket.receive = bucket.receive.plus(qty);
        break;
      case "SALE":
        bucket.sold = bucket.sold.plus(qty);
        break;
      case "GIFT":
        bucket.gift = bucket.gift.plus(qty);
        break;
      case "RETURN":
        bucket.returned = bucket.returned.plus(qty);
        break;
      case "WRITE_OFF":
        bucket.writeOff = bucket.writeOff.plus(qty);
        break;
      case "TRANSFER_OUT":
      case "STORE_OUT":
        bucket.transferOut = bucket.transferOut.plus(qty);
        break;
      default:
        break;
    }
  }

  const rows: AuditItemRow[] = [];
  for (const bucket of byProduct.values()) {
    const live = toDecimal(bucket.product.liveBaseQty).toDecimalPlaces(BASE_QTY_DP);
    const opening = live.minus(bucket.dayDelta).toDecimalPlaces(BASE_QTY_DP);
    const expected = opening
      .plus(bucket.loaded)
      .plus(bucket.receive)
      .minus(bucket.sold)
      .minus(bucket.gift)
      .minus(bucket.writeOff)
      .minus(bucket.transferOut)
      .plus(bucket.returned)
      .toDecimalPlaces(BASE_QTY_DP);

    const counted =
      bucket.product.countedBaseQty != null && bucket.product.countedBaseQty !== ""
        ? toDecimal(bucket.product.countedBaseQty).toDecimalPlaces(BASE_QTY_DP)
        : live;
    const discrepancy = counted.minus(expected).toDecimalPlaces(BASE_QTY_DP);

    rows.push({
      productId: bucket.product.productId,
      sku: bucket.product.sku,
      name: bucket.product.name,
      openingQty: opening.toString(),
      loadedQty: bucket.loaded.toString(),
      receiveQty: bucket.receive.toString(),
      soldQty: bucket.sold.toString(),
      giftQty: bucket.gift.toString(),
      returnedQty: bucket.returned.toString(),
      writeOffQty: bucket.writeOff.toString(),
      transferOutQty: bucket.transferOut.toString(),
      expectedClosingQty: expected.toString(),
      actualClosingQty: counted.toString(),
      discrepancy: discrepancy.toString(),
    });
  }

  return rows.sort((a, b) => a.sku.localeCompare(b.sku) || a.name.localeCompare(b.name));
}
