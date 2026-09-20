"use client";

import { useMemo, useState } from "react";
import {
  Gift,
  LayoutGrid,
  List,
  Minus,
  Percent,
  Plus,
  Search,
  ShoppingCart,
  Store,
  Trash2,
  Warehouse,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/thumb";
import { canSellOnDebt, creditStatus, remainingCredit } from "@/lib/credit";
import {
  resolveDiscounts,
  type DiscountRuleSnapshot,
} from "@/lib/discount-engine";
import {
  InvoiceError,
  lineBaseQuantity,
  pickUnitPrice,
} from "@/lib/invoice";
import { CURRENCIES, formatMoney, ledgerAmounts, type CurrencyCode } from "@/lib/money";
import {
  productMatchesBarcodeQuery,
  resolveProductBarcode,
} from "@/lib/barcode-resolve";

export type InvoiceWarehouseOption = {
  id: string;
  label: string;
};

export type InvoiceStoreOption = {
  id: string;
  storeName: string;
  phone: string;
  address: string | null;
  thumbUrl: string | null;
  tier: string;
  creditLimit: string;
  currentDebt: string;
  creditLimitUsd: string;
  currentDebtUsd: string;
};

export type InvoiceProductOption = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  categoryId: string;
  thumbUrl: string | null;
  baseQty: string;
  customPrice: string | null;
  customPriceUsd: string | null;
  units: {
    id: string;
    name: string;
    barcode: string | null;
    conversionRatio: string;
    sellingPrice: string;
    sellingPriceUsd: string;
  }[];
};

type Line = {
  productId: string;
  productUnitId: string;
  quantity: string;
  giftQuantity: string;
};

type StockFilter = "inStock" | "all";
type CatalogView = "grid" | "list";

function preferredUnitId(product: InvoiceProductOption | undefined) {
  if (!product?.units.length) return "";
  return [...product.units].sort(
    (a, b) => Number(b.conversionRatio) - Number(a.conversionRatio),
  )[0].id;
}

function chipClass(active: boolean) {
  return `chip ${active ? "chip-on" : "chip-off"}`;
}

function bumpQty(value: string, delta: number) {
  const next = Math.max(0, (Number(value) || 0) + delta);
  if (Number.isInteger(next)) return String(next);
  return String(Math.round(next * 100) / 100);
}

function creditTone(status: ReturnType<typeof creditStatus>) {
  if (status === "blocked") {
    return "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200";
  }
  if (status === "warn") {
    return "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-100";
  }
  return "bg-judi-50 text-judi-900 dark:bg-judi-950/40 dark:text-judi-100";
}

