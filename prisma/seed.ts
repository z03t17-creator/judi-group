import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { DEV_LOGIN_ACCOUNTS, SEED_PASSWORD } from "../src/lib/dev-accounts";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash(SEED_PASSWORD, 12);

  const mainHub = await prisma.warehouse.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      type: "MAIN",
      name: {
        en: "Main Hub",
        ar: "المستودع الرئيسي",
        ckb: "کۆگای سەرەکی",
      },
    },
  });

  const van = await prisma.warehouse.upsert({
    where: { id: "22222222-2222-2222-2222-222222222222" },
    update: {},
    create: {
      id: "22222222-2222-2222-2222-222222222222",
      type: "VAN",
      licensePlate: "ERB-04",
      name: {
        en: "Distribution Van 04",
        ar: "سيارة التوزيع 04",
        ckb: "سەیارەی دابەشکردن 04",
      },
    },
  });

  const warehouseIdFor = {
    main: mainHub.id,
    van: van.id,
  } as const;

  const users = DEV_LOGIN_ACCOUNTS.map((account) => ({
    email: account.email,
    fullName: account.fullName,
    role: account.role,
    maxDiscountAllowed: account.maxDiscountAllowed,
    assignedWarehouseId: account.warehouse
      ? warehouseIdFor[account.warehouse]
      : null,
  }));

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        fullName: user.fullName,
        role: user.role,
        maxDiscountAllowed: user.maxDiscountAllowed,
        assignedWarehouseId: user.assignedWarehouseId,
        passwordHash,
      },
      create: {
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        maxDiscountAllowed: user.maxDiscountAllowed,
        assignedWarehouseId: user.assignedWarehouseId,
        passwordHash,
      },
    });
  }

  const seededUsers = await prisma.user.findMany({
    where: {
      email: {
        in: users.map((user) => user.email),
      },
    },
    select: { id: true, role: true },
  });

  for (const user of seededUsers) {
    const href = user.role === "FIELD_DELEGATE" ? "/field/alerts" : "/dashboard/alerts";
    const existing = await prisma.userNotification.findFirst({
      where: { userId: user.id, kind: "SYSTEM", entityType: "Welcome" },
      select: { id: true },
    });
    if (existing) continue;
    await prisma.userNotification.create({
      data: {
        userId: user.id,
        kind: "SYSTEM",
        title: {
          en: "Alerts are ready",
          ar: "التنبيهات جاهزة",
          ckb: "ئاگادارییەکان ئامادەن",
        },
        body: {
          en: "Enable device notifications so Judi can reach you when this app is installed from the home-screen shortcut or manifest.",
          ar: "فعّل إشعارات الجهاز حتى تصل تنبيهات جودي عند تثبيت التطبيق من الاختصار أو البيان.",
          ckb: "ئاگادارییەکانی ئامێر چالاک بکە تا جودی پێت بگات کاتێک ئەپەکە لە قەدبڕ یان مانیفێست دامەزرا.",
        },
        href,
        entityType: "Welcome",
        entityId: user.id,
      },
    });
  }

  const dairy = await prisma.productCategory.upsert({
    where: { id: "c1111111-1111-1111-1111-111111111101" },
    update: {},
    create: {
      id: "c1111111-1111-1111-1111-111111111101",
      name: { en: "Dairy", ar: "ألبان", ckb: "شیرەمەنی" },
    },
  });
  const beverages = await prisma.productCategory.upsert({
    where: { id: "c1111111-1111-1111-1111-111111111102" },
    update: {},
    create: {
      id: "c1111111-1111-1111-1111-111111111102",
      name: { en: "Beverages", ar: "مشروبات", ckb: "خواردنەوە" },
    },
  });
  const oils = await prisma.productCategory.upsert({
    where: { id: "c1111111-1111-1111-1111-111111111103" },
    update: {},
    create: {
      id: "c1111111-1111-1111-1111-111111111103",
      name: { en: "Oils", ar: "زيوت", ckb: "زەیت" },
    },
  });
  void beverages;
  void oils;

  await prisma.product.upsert({
    where: { sku: "CHS-500" },
    update: {},
    create: {
      sku: "CHS-500",
      barcode: "6281000005001",
      name: {
        en: "Full Fat Cheese 500g",
        ar: "جبنة كاملة الدسم 500 غرام",
        ckb: "پەنری تەواو چەور 500 گرام",
      },
      categoryId: dairy.id,
      baseCost: 1800,
      units: {
        create: [
          {
            isBaseUnit: true,
            conversionRatio: 1,
            sellingPrice: 2500,
            sellingPriceUsd: 2,
            barcode: "6281000005011",
            unitName: { en: "Piece", ar: "قطعة", ckb: "دانە" },
          },
          {
            isBaseUnit: false,
            conversionRatio: 6,
            sellingPrice: 14000,
            sellingPriceUsd: 11,
            barcode: "6281000005021",
            unitName: { en: "Pack", ar: "ربطة", ckb: "پاکەت" },
          },
          {
            isBaseUnit: false,
            conversionRatio: 24,
            sellingPrice: 52000,
            sellingPriceUsd: 40,
            barcode: "6281000005031",
            unitName: { en: "Carton", ar: "كرتونة", ckb: "کارتۆن" },
          },
        ],
      },
    },
  });

  const cheese = await prisma.product.findUniqueOrThrow({
    where: { sku: "CHS-500" },
    include: { units: true },
  });

  for (const unit of cheese.units) {
    const ratio = Number(unit.conversionRatio);
    const sellingPriceUsd = ratio === 24 ? 40 : ratio === 6 ? 11 : 2;
    const barcode =
      ratio === 24
        ? "6281000005031"
        : ratio === 6
          ? "6281000005021"
          : "6281000005011";
    await prisma.productUnit.update({
      where: { id: unit.id },
      data: { sellingPriceUsd, barcode },
    });
  }

  await prisma.stockInventory.upsert({
    where: {
      warehouseId_productId: {
        warehouseId: mainHub.id,
        productId: cheese.id,
      },
    },
    create: {
      warehouseId: mainHub.id,
      productId: cheese.id,
      baseQty: 240,
    },
    update: {
      baseQty: 240,
    },
  });

  await prisma.stockInventory.upsert({
    where: {
      warehouseId_productId: {
        warehouseId: van.id,
        productId: cheese.id,
      },
    },
    create: {
      warehouseId: van.id,
      productId: cheese.id,
      baseQty: 48,
    },
    update: {
      baseQty: 48,
    },
  });

  await prisma.store.upsert({
    where: { id: "33333333-3333-3333-3333-333333333333" },
    update: {
      storeName: "Al-Amal Supermarket",
      ownerName: "Hassan Ali",
      phone: "07501234567",
      email: "alamal@stores.local",
      address: "60m Street, Erbil",
      tier: "SUPERMARKET",
      status: "ACTIVE",
      latitude: 36.1911,
      longitude: 44.0093,
      creditLimit: 15_000_000,
      creditLimitUsd: 10_000,
    },
    create: {
      id: "33333333-3333-3333-3333-333333333333",
      storeName: "Al-Amal Supermarket",
      ownerName: "Hassan Ali",
      phone: "07501234567",
      email: "alamal@stores.local",
      address: "60m Street, Erbil",
      tier: "SUPERMARKET",
      status: "ACTIVE",
      latitude: 36.1911,
      longitude: 44.0093,
      creditLimit: 15_000_000,
      currentDebt: 0,
      creditLimitUsd: 10_000,
      currentDebtUsd: 0,
    },
  });

  await prisma.store.upsert({
    where: { id: "44444444-4444-4444-4444-444444444444" },
    update: {
      storeName: "Family Mall Market",
      ownerName: "Nzar Omar",
      phone: "07509876543",
      email: "family@stores.local",
      address: "Ankawa, Erbil",
      tier: "WHOLESALE",
      status: "ACTIVE",
      latitude: 36.235,
      longitude: 43.993,
      creditLimit: 25_000_000,
      creditLimitUsd: 20_000,
    },
    create: {
      id: "44444444-4444-4444-4444-444444444444",
      storeName: "Family Mall Market",
      ownerName: "Nzar Omar",
      phone: "07509876543",
      email: "family@stores.local",
      address: "Ankawa, Erbil",
      tier: "WHOLESALE",
      status: "ACTIVE",
      latitude: 36.235,
      longitude: 43.993,
      creditLimit: 25_000_000,
      currentDebt: 0,
      creditLimitUsd: 20_000,
      currentDebtUsd: 0,
    },
  });

  await prisma.store.upsert({
    where: { id: "55555555-5555-5555-5555-555555555555" },
    update: {
      storeName: "New Corner Market",
      ownerName: "Sara Hadi",
      phone: "07501112233",
      email: null,
      address: "Downtown, Erbil",
      tier: "MINIMARKET",
      status: "PROSPECT",
      latitude: null,
      longitude: null,
      creditLimit: 0,
      creditLimitUsd: 0,
    },
    create: {
      id: "55555555-5555-5555-5555-555555555555",
      storeName: "New Corner Market",
      ownerName: "Sara Hadi",
      phone: "07501112233",
      email: null,
      address: "Downtown, Erbil",
      tier: "MINIMARKET",
      status: "PROSPECT",
      latitude: null,
      longitude: null,
      creditLimit: 0,
      currentDebt: 0,
      creditLimitUsd: 0,
      currentDebtUsd: 0,
    },
  });

  await seedExtraProducts();
  await seedDemoHistory({
    mainHubId: mainHub.id,
    vanId: van.id,
    cheeseId: cheese.id,
  });
  await repairNegativeStock();

  console.log("Seeded Judi Phase 4 data.");
  console.log("Local passwords for all users:", SEED_PASSWORD);
}

