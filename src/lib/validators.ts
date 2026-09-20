import { z } from "zod";
import {
  ROLES,
  STOCK_MOVEMENT_TYPES,
  STORE_STATUSES,
  STORE_TIERS,
  TRANSFER_DECISIONS,
  WAREHOUSE_TYPES,
  FIELD_INVOICE_TYPES,
  PAYMENT_METHODS,
  DISCOUNT_RULE_KINDS,
  DISCOUNT_VALUE_TYPES,
  DISCOUNT_SCOPES,
  PURCHASE_ORDER_STATUSES,
  STORE_PLACEMENT_DIRECTIONS,
  EXPENSE_CATEGORIES,
} from "@/lib/constants";
import { CURRENCIES, parseFormattedNumber } from "@/lib/money";

/** Accepts typed values with thousand separators (e.g. "25,000,000"). */
function amountField<T extends z.ZodTypeAny>(schema: T) {
  return z.preprocess((value) => {
    if (typeof value === "string") return parseFormattedNumber(value);
    return value;
  }, schema);
}

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const localizedNameSchema = z.object({
  en: z.string().min(1),
  ar: z.string().min(1),
  ckb: z.string().min(1),
});

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(ROLES),
  maxDiscountAllowed: z.coerce.number().min(0).max(100),
  assignedWarehouseId: z.string().uuid().optional().or(z.literal("")),
});

export const updateUserSchema = z.object({
  id: z.string().uuid(),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  role: z.enum(ROLES),
  maxDiscountAllowed: z.coerce.number().min(0).max(100),
  assignedWarehouseId: z.string().uuid().optional().or(z.literal("")),
  password: z.string().min(8).optional().or(z.literal("")),
});

export const createWarehouseSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  nameCkb: z.string().min(1),
  type: z.enum(WAREHOUSE_TYPES),
  licensePlate: z.string().optional(),
});

export const updateWarehouseSchema = createWarehouseSchema.extend({
  id: z.string().uuid(),
});

export const productUnitInputSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  barcode: z.string().max(64).optional().or(z.literal("")),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  nameCkb: z.string().min(1),
  conversionRatio: amountField(z.coerce.number().positive()),
  sellingPrice: amountField(z.coerce.number().min(0)),
  sellingPriceUsd: amountField(z.coerce.number().min(0)),
  isBaseUnit: z.boolean(),
});

export const productFieldsSchema = z.object({
  sku: z.string().min(1).max(64),
  barcode: z.string().max(64).optional().or(z.literal("")),
  nameEn: z.string().optional().or(z.literal("")),
  nameAr: z.string().optional().or(z.literal("")),
  nameCkb: z.string().optional().or(z.literal("")),
  categoryId: z.string().uuid(),
  subcategoryId: z.string().uuid().optional().or(z.literal("")),
  priceCurrency: z.enum(["IQD", "USD", "BOTH"]),
  baseCost: amountField(z.coerce.number().min(0)),
  shelfLifeDays: z
    .union([z.literal(""), z.coerce.number().int().positive().max(3650)])
    .optional(),
  units: z.array(productUnitInputSchema).min(1),
});

function withAtLeastOneProductName<T extends z.ZodTypeAny>(schema: T) {
  return schema.refine(
    (data: z.infer<typeof productFieldsSchema>) =>
      Boolean(
        data.nameEn?.trim() || data.nameAr?.trim() || data.nameCkb?.trim(),
      ),
    { message: "At least one product name is required", path: ["nameEn"] },
  );
}

export const productInputSchema = withAtLeastOneProductName(productFieldsSchema);

export const updateProductSchema = withAtLeastOneProductName(
  productFieldsSchema.extend({
    id: z.string().uuid(),
  }),
);

export const categoryInputSchema = z.object({
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  nameCkb: z.string().min(1),
});

export const updateCategorySchema = categoryInputSchema.extend({
  id: z.string().uuid(),
});

export const subcategoryInputSchema = z.object({
  categoryId: z.string().uuid(),
  nameEn: z.string().min(1),
  nameAr: z.string().min(1),
  nameCkb: z.string().min(1),
});

export const updateSubcategorySchema = subcategoryInputSchema.extend({
  id: z.string().uuid(),
});