export function InvoiceForm({
  stores,
  products,
  maxDiscount,
  discountRules,
  initialStoreId,
  action,
  surface = "field",
  warehouseId,
  warehouses,
  onWarehouseChange,
  warehouseLabel,
}: {
  stores: InvoiceStoreOption[];
  products: InvoiceProductOption[];
  maxDiscount: string;
  discountRules: DiscountRuleSnapshot[];
  initialStoreId?: string | null;
  action: (formData: FormData) => Promise<void>;
  surface?: "field" | "office";
  warehouseId?: string;
  warehouses?: InvoiceWarehouseOption[];
  onWarehouseChange?: (warehouseId: string) => void;
  warehouseLabel?: string | null;
}) {
  const t = useTranslations();
  const isOffice = surface === "office";
  const [storeId, setStoreId] = useState(() => {
    if (initialStoreId && stores.some((store) => store.id === initialStoreId)) {
      return initialStoreId;
    }
    return stores[0]?.id ?? "";
  });
  const [storeQuery, setStoreQuery] = useState("");
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<StockFilter>("inStock");
  const [catalogView, setCatalogView] = useState<CatalogView>("grid");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [invoiceType, setInvoiceType] = useState<"CASH" | "DEBT">("CASH");
  const [currency, setCurrency] = useState<CurrencyCode>("IQD");
  const [lines, setLines] = useState<Line[]>([]);
  const stickyClass = isOffice
    ? "sticky-form-actions"
    : "sticky-form-actions sticky-form-actions-field";
  const catalogTitle = isOffice
    ? t("invoices.catalogTitleOffice")
    : t("invoices.catalogTitle");
  const giftHint = isOffice
    ? t("invoices.giftQuantityHintOffice")
    : t("invoices.giftQuantityHint");
  const stockShortLabel = isOffice
    ? t("invoices.insufficientOffice")
    : t("invoices.insufficient");

  const store = stores.find((item) => item.id === storeId) ?? stores[0];
  const ledger = store ? ledgerAmounts(store, currency) : null;
  const remaining = ledger ? remainingCredit(ledger.limit, ledger.debt) : null;
  const status = ledger ? creditStatus(ledger.limit, ledger.debt) : "ok";

  const storeMatches = useMemo(() => {
    const needle = storeQuery.trim().toLowerCase();
    const matches = needle
      ? stores.filter(
          (item) =>
            item.storeName.toLowerCase().includes(needle) ||
            item.phone.includes(needle),
        )
      : stores;
    const selected = stores.find((item) => item.id === storeId);
    const list = matches.slice(0, 12);
    if (selected && !list.some((item) => item.id === selected.id)) {
      return [selected, ...list.slice(0, 11)];
    }
    return list;
  }, [storeId, storeQuery, stores]);

  const productMatches = useMemo(() => {
    const needle = lookup.trim().toLowerCase();
    return products.filter((product) => {
      if (stockFilter === "inStock" && Number(product.baseQty) <= 0) return false;
      if (!needle) return true;
      return productMatchesBarcodeQuery(product, needle);
    });
  }, [lookup, products, stockFilter]);

  const pricedLines = useMemo(() => {
    return lines.flatMap((line, index) => {
      const product = products.find((item) => item.id === line.productId);
      const unit = product?.units.find((item) => item.id === line.productUnitId);
      if (!product || !unit) return [];
      const sold = Number(line.quantity) || 0;
      const gift = Number(line.giftQuantity) || 0;
      if (sold <= 0 && gift <= 0) return [];
      try {
        const listUnitPrice = pickUnitPrice(unit, product, currency);
        const soldBase =
          sold > 0 ? Number(lineBaseQuantity(line.quantity, unit.conversionRatio).toString()) : 0;
        const giftBase =
          gift > 0
            ? Number(lineBaseQuantity(line.giftQuantity, unit.conversionRatio).toString())
            : 0;
        return [
          {
            index,
            line,
            product,
            unit,
            listUnitPrice,
            base: soldBase + giftBase,
            gift,
          },
        ];
      } catch {
        return [];
      }
    });
  }, [currency, lines, products]);

  const discountPreview = useMemo(() => {
    if (!store || pricedLines.length === 0) {
      return {
        lines: [] as ReturnType<typeof resolveDiscounts>["lines"],
        chips: [] as ReturnType<typeof resolveDiscounts>["chips"],
        subTotal: "0",
        discountAmount: "0",
        totalAmount: "0",
        error: null as string | null,
      };
    }
    try {
      const resolved = resolveDiscounts({
        rules: discountRules,
        storeTier: store.tier,
        currency,
        lines: pricedLines.map((item) => ({
          productId: item.product.id,
          categoryId: item.product.categoryId,
          productUnitId: item.unit.id,
          quantity: item.line.quantity,
          giftQuantity: item.line.giftQuantity,
          listUnitPrice: item.listUnitPrice.toString(),
        })),
        manualDiscountPercent: discountPercent || "0",
        maxDiscountAllowed: maxDiscount,
      });
      return {
        lines: resolved.lines,
        chips: resolved.chips,
        subTotal: resolved.subTotal.toString(),
        discountAmount: resolved.discountAmount.toString(),
        totalAmount: resolved.totalAmount.toString(),
        error: null as string | null,
      };
    } catch (error) {
      if (error instanceof InvoiceError && error.code === "discount_cap") {
        return {
          lines: [],
          chips: [],
          subTotal: "0",
          discountAmount: "0",
          totalAmount: "0",
          error: t("invoices.discountCap"),
        };
      }
      return {
        lines: [],
        chips: [],
        subTotal: "0",
        discountAmount: "0",
        totalAmount: "0",
        error: t("invoices.invalidDiscount"),
      };
    }
  }, [
    currency,
    discountPercent,
    discountRules,
    maxDiscount,
    pricedLines,
    store,
    t,
  ]);

  const totals = {
    subTotal: discountPreview.subTotal,
    discountAmount: discountPreview.discountAmount,
    totalAmount: discountPreview.totalAmount,
  };
  const discountError = discountPreview.error;
  const promoChips = discountPreview.chips;

  const giftQtyTotal = pricedLines.reduce((sum, item) => {
    const resolved = discountPreview.lines.find(
      (row) =>
        row.productId === item.product.id && row.productUnitId === item.unit.id,
    );
    if (resolved) return sum + Number(resolved.giftQuantity.toString());
    return sum + item.gift;
  }, 0);
  const capExceeded = Number(discountPercent || "0") > Number(maxDiscount);
  const debtAllowed = ledger
    ? canSellOnDebt(ledger.limit, ledger.debt, totals.totalAmount)
    : false;
  const hasCreditLine = ledger ? Number(ledger.limit) > 0 : false;
  const stockBlocked = products.some((product) => {
    const needed = pricedLines
      .filter((item) => item.product.id === product.id)
      .reduce((sum, item) => {
        const resolved = discountPreview.lines.find(
          (row) =>
            row.productId === item.product.id && row.productUnitId === item.unit.id,
        );
        if (resolved) {
          const soldBase =
            Number(resolved.quantity.toString()) > 0
              ? Number(
                  lineBaseQuantity(
                    resolved.quantity.toString(),
                    item.unit.conversionRatio,
                  ).toString(),
                )
              : 0;
          const giftBase =
            Number(resolved.giftQuantity.toString()) > 0
              ? Number(
                  lineBaseQuantity(
                    resolved.giftQuantity.toString(),
                    item.unit.conversionRatio,
                  ).toString(),
                )
              : 0;
          return sum + soldBase + giftBase;
        }
        return sum + item.base;
      }, 0);
    return needed > Number(product.baseQty);
  });

  const canSubmit =
    Boolean(storeId) &&
    (!isOffice || Boolean(warehouseId)) &&
    pricedLines.length > 0 &&
    !stockBlocked &&
    !capExceeded &&
    !discountError &&
    (invoiceType === "CASH" || debtAllowed);

  function addProduct(product: InvoiceProductOption, unitId?: string) {
    const resolvedUnitId = unitId || preferredUnitId(product);
    setLines((current) => {
      const existing = current.findIndex(
        (line) =>
          line.productId === product.id && line.productUnitId === resolvedUnitId,
      );
      if (existing >= 0) {
        return current.map((line, index) =>
          index === existing
            ? { ...line, quantity: bumpQty(line.quantity || "0", 1) }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          productUnitId: resolvedUnitId,
          quantity: "1",
          giftQuantity: "0",
        },
      ];
    });
  }

  function lookupProduct() {
    const needle = lookup.trim();
    if (!needle) return;
    const hit = resolveProductBarcode(products, needle, {
      fallbackUnit: "largest",
    });
    if (hit) {
      const product = products.find((item) => item.id === hit.productId);
      if (product) {
        setLookupError(null);
        setLookup("");
        addProduct(product, hit.productUnitId);
        return;
      }
    }
    const named = products.filter(
      (product) => product.name.toLowerCase() === needle.toLowerCase(),
    );
    if (named.length === 1 && named[0]) {
      setLookupError(null);
      setLookup("");
      addProduct(named[0]);
      return;
    }
    if (productMatches.length === 0) {
      setLookupError(t("invoices.notFound"));
      return;
    }
    setLookupError(null);
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.productId) {
          const product = products.find((item) => item.id === patch.productId);
          next.productUnitId = preferredUnitId(product);
        }
        return next;
      }),
    );
  }

  function chooseCurrency(next: CurrencyCode) {
    setCurrency(next);
    const nextLedger = store ? ledgerAmounts(store, next) : null;
    if (invoiceType === "DEBT" && (!nextLedger || Number(nextLedger.limit) <= 0)) {
      setInvoiceType("CASH");
    }
  }

  const payload = lines
    .filter((line) => (Number(line.quantity) || 0) > 0 || (Number(line.giftQuantity) || 0) > 0)
    .map((line) => ({
      productId: line.productId,
      productUnitId: line.productUnitId,
      quantity: Number(line.quantity) || 0,
      giftQuantity: Number(line.giftQuantity) || 0,
    }));

  return (
    <form action={action} className={`space-y-4 lg:pb-4 ${isOffice ? "pb-24" : "pb-28"}`}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="invoiceType" value={invoiceType} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="discountPercent" value={discountPercent} />
      <input type="hidden" name="linesJson" value={JSON.stringify(payload)} />
      {warehouseId ? (
        <input type="hidden" name="warehouseId" value={warehouseId} />
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
        <div className="space-y-4">
          {isOffice ? (
            <section className="surface-panel space-y-3 p-3 sm:p-4">
              <div className="flex items-center gap-2 text-start">
                <Warehouse
                  className="size-5 shrink-0 text-judi-700 dark:text-judi-300"
                  aria-hidden
                />
                <h2 className="text-sm font-semibold text-fg">
                  {t("invoices.warehouse")}
                </h2>
              </div>
              {warehouses && warehouses.length > 0 && onWarehouseChange ? (
                <label className="block space-y-1.5 text-start">
                  <span className="text-sm font-medium text-fg">
                    {t("invoices.stockSource")}
                  </span>
                  <select
                    value={warehouseId ?? ""}
                    onChange={(event) => onWarehouseChange(event.target.value)}
                    className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-start text-fg"
                  >
                    {warehouses.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="rounded-xl border border-line bg-muted/40 px-3 py-3 text-sm text-fg">
                  <span className="text-fg-muted">{t("invoices.warehouse")}: </span>
                  <span className="font-semibold">{warehouseLabel ?? "—"}</span>
                </p>
              )}
              <p className="text-sm text-fg-muted">{t("invoices.createOfficeHint")}</p>
            </section>
          ) : null}

          <section className="surface-panel space-y-3 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-start">
              <Store className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
              <h2 className="text-sm font-semibold text-fg">{t("invoices.store")}</h2>
            </div>
            <label className="block space-y-1.5 text-start">
              <span className="flex items-center gap-2 text-sm font-medium text-fg">
                <Search className="size-4 text-judi-700 dark:text-judi-400" aria-hidden />
                {t("invoices.store")}
              </span>
              <input
                type="search"
                value={storeQuery}
                onChange={(event) => setStoreQuery(event.target.value)}
                placeholder={t("invoices.storeSearchPlaceholder")}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-start text-fg"
              />
            </label>
            {storeMatches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-4 text-center text-sm text-fg-muted">
                {t("invoices.noStoreMatches")}
              </p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2" role="list">
                {storeMatches.map((item) => {
                  const selected = item.id === storeId;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => setStoreId(item.id)}
                        className={`flex min-h-touch w-full items-center gap-3 rounded-xl border px-3 py-2 text-start ${
                          selected
                            ? "border-judi-600 bg-judi-50 ring-2 ring-judi-600/40 dark:border-judi-400 dark:bg-judi-950/40"
                            : "border-line bg-muted/30 hover:bg-muted"
                        }`}
                      >
                        <Thumb kind="store" size="sm" src={item.thumbUrl} alt="" />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-fg">
                            {item.storeName}
                          </span>
                          <span className="block truncate text-sm tabular-nums text-fg-muted">
                            {item.phone}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {store ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-muted/40 p-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Thumb kind="store" size="md" src={store.thumbUrl} alt="" />
                  <div className="min-w-0 text-start">
                    <p className="truncate font-semibold text-fg">{store.storeName}</p>
                    <p className="text-sm text-fg-muted">
                      {t("stores.remaining")}:{" "}
                      <span className="tabular-nums">
                        {remaining
                          ? formatMoney(remaining, currency)
                          : formatMoney(0, currency)}
                      </span>
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex min-h-touch items-center rounded-xl px-3 text-sm font-semibold ${creditTone(status)}`}
                >
                  {t(`stores.status.${status}`)}
                </span>
              </div>
            ) : null}
          </section>

          <section className="surface-panel space-y-3 p-3 sm:p-4">
            <fieldset className="space-y-2 text-start">
              <legend className="text-sm font-medium text-fg">{t("invoices.currency")}</legend>
              <div className="chip-scroll">
                {CURRENCIES.map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => chooseCurrency(code)}
                    className={chipClass(currency === code)}
                  >
                    {t(`invoices.currencies.${code}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset className="space-y-2 text-start">
              <legend className="text-sm font-medium text-fg">{t("invoices.type")}</legend>
              <div className="chip-scroll">
                <button
                  type="button"
                  onClick={() => setInvoiceType("CASH")}
                  className={chipClass(invoiceType === "CASH")}
                >
                  {t("invoices.types.CASH")}
                </button>
                <button
                  type="button"
                  onClick={() => setInvoiceType("DEBT")}
                  disabled={!hasCreditLine}
                  className={`${chipClass(invoiceType === "DEBT")} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  {t("invoices.types.DEBT")}
                </button>
              </div>
            </fieldset>
          </section>

          <section className="surface-panel space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-start">
                <Search className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
                <h2 className="text-sm font-semibold text-fg">{catalogTitle}</h2>
              </div>
              <div
                role="group"
                aria-label={t("stores.viewMode")}
                className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
              >
                <button
                  type="button"
                  aria-pressed={catalogView === "grid"}
                  aria-label={t("stores.viewGrid")}
                  onClick={() => setCatalogView("grid")}
                  className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 ${
                    catalogView === "grid"
                      ? "seg-on"
                      : "text-fg-muted hover:bg-muted"
                  }`}
                >
                  <LayoutGrid className="size-4" aria-hidden />
                </button>
                <button
                  type="button"
                  aria-pressed={catalogView === "list"}
                  aria-label={t("stores.viewList")}
                  onClick={() => setCatalogView("list")}
                  className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 ${
                    catalogView === "list"
                      ? "seg-on"
                      : "text-fg-muted hover:bg-muted"
                  }`}
                >
                  <List className="size-4" aria-hidden />
                </button>
              </div>
            </div>
            <label className="block space-y-1.5 text-start">
              <span className="text-sm font-medium text-fg">{t("invoices.product")}</span>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={lookup}
                  onChange={(event) => {
                    setLookup(event.target.value);
                    setLookupError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      lookupProduct();
                    }
                  }}
                  placeholder={t("invoices.productSearchPlaceholder")}
                  className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-4 text-base text-fg"
                />
                <button
                  type="button"
                  onClick={lookupProduct}
                  className="btn btn-info"
                >
                  {t("invoices.add")}
                </button>
              </div>
            </label>
            <fieldset className="space-y-2 text-start">
              <legend className="text-sm font-medium text-fg">{t("invoices.stockFilter")}</legend>
              <div className="chip-scroll">
                <button
                  type="button"
                  onClick={() => setStockFilter("inStock")}
                  className={chipClass(stockFilter === "inStock")}
                >
                  {t("invoices.inStock")}
                </button>
                <button
                  type="button"
                  onClick={() => setStockFilter("all")}
                  className={chipClass(stockFilter === "all")}
                >
                  {t("invoices.allProducts")}
                </button>
              </div>
            </fieldset>
            {lookupError ? (
              <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                {lookupError}
              </p>
            ) : null}
            {productMatches.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-6 text-center text-sm text-fg-muted">
                {t("invoices.noProductMatches")}
              </p>
            ) : catalogView === "grid" ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
                {productMatches.slice(0, 48).map((product) => {
                  const unit = product.units.find((item) => item.id === preferredUnitId(product));
                  const price = unit
                    ? formatMoney(
                        currency === "USD" ? unit.sellingPriceUsd : unit.sellingPrice,
                        currency,
                      )
                    : formatMoney(0, currency);
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex min-h-touch w-full flex-col items-start gap-2 rounded-xl border border-line bg-muted/30 p-2.5 text-start hover:bg-muted"
                      >
                        <Thumb kind="product" size="md" src={product.thumbUrl} alt="" />
                        <span className="min-w-0">
                          <span className="line-clamp-2 font-semibold text-fg">{product.name}</span>
                          <span className="mt-0.5 block text-xs tabular-nums text-fg-subtle">
                            {product.sku}
                          </span>
                          <span className="mt-1 block text-sm font-semibold tabular-nums text-judi-800 dark:text-judi-200">
                            {price}
                          </span>
                          <span className="block text-xs text-fg-muted">
                            {t("stock.onHand")}:{" "}
                            <span className="tabular-nums">{product.baseQty}</span>
                          </span>
                        </span>
                        <span className="text-xs font-medium text-judi-700 dark:text-judi-300">
                          {t("invoices.addToCart")}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <ul className="space-y-2">
                {productMatches.slice(0, 48).map((product) => {
                  const unit = product.units.find((item) => item.id === preferredUnitId(product));
                  const price = unit
                    ? formatMoney(
                        currency === "USD" ? unit.sellingPriceUsd : unit.sellingPrice,
                        currency,
                      )
                    : formatMoney(0, currency);
                  return (
                    <li key={product.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(product)}
                        className="flex min-h-touch w-full items-center gap-3 rounded-xl border border-line bg-muted/30 px-3 py-2 text-start hover:bg-muted"
                      >
                        <Thumb kind="product" size="sm" src={product.thumbUrl} alt="" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-fg">{product.name}</span>
                          <span className="block text-xs tabular-nums text-fg-subtle">
                            {product.sku} · {t("stock.onHand")}:{" "}
                            <span className="tabular-nums">{product.baseQty}</span>
                          </span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-judi-800 dark:text-judi-200">
                          {price}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <section className="surface-panel space-y-3 p-3 sm:p-4">
            <div className="flex items-center gap-2 text-start">
              <ShoppingCart
                className="size-5 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <h2 className="text-sm font-semibold text-fg">{t("invoices.cartTitle")}</h2>
            </div>
            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-6 text-center text-sm text-fg-muted">
                {t("invoices.emptyCart")}
              </p>
            ) : (
              <ul className="space-y-3">
                {lines.map((line, index) => {
                  const product = products.find((item) => item.id === line.productId);
                  const units = product?.units ?? [];
                  const resolved = discountPreview.lines.find(
                    (row) =>
                      row.productId === line.productId &&
                      row.productUnitId === line.productUnitId,
                  );
                  const suggestedGift = resolved
                    ? Number(resolved.suggestedGiftQuantity.toString())
                    : 0;
                  return (
                    <li
                      key={`${index}-${line.productId}`}
                      className="space-y-3 rounded-xl border border-line bg-muted/30 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <Thumb kind="product" size="md" src={product?.thumbUrl} alt="" />
                        <div className="min-w-0 flex-1 text-start">
                          <p className="font-semibold text-fg">{product?.name}</p>
                          <p className="text-sm tabular-nums text-fg-subtle">{product?.sku}</p>
                          <p className="mt-1 text-sm text-fg-muted">
                            {t("stock.onHand")}:{" "}
                            <span className="tabular-nums">{product?.baseQty ?? "0"}</span>
                          </p>
                          {resolved &&
                          Number(resolved.unitPrice.toString()) !==
                            Number(resolved.listUnitPrice.toString()) ? (
                            <p className="mt-1 text-xs text-judi-800 dark:text-judi-200">
                              {formatMoney(resolved.listUnitPrice, currency)} →{" "}
                              {formatMoney(resolved.unitPrice, currency)}
                            </p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-end text-base font-bold tabular-nums text-fg">
                          {resolved
                            ? formatMoney(resolved.lineNet, currency)
                            : formatMoney(0, currency)}
                        </p>
                      </div>
                      <label className="block text-start">
                        <span className="mb-1 block text-sm font-medium text-fg">
                          {t("invoices.unit")}
                        </span>
                        <select
                          value={line.productUnitId}
                          onChange={(event) =>
                            updateLine(index, { productUnitId: event.target.value })
                          }
                          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
                        >
                          {units.map((unit) => (
                            <option key={unit.id} value={unit.id}>
                              {unit.name} ·{" "}
                              {formatMoney(
                                currency === "USD" ? unit.sellingPriceUsd : unit.sellingPrice,
                                currency,
                              )}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <QtyStepper
                          label={t("invoices.soldQty")}
                          value={line.quantity}
                          onChange={(value) => updateLine(index, { quantity: value })}
                          decreaseLabel={t("invoices.decreaseQty")}
                          increaseLabel={t("invoices.increaseQty")}
                        />
                        <QtyStepper
                          label={t("invoices.giftQuantity")}
                          value={line.giftQuantity}
                          onChange={(value) => updateLine(index, { giftQuantity: value })}
                          decreaseLabel={t("invoices.decreaseQty")}
                          increaseLabel={t("invoices.increaseQty")}
                          hint={
                            suggestedGift > 0
                              ? t("invoices.giftSuggested", { qty: suggestedGift })
                              : giftHint
                          }
                          icon
                        />
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-touch items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300"
                        onClick={() =>
                          setLines((current) => current.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 className="size-4" aria-hidden />
                        {t("invoices.removeLine")}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="surface-panel space-y-3 p-3 sm:p-4">
            {promoChips.length > 0 ? (
              <div className="space-y-2 text-start">
                <p className="text-sm font-medium text-fg">{t("discounts.applied")}</p>
                <div className="flex flex-wrap gap-2">
                  {promoChips.map((chip) => (
                    <span
                      key={chip.ruleId}
                      className="inline-flex min-h-10 items-center rounded-xl bg-judi-100 px-3 text-sm font-medium text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            <label className="block text-start">
              <span className="mb-1 flex items-center gap-2 text-sm font-medium text-fg">
                <Percent className="size-4 text-judi-700 dark:text-judi-300" aria-hidden />
                {t("invoices.discount")} (0–{maxDiscount}%)
              </span>
              <input
                type="number"
                min="0"
                max={maxDiscount}
                step="0.01"
                inputMode="decimal"
                value={discountPercent}
                onChange={(event) => setDiscountPercent(event.target.value)}
                className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
              />
            </label>
            {capExceeded ? (
              <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                {t("invoices.discountCap")}
              </p>
            ) : null}
            {invoiceType === "DEBT" && !debtAllowed && pricedLines.length > 0 ? (
              <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                {t("invoices.creditBlocked")}
              </p>
            ) : null}
            {stockBlocked ? (
              <p className="text-sm text-red-700 dark:text-red-300" role="alert">
                {stockShortLabel}
              </p>
            ) : null}

            <div className="space-y-2 rounded-xl border border-line bg-muted/40 p-3 text-start">
              <TotalsRow
                label={t("invoices.subtotal")}
                value={formatMoney(totals.subTotal, currency)}
              />
              <TotalsRow
                label={t("invoices.discountAmount")}
                value={formatMoney(totals.discountAmount, currency)}
              />
              {giftQtyTotal > 0 ? (
                <p className="flex items-center gap-2 text-sm text-fg-muted">
                  <Gift className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
                  {t("invoices.giftsNote", { count: String(giftQtyTotal) })}
                </p>
              ) : null}
              <TotalsRow
                label={t("invoices.grandTotal")}
                value={formatMoney(totals.totalAmount, currency)}
                emphasize
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`btn ${invoiceType === "DEBT" ? "btn-warning" : "btn-success"} hidden w-full text-lg lg:inline-flex`}
            >
              {invoiceType === "DEBT" ? t("invoices.placeDebt") : t("invoices.placeCash")}
            </button>
          </section>
        </div>
      </div>

      <div className={`${stickyClass} no-print flex flex-col gap-2 lg:hidden`}>
        <div className="flex items-end justify-between gap-3 text-start">
          <div className="min-w-0">
            <p className="text-xs font-medium text-fg-subtle">{t("invoices.grandTotal")}</p>
            <p className="truncate text-lg font-bold tabular-nums text-fg">
              {formatMoney(totals.totalAmount, currency)}
            </p>
          </div>
          <button
            type="submit"
            disabled={!canSubmit}
            className={`btn ${invoiceType === "DEBT" ? "btn-warning" : "btn-success"} min-w-0 flex-1`}
          >
            {invoiceType === "DEBT" ? t("invoices.placeDebt") : t("invoices.placeCash")}
          </button>
        </div>
      </div>
    </form>
  );
}

function QtyStepper({
  label,
  value,
  onChange,
  decreaseLabel,
  increaseLabel,
  hint,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  decreaseLabel: string;
  increaseLabel: string;
  hint?: string;
  icon?: boolean;
}) {
  return (
    <div className="text-start">
      <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-fg">
        {icon ? <Gift className="size-3.5 text-judi-700 dark:text-judi-300" aria-hidden /> : null}
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(bumpQty(value, -1))}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={`${decreaseLabel}: ${label}`}
        >
          <Minus className="size-4" aria-hidden />
        </button>
        <input
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-2 text-center tabular-nums text-fg"
        />
        <button
          type="button"
          onClick={() => onChange(bumpQty(value, 1))}
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={`${increaseLabel}: ${label}`}
        >
          <Plus className="size-4" aria-hidden />
        </button>
      </div>
      {hint ? <p className="mt-1 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

function TotalsRow({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className={`text-sm ${emphasize ? "font-semibold text-fg" : "text-fg-muted"}`}>
        {label}
      </span>
      <span
        className={`tabular-nums ${
          emphasize ? "text-lg font-bold text-fg" : "text-sm font-medium text-fg"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