/** Demo history must never leave vans below zero (breaks UOM breakdown UI). */
async function repairNegativeStock() {
  const negatives = await prisma.stockInventory.findMany({
    where: { baseQty: { lt: 0 } },
  });
  for (const row of negatives) {
    await prisma.stockInventory.update({
      where: { id: row.id },
      data: { baseQty: 96 },
    });
  }
  if (negatives.length > 0) {
    console.log(`Repaired ${negatives.length} negative stock row(s) to 96 base units.`);
  }
}

async function seedExtraProducts() {
  const beverages = await prisma.productCategory.findFirstOrThrow({
    where: { id: "c1111111-1111-1111-1111-111111111102" },
  });
  const oils = await prisma.productCategory.findFirstOrThrow({
    where: { id: "c1111111-1111-1111-1111-111111111103" },
  });

  const products = [
    {
      sku: "TEA-400",
      barcode: "6281000004001",
      unitBarcodes: {
        piece: "6281000004011",
        pack: "6281000004021",
        carton: "6281000004031",
      },
      baseCost: 900,
      categoryId: beverages.id,
      name: { en: "Tea 400g", ar: "شاي 400 غرام", ckb: "چا 400 گرام" },
      piece: { price: 1500, usd: 1.2 },
      pack: { price: 8500, usd: 6.5, ratio: 6 },
      carton: { price: 32000, usd: 24, ratio: 24 },
    },
    {
      sku: "OIL-1L",
      barcode: "6281000007001",
      unitBarcodes: {
        piece: "6281000007011",
        pack: "6281000007021",
        carton: "6281000007031",
      },
      baseCost: 2200,
      categoryId: oils.id,
      name: { en: "Sunflower Oil 1L", ar: "زيت عباد الشمس 1 لتر", ckb: "زەیتی گوڵەبەڕۆژە 1 لیتر" },
      piece: { price: 3500, usd: 2.5 },
      pack: { price: 20000, usd: 14, ratio: 6 },
      carton: { price: 75000, usd: 52, ratio: 24 },
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        barcode: p.barcode,
        name: p.name,
        categoryId: p.categoryId,
        baseCost: p.baseCost,
        units: {
          create: [
            {
              isBaseUnit: true,
              conversionRatio: 1,
              sellingPrice: p.piece.price,
              sellingPriceUsd: p.piece.usd,
              barcode: p.unitBarcodes.piece,
              unitName: { en: "Piece", ar: "قطعة", ckb: "دانە" },
            },
            {
              isBaseUnit: false,
              conversionRatio: p.pack.ratio,
              sellingPrice: p.pack.price,
              sellingPriceUsd: p.pack.usd,
              barcode: p.unitBarcodes.pack,
              unitName: { en: "Pack", ar: "ربطة", ckb: "پاکەت" },
            },
            {
              isBaseUnit: false,
              conversionRatio: p.carton.ratio,
              sellingPrice: p.carton.price,
              sellingPriceUsd: p.carton.usd,
              barcode: p.unitBarcodes.carton,
              unitName: { en: "Carton", ar: "كرتونة", ckb: "کارتۆن" },
            },
          ],
        },
      },
    });

    const existing = await prisma.product.findUnique({
      where: { sku: p.sku },
      include: { units: true },
    });
    if (existing) {
      for (const unit of existing.units) {
        const ratio = Number(unit.conversionRatio);
        const barcode =
          ratio === p.carton.ratio
            ? p.unitBarcodes.carton
            : ratio === p.pack.ratio
              ? p.unitBarcodes.pack
              : p.unitBarcodes.piece;
        if (!unit.barcode) {
          await prisma.productUnit.update({
            where: { id: unit.id },
            data: { barcode },
          });
        }
      }
    }
  }
}
async function seedDemoHistory(ids: {
  mainHubId: string;
  vanId: string;
  cheeseId: string;
}) {
  const existing = await prisma.invoice.findFirst({
    where: { invoiceNumber: "INV-000001" },
  });
  if (existing) {
    console.log("Demo invoice history already present — skipping.");
    return;
  }

  const delegate = await prisma.user.findUniqueOrThrow({
    where: { email: "delegate@judi.local" },
  });
  const collector = await prisma.user.findUniqueOrThrow({
    where: { email: "collector@judi.local" },
  });
  const warehouseUser = await prisma.user.findUniqueOrThrow({
    where: { email: "warehouse@judi.local" },
  });

  const products = await prisma.product.findMany({
    include: { units: true },
  });
  const storeA = "33333333-3333-3333-3333-333333333333";
  const storeB = "44444444-4444-4444-4444-444444444444";

  // Van start qty must cover all demo sales (cheese ≈ 138, tea ≈ 168, oil ≈ 86).
  const VAN_START_QTY = 240;
  const HUB_START_QTY = 480;

  for (const product of products) {
    await prisma.stockInventory.upsert({
      where: {
        warehouseId_productId: { warehouseId: ids.vanId, productId: product.id },
      },
      create: { warehouseId: ids.vanId, productId: product.id, baseQty: VAN_START_QTY },
      update: { baseQty: VAN_START_QTY },
    });
    await prisma.stockInventory.upsert({
      where: {
        warehouseId_productId: { warehouseId: ids.mainHubId, productId: product.id },
      },
      create: { warehouseId: ids.mainHubId, productId: product.id, baseQty: HUB_START_QTY },
      update: { baseQty: HUB_START_QTY },
    });
  }

  // Accepted van load 7 days ago
  const loadDate = baghdadDateDaysAgo(7);
  const cheese = products.find((p) => p.id === ids.cheeseId)!;
  const cheeseCarton = cheese.units.find((u) => Number(u.conversionRatio) === 24)!;

  const transfer = await prisma.stockTransfer.create({
    data: {
      sourceId: ids.mainHubId,
      destinationId: ids.vanId,
      status: "ACCEPTED",
      createdById: warehouseUser.id,
      decidedById: delegate.id,
      createdAt: loadDate,
      decidedAt: loadDate,
      notes: "Demo van load",
      items: {
        create: [
          {
            productId: cheese.id,
            productUnitId: cheeseCarton.id,
            quantity: 2,
            baseQuantity: 48,
          },
        ],
      },
    },
  });

  await prisma.stockMovement.create({
    data: {
      warehouseId: ids.mainHubId,
      productId: cheese.id,
      productUnitId: cheeseCarton.id,
      recordedById: warehouseUser.id,
      transferId: transfer.id,
      type: "TRANSFER_OUT",
      quantity: 2,
      baseQuantity: 48,
      createdAt: loadDate,
      notes: "Demo load out",
    },
  });
  await prisma.stockMovement.create({
    data: {
      warehouseId: ids.vanId,
      productId: cheese.id,
      productUnitId: cheeseCarton.id,
      recordedById: delegate.id,
      transferId: transfer.id,
      type: "TRANSFER_IN",
      quantity: 2,
      baseQuantity: 48,
      createdAt: loadDate,
      notes: "Demo load in",
    },
  });

  await prisma.stockInventory.update({
    where: {
      warehouseId_productId: { warehouseId: ids.mainHubId, productId: cheese.id },
    },
    data: { baseQty: { decrement: 48 } },
  });
  await prisma.stockInventory.update({
    where: {
      warehouseId_productId: { warehouseId: ids.vanId, productId: cheese.id },
    },
    data: { baseQty: { increment: 48 } },
  });

  let invoiceSeq = 1;
  let receiptSeq = 1;

  type DemoSale = {
    daysAgo: number;
    storeId: string;
    type: "CASH" | "DEBT";
    currency: "IQD" | "USD";
    productSku: string;
    unitRatio: number;
    qty: number;
    discountPercent?: number;
  };

  const sales: DemoSale[] = [
    { daysAgo: 12, storeId: storeA, type: "CASH", currency: "IQD", productSku: "CHS-500", unitRatio: 24, qty: 2 },
    { daysAgo: 11, storeId: storeB, type: "DEBT", currency: "IQD", productSku: "TEA-400", unitRatio: 24, qty: 3 },
    { daysAgo: 10, storeId: storeA, type: "CASH", currency: "USD", productSku: "OIL-1L", unitRatio: 6, qty: 4 },
    { daysAgo: 9, storeId: storeB, type: "CASH", currency: "IQD", productSku: "CHS-500", unitRatio: 6, qty: 5 },
    { daysAgo: 8, storeId: storeA, type: "DEBT", currency: "IQD", productSku: "OIL-1L", unitRatio: 24, qty: 1 },
    { daysAgo: 6, storeId: storeB, type: "CASH", currency: "IQD", productSku: "TEA-400", unitRatio: 6, qty: 8 },
    { daysAgo: 5, storeId: storeA, type: "DEBT", currency: "USD", productSku: "CHS-500", unitRatio: 24, qty: 1 },
    { daysAgo: 4, storeId: storeB, type: "CASH", currency: "IQD", productSku: "OIL-1L", unitRatio: 1, qty: 20 },
    { daysAgo: 3, storeId: storeA, type: "CASH", currency: "IQD", productSku: "CHS-500", unitRatio: 24, qty: 1, discountPercent: 2 },
    { daysAgo: 2, storeId: storeB, type: "DEBT", currency: "IQD", productSku: "TEA-400", unitRatio: 24, qty: 2 },
    { daysAgo: 1, storeId: storeA, type: "CASH", currency: "IQD", productSku: "OIL-1L", unitRatio: 6, qty: 3 },
    { daysAgo: 0, storeId: storeB, type: "CASH", currency: "IQD", productSku: "CHS-500", unitRatio: 1, qty: 12 },
  ];

  for (const sale of sales) {
    const product = products.find((p) => p.sku === sale.productSku);
    if (!product) continue;
    const unit = product.units.find((u) => Number(u.conversionRatio) === sale.unitRatio);
    if (!unit) continue;

    const unitPrice =
      sale.currency === "USD" ? Number(unit.sellingPriceUsd) : Number(unit.sellingPrice);
    const subTotal = unitPrice * sale.qty;
    const discountPercent = sale.discountPercent ?? 0;
    const discountAmount = Math.round((subTotal * discountPercent) / 100);
    const totalAmount = subTotal - discountAmount;
    const baseQty = sale.qty * sale.unitRatio;
    const createdAt = baghdadDateDaysAgo(sale.daysAgo);
    const invoiceNumber = `INV-${String(invoiceSeq).padStart(6, "0")}`;
    invoiceSeq += 1;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        storeId: sale.storeId,
        warehouseId: ids.vanId,
        createdById: delegate.id,
        invoiceType: sale.type,
        status: "COMPLETED",
        currency: sale.currency,
        subTotal,
        discountPercent,
        discountAmount,
        totalAmount,
        paidAmount: sale.type === "CASH" ? totalAmount : 0,
        debtAmount: sale.type === "DEBT" ? totalAmount : 0,
        createdAt,
        items: {
          create: [
            {
              productId: product.id,
              productUnitId: unit.id,
              quantity: sale.qty,
              baseUnitQuantity: baseQty,
              unitPrice,
              discountPercent: 0,
              totalPrice: subTotal,
              isGift: false,
            },
          ],
        },
      },
    });

    await prisma.stockMovement.create({
      data: {
        warehouseId: ids.vanId,
        productId: product.id,
        productUnitId: unit.id,
        recordedById: delegate.id,
        type: "SALE",
        quantity: sale.qty,
        baseQuantity: baseQty,
        notes: invoiceNumber,
        createdAt,
      },
    });

    await prisma.stockInventory.update({
      where: {
        warehouseId_productId: { warehouseId: ids.vanId, productId: product.id },
      },
      data: { baseQty: { decrement: baseQty } },
    });

    if (sale.type === "CASH") {
      const receiptNumber = `TRX-${String(receiptSeq).padStart(6, "0")}`;
      receiptSeq += 1;
      await prisma.transaction.create({
        data: {
          receiptNumber,
          storeId: sale.storeId,
          invoiceId: invoice.id,
          recordedById: delegate.id,
          type: "SALE_PAYMENT",
          amount: totalAmount,
          paymentMethod: "CASH",
          currency: sale.currency,
          notes: invoiceNumber,
          createdAt,
        },
      });
    }
  }

  // Collections against Al-Amal IQD debt only
  const storeADebt = await debtForStore(storeA, "IQD");
  const collectAmount = Math.min(40_000, Math.floor(storeADebt / 2) || 0);
  if (collectAmount > 0) {
    const createdAt = baghdadDateDaysAgo(2);
    const receiptNumber = `TRX-${String(receiptSeq).padStart(6, "0")}`;
    receiptSeq += 1;
    await prisma.transaction.create({
      data: {
        receiptNumber,
        storeId: storeA,
        recordedById: collector.id,
        type: "COLLECTION",
        amount: collectAmount,
        paymentMethod: "CASH",
        currency: "IQD",
        notes: "Demo collection",
        createdAt,
      },
    });
  }

  await prisma.store.update({
    where: { id: storeA },
    data: {
      currentDebt: await debtForStore(storeA, "IQD"),
      currentDebtUsd: await debtForStore(storeA, "USD"),
    },
  });
  await prisma.store.update({
    where: { id: storeB },
    data: {
      currentDebt: await debtForStore(storeB, "IQD"),
      currentDebtUsd: await debtForStore(storeB, "USD"),
    },
  });

  console.log("Seeded demo invoices, collections, and van movements.");
}

async function debtForStore(storeId: string, currency: "IQD" | "USD") {
  const invoices = await prisma.invoice.aggregate({
    where: { storeId, currency, invoiceType: "DEBT", status: "COMPLETED" },
    _sum: { debtAmount: true },
  });
  const collections = await prisma.transaction.aggregate({
    where: { storeId, currency, type: "COLLECTION" },
    _sum: { amount: true },
  });
  const debt = Number(invoices._sum.debtAmount ?? 0) - Number(collections._sum.amount ?? 0);
  return Math.max(0, debt);
}

/** Baghdad calendar day at 10:00 local (07:00 UTC). */
function baghdadDateDaysAgo(daysAgo: number) {
  const now = new Date();
  const baghdadMs = now.getTime() + 3 * 60 * 60 * 1000;
  const baghdad = new Date(baghdadMs);
  baghdad.setUTCHours(10, 0, 0, 0);
  baghdad.setUTCDate(baghdad.getUTCDate() - daysAgo);
  return new Date(baghdad.getTime() - 3 * 60 * 60 * 1000);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