export const stockMovementSchema = z.object({
  warehouseId: z.string().uuid(),
  productId: z.string().uuid(),
  productUnitId: z.string().uuid(),
  type: z.enum(STOCK_MOVEMENT_TYPES),
  quantity: z.coerce.number().positive(),
  notes: z.string().max(500).optional().or(z.literal("")),
  lotCode: z.string().max(64).optional().or(z.literal("")),
  expiryDate: z.string().optional().or(z.literal("")),
});

export const transferLineSchema = z.object({
  productId: z.string().uuid(),
  productUnitId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
});

export const createTransferSchema = z.object({
  sourceId: z.string().uuid(),
  destinationId: z.string().uuid(),
  notes: z.string().max(500).optional().or(z.literal("")),
  lines: z.array(transferLineSchema).min(1),
});

export const decideTransferSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(TRANSFER_DECISIONS),
});

const optionalCoord = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(-90).max(90).optional(),
);

const optionalLng = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.coerce.number().min(-180).max(180).optional(),
);

const optionalEmail = z.preprocess(
  (value) => (value === "" || value == null ? undefined : value),
  z.string().email().max(200).optional(),
);

const storeStatusField = z.preprocess(
  (value) => (value === "" || value == null ? "ACTIVE" : value),
  z.enum(STORE_STATUSES),
);

export const storeContactSchema = z.object({
  storeName: z.string().min(1).max(200),
  ownerName: z.string().max(200).optional().or(z.literal("")),
  phone: z.string().min(3).max(32),
  email: optionalEmail,
  address: z.string().max(400).optional().or(z.literal("")),
  tier: z.enum(STORE_TIERS),
  status: storeStatusField,
  latitude: optionalCoord,
  longitude: optionalLng,
});

export const createStoreSchema = storeContactSchema.extend({
  creditLimit: amountField(z.coerce.number().min(0)),
  creditLimitUsd: amountField(z.coerce.number().min(0)),
});

export const updateStoreSchema = createStoreSchema.extend({
  id: z.string().uuid(),
});

export const updateStoreContactSchema = storeContactSchema.extend({
  id: z.string().uuid(),
});

export const invoiceLineSchema = z
  .object({
    productId: z.string().uuid(),
    productUnitId: z.string().uuid(),
    quantity: z.coerce.number().min(0),
    giftQuantity: z.coerce.number().min(0).optional().default(0),
  })
  .refine((line) => line.quantity > 0 || line.giftQuantity > 0);

export const createInvoiceSchema = z.object({
  storeId: z.string().uuid(),
  invoiceType: z.enum(FIELD_INVOICE_TYPES),
  currency: z.enum(CURRENCIES),
  discountPercent: z.coerce.number().min(0).max(100),
  lines: z.array(invoiceLineSchema).min(1),
});

export const createOfficeInvoiceSchema = createInvoiceSchema.extend({
  warehouseId: z.string().uuid(),
});

export const returnLineSchema = z.object({
  productId: z.string().uuid(),
  productUnitId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
});

export const createReturnSchema = z.object({
  storeId: z.string().uuid(),
  currency: z.enum(CURRENCIES),
  discountPercent: z.coerce.number().min(0).max(100),
  lines: z.array(returnLineSchema).min(1),
});

export const createCollectionSchema = z.object({
  storeId: z.string().uuid(),
  currency: z.enum(CURRENCIES),
  amount: amountField(z.coerce.number().positive()),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(500).optional().or(z.literal("")),
});

const optionalUuidList = z
  .union([z.array(z.string().uuid()), z.string()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return [] as string[];
    if (Array.isArray(value)) return value;
    return value
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter(Boolean);
  })
  .pipe(z.array(z.string().uuid()));

const optionalTierList = z
  .union([z.array(z.enum(STORE_TIERS)), z.string()])
  .optional()
  .transform((value) => {
    if (value == null || value === "") return [] as (typeof STORE_TIERS)[number][];
    if (Array.isArray(value)) return value;
    return value
      .split(/[\s,]+/)
      .map((part) => part.trim())
      .filter(Boolean) as (typeof STORE_TIERS)[number][];
  })
  .pipe(z.array(z.enum(STORE_TIERS)));

