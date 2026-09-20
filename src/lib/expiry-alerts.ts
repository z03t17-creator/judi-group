import { prisma } from "@/lib/prisma";
import { localized } from "@/lib/i18n";
import {
  EXPIRY_ALERT_WINDOWS_DAYS,
  daysUntilExpiry,
  type ExpiryAlertWindow,
} from "@/lib/stock-lot";
import { notifyExpiringLot } from "@/lib/notification-events";

function windowsForDays(days: number): ExpiryAlertWindow[] {
  const windows: ExpiryAlertWindow[] = [];
  if (days < 0) {
    windows.push("expired");
  }
  for (const w of EXPIRY_ALERT_WINDOWS_DAYS) {
    if (days <= w) windows.push(w);
  }
  return windows;
}

/**
 * Scan active lots with expiry dates and emit deduped in-app + push alerts
 * for expired / 7 / 14 / 30 day windows. Safe to call on page load.
 */
export async function syncExpiringLotAlerts(locale = "en") {
  const lots = await prisma.stockLot.findMany({
    where: {
      baseQty: { gt: 0 },
      expiryDate: { not: null },
    },
    include: {
      product: { select: { name: true, sku: true } },
      warehouse: { select: { name: true, type: true } },
      store: { select: { storeName: true } },
    },
    take: 500,
  });

  let notified = 0;
  for (const lot of lots) {
    if (!lot.expiryDate) continue;
    const days = daysUntilExpiry(lot.expiryDate);
    const windows = windowsForDays(days);
    if (windows.length === 0) continue;

    const productLabel =
      localized(lot.product.name, locale) || lot.product.sku;
    const locationLabel = lot.store
      ? lot.store.storeName
      : lot.warehouse
        ? localized(lot.warehouse.name, locale)
        : "—";

    for (const window of windows) {
      await notifyExpiringLot({
        lotId: lot.id,
        window,
        productLabel,
        locationLabel,
        expiryDate: lot.expiryDate.toISOString().slice(0, 10),
        baseQuantity: lot.baseQty.toString(),
        daysLeft: days,
      });
      notified += 1;
    }
  }

  return { scanned: lots.length, notified };
}
