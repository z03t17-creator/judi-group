"use client";

import { useMemo, useState } from "react";
import {
  LayoutGrid,
  List,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  Search,
  Store,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/thumb";
import { creditStatus, remainingCredit } from "@/lib/credit";
import { invoiceTotals, lineTotal, pickUnitPrice } from "@/lib/invoice";
import { CURRENCIES, formatMoney, ledgerAmounts, type CurrencyCode } from "@/lib/money";
import {
  productMatchesBarcodeQuery,
  resolveProductBarcode,
} from "@/lib/barcode-resolve";
import { createFieldReturnAction } from "./actions";
import type { InvoiceProductOption, InvoiceStoreOption } from "../invoice/invoice-form";

type Line = {
  productId: string;
  productUnitId: string;
  quantity: string;
};

type ViewMode = "grid" | "list";

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

export function ReturnForm({
  stores,
  products,
  maxDiscount,
  initialStoreId,
}: {
  stores: InvoiceStoreOption[];
  products: InvoiceProductOption[];
  maxDiscount: string;
  initialStoreId?: string | null;
}) {
  const t = useTranslations();
  const [storeId, setStoreId] = useState(() => {
    if (initialStoreId && stores.some((store) => store.id === initialStoreId)) {
      return initialStoreId;
    }
    return stores[0]?.id ?? "";
  });
  const [storeQuery, setStoreQuery] = useState("");
  const [lookup, setLookup] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [catalogView, setCatalogView] = useState<ViewMode>("grid");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [currency, setCurrency] = useState<CurrencyCode>("IQD");
  const [lines, setLines] = useState<Line[]>([]);

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
      if (!needle) return true;
      return productMatchesBarcodeQuery(product, needle);
    });
  }, [lookup, products]);

  const pricedLines = useMemo(() => {
    return lines.flatMap((line, index) => {
      const product = products.find((item) => item.id === line.productId);
      const unit = product?.units.find((item) => item.id === line.productUnitId);
      if (!product || !unit) return [];
      const qty = Number(line.quantity) || 0;
      if (qty <= 0) return [];
      try {
        const unitPrice = pickUnitPrice(unit, product, currency);
        const total = lineTotal(line.quantity, unitPrice);
        return [{ index, line, product, unit, unitPrice, total }];
      } catch {
        return [];
      }
    });
  }, [currency, lines, products]);

  const subTotal = pricedLines.reduce((sum, item) => sum + Number(item.total.toString()), 0);
  let totals = { subTotal: "0", discountAmount: "0", totalAmount: "0" };
  let discountError: string | null = null;
  try {
    const computed = invoiceTotals(subTotal, discountPercent || "0");
    totals = {
      subTotal: computed.subTotal.toString(),
      discountAmount: computed.discountAmount.toString(),
      totalAmount: computed.totalAmount.toString(),
    };
  } catch {
    discountError = t("invoices.invalidDiscount");
  }

  const capExceeded = Number(discountPercent || "0") > Number(maxDiscount);
  const creditApplied = Math.min(Number(ledger?.debt ?? 0), Number(totals.totalAmount));

  const canSubmit =
    Boolean(storeId) && pricedLines.length > 0 && !capExceeded && !discountError;

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

  const payload = lines
    .filter((line) => (Number(line.quantity) || 0) > 0)
    .map((line) => ({
      productId: line.productId,
      productUnitId: line.productUnitId,
      quantity: Number(line.quantity) || 0,
    }));

  return (
    <form action={createFieldReturnAction} className="space-y-4 pb-28 lg:pb-4">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="currency" value={currency} />
      <input type="hidden" name="discountPercent" value={discountPercent} />
      <input type="hidden" name="linesJson" value={JSON.stringify(payload)} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:items-start">
        <div className="space-y-4">
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
                      {t("stores.debtShort")}:{" "}
                      <span className="tabular-nums">
                        {formatMoney(ledger?.debt ?? 0, currency)}
                      </span>
                    </p>
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
                    onClick={() => setCurrency(code)}
                    className={chipClass(currency === code)}
                  >
                    {t(`invoices.currencies.${code}`)}
                  </button>
                ))}
              </div>
            </fieldset>
          </section>

          <section className="surface-panel space-y-3 p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-start">
                <Search className="size-5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
                <h2 className="text-sm font-semibold text-fg">{t("field.returnCatalogTitle")}</h2>
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
                        </span>
                        <span className="text-xs font-medium text-judi-700 dark:text-judi-300">
                          {t("field.addToReturn")}
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
                            {product.sku}
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
              <RotateCcw
                className="size-5 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              <h2 className="text-sm font-semibold text-fg">{t("field.returnCartTitle")}</h2>
            </div>
            {lines.length === 0 ? (
              <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-6 text-center text-sm text-fg-muted">
                {t("field.emptyReturnCart")}
              </p>
            ) : (
              <ul className="space-y-3">
                {lines.map((line, index) => {
                  const product = products.find((item) => item.id === line.productId);
                  const units = product?.units ?? [];
                  const priced = pricedLines.find((item) => item.index === index);
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
                        </div>
                        <p className="shrink-0 text-end text-base font-bold tabular-nums text-fg">
                          {priced ? formatMoney(priced.total, currency) : formatMoney(0, currency)}
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
                      <div className="text-start">
                        <span className="mb-1 block text-sm font-medium text-fg">
                          {t("field.returnQty")}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(index, { quantity: bumpQty(line.quantity, -1) })
                            }
                            className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
                            aria-label={t("invoices.decreaseQty")}
                          >
                            <Minus className="size-4" aria-hidden />
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            inputMode="decimal"
                            value={line.quantity}
                            onChange={(event) =>
                              updateLine(index, { quantity: event.target.value })
                            }
                            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-2 text-center tabular-nums text-fg"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateLine(index, { quantity: bumpQty(line.quantity, 1) })
                            }
                            className="inline-flex size-12 shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
                            aria-label={t("invoices.increaseQty")}
                          >
                            <Plus className="size-4" aria-hidden />
                          </button>
                        </div>
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

            <div className="space-y-2 rounded-xl border border-line bg-muted/40 p-3 text-start">
              <TotalsRow
                label={t("invoices.subtotal")}
                value={formatMoney(totals.subTotal, currency)}
              />
              <TotalsRow
                label={t("invoices.discountAmount")}
                value={formatMoney(totals.discountAmount, currency)}
              />
              <TotalsRow
                label={t("invoices.grandTotal")}
                value={formatMoney(totals.totalAmount, currency)}
                emphasize
              />
              <p className="text-sm text-fg-muted">
                {t("field.returnCreditNote", {
                  amount: formatMoney(creditApplied, currency),
                })}
              </p>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-warning hidden w-full text-lg lg:inline-flex"
            >
              {t("field.submitReturn")}
            </button>
          </section>
        </div>
      </div>

      <div className="sticky-form-actions sticky-form-actions-field no-print flex flex-col gap-2 lg:hidden">
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
            className="btn btn-warning min-w-0 flex-1"
          >
            {t("field.submitReturn")}
          </button>
        </div>
      </div>
    </form>
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