export const discountRuleInputSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(DISCOUNT_RULE_KINDS),
    scope: z.enum(DISCOUNT_SCOPES).default("INVOICE"),
    valueType: z.enum(DISCOUNT_VALUE_TYPES).default("PERCENT"),
    amount: amountField(z.coerce.number().positive()),
    currency: z.enum(CURRENCIES).optional().or(z.literal("")),
    storeTiers: optionalTierList,
    productIds: optionalUuidList,
    categoryIds: optionalUuidList,
    startsAt: z.string().optional().or(z.literal("")),
    endsAt: z.string().optional().or(z.literal("")),
    priority: z.coerce.number().int().min(0).max(9999).default(100),
    active: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((value) => {
        if (value === false || value === "false" || value === "0") return false;
        if (value === undefined) return true;
        return true;
      }),
    stackWithGift: z
      .union([z.boolean(), z.string()])
      .optional()
      .transform((value) => value === true || value === "true" || value === "on" || value === "1"),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "PERCENT" || data.kind === "TIER_PRICE") {
      if (data.amount > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["amount"],
          message: "Percent must be <= 100",
        });
      }
    }
    if (data.kind === "SPECIAL" && data.valueType === "PERCENT" && data.amount > 100) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["amount"],
        message: "Percent must be <= 100",
      });
    }
    if (data.kind === "TIER_PRICE" && data.storeTiers.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["storeTiers"],
        message: "Tier price rules need at least one store tier",
      });
    }
  });

export const updateDiscountRuleSchema = discountRuleInputSchema.and(
  z.object({ id: z.string().uuid() }),
);

export const supplierInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  phone: z.string().max(32).optional().or(z.literal("")),
  email: optionalEmail,
  address: z.string().max(400).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  active: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => {
      if (value === false || value === "false" || value === "0") return false;
      if (value === undefined) return true;
      return true;
    }),
});

export const updateSupplierSchema = supplierInputSchema.extend({
  id: z.string().uuid(),
});

export const purchaseLineSchema = z.object({
  productId: z.string().uuid(),
  productUnitId: z.string().uuid(),
  quantity: amountField(z.coerce.number().positive()),
  unitCost: amountField(z.coerce.number().min(0)),
  currency: z.enum(CURRENCIES).default("IQD"),
  expiryDate: z.string().optional().or(z.literal("")),
  lotCode: z.string().max(64).optional().or(z.literal("")),
});

/** Optional money field — empty string / missing → undefined. */
function optionalAmountField() {
  return z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    if (typeof value === "string") return parseFormattedNumber(value);
    return value;
  }, z.coerce.number().min(0).optional());
}

export const createPurchaseSchema = z.object({
  supplierId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  currency: z.enum(CURRENCIES).default("IQD"),
  notes: z.string().max(500).optional().or(z.literal("")),
  /** Optional freight / side-cost posted as PURCHASE_FREIGHT expense when received. */
  freightAmount: optionalAmountField(),
  freightCurrency: z.enum(CURRENCIES).optional().or(z.literal("")),
  receiveNow: z
    .union([z.boolean(), z.string()])
    .optional()
    .transform((value) => value === true || value === "true" || value === "on" || value === "1"),
  lines: z.array(purchaseLineSchema).min(1),
});

export const receivePurchaseSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().max(500).optional().or(z.literal("")),
  freightAmount: optionalAmountField(),
  freightCurrency: z.enum(CURRENCIES).optional().or(z.literal("")),
});

export const expenseInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  category: z.enum(EXPENSE_CATEGORIES),
  amount: amountField(z.coerce.number().positive()),
  currency: z.enum(CURRENCIES).default("IQD"),
  note: z.string().max(500).optional().or(z.literal("")),
  productId: z.string().uuid().optional().or(z.literal("")),
  warehouseId: z.string().uuid().optional().or(z.literal("")),
  storeId: z.string().uuid().optional().or(z.literal("")),
  stockLotId: z.string().uuid().optional().or(z.literal("")),
});

export const updateExpenseSchema = expenseInputSchema.extend({
  id: z.string().uuid(),
});

export const cancelPurchaseSchema = z.object({
  id: z.string().uuid(),
});

export const storePlacementLineSchema = z.object({
  productId: z.string().uuid(),
  productUnitId: z.string().uuid(),
  quantity: z.coerce.number().positive(),
  expiryDate: z.string().optional().or(z.literal("")),
  lotCode: z.string().max(64).optional().or(z.literal("")),
});

export const createStorePlacementSchema = z.object({
  storeId: z.string().uuid(),
  warehouseId: z.string().uuid(),
  direction: z.enum(STORE_PLACEMENT_DIRECTIONS),
  notes: z.string().max(500).optional().or(z.literal("")),
  lines: z.array(storePlacementLineSchema).min(1),
});

export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

export { localizedNameSchema };
