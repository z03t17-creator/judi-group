import { getLocale } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { localized } from "@/lib/i18n";
import { baghdadDayBounds, toBaghdadYmd } from "@/lib/reports/date";
import { FieldHomeBoard } from "./field-home-board";

export default async function FieldHomePage() {
  const session = await requireRole(["FIELD_DELEGATE"]);
  const locale = await getLocale();
  const today = toBaghdadYmd(new Date());
  const { start: dayStart, end: dayEnd } = baghdadDayBounds(today);

  const warehouseId = session.user.warehouseId;

  const [user, warehouse, customerCount, todayInvoiceCount, stockSkuCount, recentStores] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          fullName: true,
          primaryMedia: { select: { url: true } },
        },
      }),
      warehouseId
        ? prisma.warehouse.findUnique({
            where: { id: warehouseId },
            select: { name: true, licensePlate: true },
          })
        : Promise.resolve(null),
      prisma.store.count({ where: { status: { not: "PROSPECT" } } }),
      prisma.invoice.count({
        where: {
          createdById: session.user.id,
          createdAt: { gte: dayStart, lt: dayEnd },
        },
      }),
      warehouseId
        ? prisma.stockInventory.count({
            where: {
              warehouseId,
              baseQty: { gt: 0 },
            },
          })
        : Promise.resolve(0),
      prisma.store.findMany({
        where: { status: { not: "PROSPECT" } },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          storeName: true,
          ownerName: true,
          phone: true,
          primaryMedia: { select: { url: true } },
        },
      }),
    ]);

  return (
    <main className="mx-auto w-full max-w-content">
      <FieldHomeBoard
        delegateName={user?.fullName ?? session.user.name ?? "—"}
        delegateMediaUrl={user?.primaryMedia?.url ?? null}
        warehouseName={warehouse ? localized(warehouse.name, locale) : null}
        warehousePlate={warehouse?.licensePlate ?? null}
        customerCount={customerCount}
        todayInvoiceCount={todayInvoiceCount}
        stockSkuCount={stockSkuCount}
        recentStores={recentStores.map((store) => ({
          id: store.id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          phone: store.phone,
          primaryMediaUrl: store.primaryMedia?.url ?? null,
        }))}
      />
    </main>
  );
}
