"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { Camera, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CameraCapture } from "@/components/camera-capture";
import { Thumb } from "@/components/thumb";
import { resolveProductBarcode } from "@/lib/barcode-resolve";
import { toBaseQuantity } from "@/lib/uom";
import { suggestExpiryFromShelfLife } from "@/lib/stock-lot";
import { createPurchaseResult } from "./actions";

export type PurchaseProductOption = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  primaryMediaUrl?: string | null;
  shelfLifeDays?: number | null;
  units: {
    id: string;
    name: string;
    barcode: string | null;
    conversionRatio: string;
    isBaseUnit?: boolean;
  }[];
};

type Line = {
  productId: string;
  productUnitId: string;
  quantity: string;
  unitCost: string;
  currency: "IQD" | "USD";
  lotCode: string;
  expiryDate: string;
};

async function uploadPurchaseProof(entityType: "PurchaseOrder" | "PurchaseReceipt", entityId: string, blob: Blob) {
  const form = new FormData();
  form.set("file", blob, "capture.jpg");
  form.set("kind", "STOCK");
  form.set("entityType", entityType);
  form.set("entityId", entityId);
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload_failed");
}

const fieldClass =
  "h-10 min-h-10 w-full rounded-lg border border-line-strong bg-muted px-2.5 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface";
const labelClass = "text-[11px] font-medium text-fg-muted";

export function PurchaseForm({
  warehouseId,
  warehouseLabel,
  warehouses,
  suppliers,
  products,
  defaultSupplierId,
  defaultCurrency = "IQD",
}: {
  warehouseId: string;
  warehouseLabel: string;
  warehouses?: { id: string; label: string }[];
  suppliers: { id: string; name: string }[];
  products: PurchaseProductOption[];
  defaultSupplierId?: string;
  defaultCurrency?: "IQD" | "USD";
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [supplierId, setSupplierId] = useState(
    defaultSupplierId && suppliers.some((s) => s.id === defaultSupplierId)
      ? defaultSupplierId
      : (suppliers[0]?.id ?? ""),
  );
  const [currency, setCurrency] = useState<"IQD" | "USD">(defaultCurrency);
  const [notes, setNotes] = useState("");
  const [freightAmount, setFreightAmount] = useState("");
  const [freightCurrency, setFreightCurrency] = useState<"IQD" | "USD">(defaultCurrency);
  const [receiveNow, setReceiveNow] = useState(true);
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [proofPreviews, setProofPreviews] = useState<{ url: string; blob: Blob }[]>([]);
  const [showExtras, setShowExtras] = useState(false);
  const [lines, setLines] = useState<Line[]>([
    emptyLine(products, currency),
  ]);

  useEffect(() => {
    if (!suppliers.some((item) => item.id === supplierId)) {
      setSupplierId(suppliers[0]?.id ?? "");
    }
  }, [supplierId, suppliers]);

  useEffect(() => {
    setLines([emptyLine(products, currency)]);
  }, [warehouseId, products]);

  function changeWarehouse(nextId: string) {
    if (nextId === warehouseId) return;
    const params = new URLSearchParams();
    params.set("warehouseId", nextId);
    if (supplierId) params.set("supplierId", supplierId);
    router.replace(`/dashboard/purchases?${params.toString()}`);
    router.refresh();
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.productId) {
          const product = products.find((item) => item.id === patch.productId);
          next.productUnitId = product?.units[0]?.id ?? "";
        }
        return next;
      }),
    );
  }

  function addLine() {
    setLines((current) => [...current, emptyLine(products, currency)]);
  }

  function applyScan() {
    const hit = resolveProductBarcode(products, scanCode, {
      fallbackUnit: "base",
    });
    if (!hit) {
      setScanError(t("purchases.barcodeNotFound"));
      return;
    }
    setLines((current) => {
      const existing = current.findIndex(
        (line) =>
          line.productId === hit.productId &&
          line.productUnitId === hit.productUnitId,
      );
      if (existing >= 0) {
        return current.map((line, index) => {
          if (index !== existing) return line;
          return { ...line, quantity: String((Number(line.quantity) || 0) + 1) };
        });
      }
      const empty = current.findIndex((line) => !line.quantity);
      if (empty >= 0) {
        return current.map((line, index) =>
          index === empty
            ? {
                ...line,
                productId: hit.productId,
                productUnitId: hit.productUnitId,
                quantity: "1",
                currency,
              }
            : line,
        );
      }
      return [
        ...current,
        {
          ...emptyLine(products, currency),
          productId: hit.productId,
          productUnitId: hit.productUnitId,
          quantity: "1",
        },
      ];
    });
    setScanCode("");
    setScanError(null);
  }

  function addProof(blob: Blob) {
    const url = URL.createObjectURL(blob);
    setProofPreviews((prev) => [...prev, { url, blob }]);
    setShowExtras(true);
  }

  function removeProof(index: number) {
    setProofPreviews((prev) => {
      const next = [...prev];
      URL.revokeObjectURL(next[index].url);
      next.splice(index, 1);
      return next;
    });
  }

  const linePreviews = useMemo(() => {
    return lines.map((line) => {
      const product = products.find((item) => item.id === line.productId);
      const unit = product?.units.find((item) => item.id === line.productUnitId);
      if (!product || !unit || !line.quantity) return null;
      try {
        return {
          base: toBaseQuantity(line.quantity, unit.conversionRatio).toString(),
          unitName: unit.name,
        };
      } catch {
        return null;
      }
    });
  }, [lines, products]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!supplierId || !warehouseId) {
      setFormError(t("purchases.needSupplierWarehouse"));
      return;
    }

    const form = new FormData(event.currentTarget);
    form.set("linesJson", JSON.stringify(
      lines.map((line) => ({
        productId: line.productId,
        productUnitId: line.productUnitId,
        quantity: line.quantity,
        unitCost: line.unitCost,
        currency: line.currency,
        lotCode: line.lotCode,
        expiryDate: line.expiryDate,
      })),
    ));
    form.set("receiveNow", receiveNow ? "true" : "false");
    form.set("notes", notes);
    form.set("freightAmount", freightAmount);
    form.set("freightCurrency", freightCurrency);

    startTransition(async () => {
      const result = await createPurchaseResult(form);
      if (!result.ok) {
        setFormError(errorLabel(t, result.error));
        return;
      }

      let uploadFailed = false;
      const entityType = result.receiptId ? "PurchaseReceipt" : "PurchaseOrder";
      const entityId = result.receiptId ?? result.purchaseOrderId;
      for (const proof of proofPreviews) {
        try {
          await uploadPurchaseProof(entityType, entityId, proof.blob);
        } catch {
          uploadFailed = true;
        }
      }

      const params = new URLSearchParams();
      params.set("warehouseId", result.warehouseId);
      params.set("ok", result.received ? "received" : "created");
      params.set("purchaseId", result.purchaseOrderId);
      if (result.receiptId) {
        params.set("receiptId", result.receiptId);
        params.set("focus", "photos");
      }
      if (uploadFailed) params.set("error", "upload_failed");
      router.replace(`/dashboard/purchases?${params.toString()}`);
      router.refresh();
    });
  }

  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-muted/40 px-4 py-8 text-center">
        <ShoppingCart className="mx-auto size-7 text-fg-muted" aria-hidden />
        <p className="mt-2 text-sm font-medium text-fg">{t("purchases.noSuppliers")}</p>
        <p className="mt-1 text-xs text-fg-muted">{t("purchases.noSuppliersHint")}</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-line-strong bg-muted/40 px-4 py-8 text-center">
        <p className="text-sm font-medium text-fg">{t("purchases.noProducts")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="surface-panel space-y-3 p-3">
      <section className="space-y-2">
        <StepHeader n={1} title={t("purchases.stepWhere")} hint={t("purchases.stepWhereHint")} />
        <div className="grid gap-2 sm:grid-cols-3">
          {warehouses && warehouses.length > 0 ? (
            <label className="block space-y-1 text-start">
              <span className={labelClass}>{t("purchases.warehouse")}</span>
              <select
                name="warehouseId"
                value={warehouseId}
                onChange={(event) => changeWarehouse(event.target.value)}
                className={fieldClass}
              >
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <>
              <input type="hidden" name="warehouseId" value={warehouseId} />
              <p className="text-sm text-fg text-start">
                <span className={`${labelClass} block`}>{t("purchases.warehouse")}</span>
                <span className="mt-1 inline-flex h-10 items-center font-medium">{warehouseLabel}</span>
              </p>
            </>
          )}

          <label className="block space-y-1 text-start">
            <span className={labelClass}>{t("purchases.supplier")}</span>
            <select
              name="supplierId"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className={fieldClass}
              required
            >
              {suppliers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1 text-start">
            <span className={labelClass}>{t("purchases.currency")}</span>
            <select
              name="currency"
              value={currency}
              onChange={(event) => {
                const next = event.target.value === "USD" ? "USD" : "IQD";
                setCurrency(next);
                setLines((current) => current.map((line) => ({ ...line, currency: next })));
              }}
              className={fieldClass}
            >
              <option value="IQD">IQD</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-2 border-t border-line pt-3">
        <StepHeader n={2} title={t("purchases.stepLines")} hint={t("purchases.stepLinesHint")} />
        <div className="flex gap-1.5">
          <label className="relative min-w-0 flex-1">
            <span className="sr-only">{t("purchases.scan")}</span>
            <input
              value={scanCode}
              onChange={(event) => setScanCode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applyScan();
                }
              }}
              placeholder={t("purchases.scanPlaceholder")}
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            onClick={applyScan}
            className="inline-flex h-10 min-h-10 shrink-0 items-center rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium"
          >
            {t("purchases.addScan")}
          </button>
        </div>
        {scanError ? <p className="text-xs text-red-700 dark:text-red-300">{scanError}</p> : null}

        <ul className="space-y-2">
          {lines.map((line, index) => {
            const product = products.find((item) => item.id === line.productId);
            const units = product?.units ?? [];
            const preview = linePreviews[index];
            return (
              <li
                key={index}
                className="space-y-1.5 rounded-lg border border-line bg-muted/20 p-2"
              >
                <div className="flex items-center gap-2">
                  <Thumb
                    kind="product"
                    size="xs"
                    src={product?.primaryMediaUrl}
                    alt={product?.name ?? ""}
                  />
                  <label className="min-w-0 flex-1 space-y-1 text-start">
                    <span className="sr-only">{t("purchases.product")}</span>
                    <select
                      value={line.productId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        const next = products.find((item) => item.id === nextId);
                        updateLine(index, {
                          productId: nextId,
                          productUnitId: next?.units[0]?.id ?? "",
                          expiryDate:
                            line.expiryDate ||
                            suggestExpiryFromShelfLife(next?.shelfLifeDays) ||
                            "",
                        });
                      }}
                      className={fieldClass}
                      required
                    >
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku} — {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) => current.filter((_, i) => i !== index))
                      }
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted hover:bg-muted"
                      aria-label={t("purchases.removeLine")}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  ) : null}
                </div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                  <label className="block space-y-1 text-start">
                    <span className={labelClass}>{t("purchases.unit")}</span>
                    <select
                      value={line.productUnitId}
                      onChange={(event) =>
                        updateLine(index, { productUnitId: event.target.value })
                      }
                      className={fieldClass}
                      required
                    >
                      {units.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-start">
                    <span className={labelClass}>{t("purchases.quantity")}</span>
                    <input
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                      inputMode="decimal"
                      required
                      className={fieldClass}
                    />
                  </label>
                  <label className="block space-y-1 text-start">
                    <span className={labelClass}>{t("purchases.unitCost")}</span>
                    <input
                      value={line.unitCost}
                      onChange={(event) => updateLine(index, { unitCost: event.target.value })}
                      inputMode="decimal"
                      required
                      className={fieldClass}
                    />
                  </label>
                  <label className="block space-y-1 text-start">
                    <span className={labelClass}>{t("purchases.lineCurrency")}</span>
                    <select
                      value={line.currency}
                      onChange={(event) =>
                        updateLine(index, {
                          currency: event.target.value === "USD" ? "USD" : "IQD",
                        })
                      }
                      className={fieldClass}
                    >
                      <option value="IQD">IQD</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  <label className="block space-y-1 text-start">
                    <span className={labelClass}>{t("purchases.lotCode")}</span>
                    <input
                      value={line.lotCode}
                      onChange={(event) => updateLine(index, { lotCode: event.target.value })}
                      className={fieldClass}
                      placeholder={t("purchases.lotCodePlaceholder")}
                    />
                  </label>
                  <label className="block space-y-1 text-start sm:col-span-2">
                    <span className={labelClass}>{t("purchases.expiryDate")}</span>
                    <input
                      type="date"
                      value={line.expiryDate}
                      onChange={(event) => updateLine(index, { expiryDate: event.target.value })}
                      className={fieldClass}
                    />
                  </label>
                </div>
                {preview ? (
                  <p className="text-[11px] text-fg-muted text-start">
                    {t("purchases.basePreview", {
                      qty: preview.base,
                      unit: preview.unitName,
                    })}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={addLine}
          className="inline-flex h-10 min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-muted px-3 text-sm font-medium text-fg hover:bg-surface"
        >
          <Plus className="size-4" aria-hidden />
          {t("purchases.addLine")}
        </button>
      </section>

      <section className="space-y-2 border-t border-line pt-3">
        <StepHeader n={3} title={t("purchases.stepFinish")} hint={t("purchases.stepFinishHint")} />
        <label className="flex min-h-10 items-center gap-2.5 rounded-lg border border-line bg-muted/30 px-2.5 text-start">
          <input
            type="checkbox"
            checked={receiveNow}
            onChange={(event) => setReceiveNow(event.target.checked)}
            className="size-4 rounded border-line-strong"
          />
          <span className="text-sm font-medium text-fg">{t("purchases.receiveNow")}</span>
        </label>

        <button
          type="button"
          onClick={() => setShowExtras((value) => !value)}
          className="text-xs font-medium text-judi-800 hover:underline dark:text-judi-200"
          aria-expanded={showExtras}
        >
          {t("purchases.optionalDetails")}
        </button>

        {showExtras || proofPreviews.length > 0 || notes || freightAmount ? (
          <div className="space-y-2">
            <label className="block space-y-1 text-start">
              <span className={labelClass}>{t("purchases.notes")}</span>
              <textarea
                name="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={2}
                className="min-h-[3.5rem] w-full rounded-lg border border-line-strong bg-muted px-2.5 py-1.5 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block space-y-1 text-start">
                <span className={labelClass}>{t("purchases.freightAmount")}</span>
                <input
                  name="freightAmount"
                  type="text"
                  inputMode="decimal"
                  value={freightAmount}
                  onChange={(event) => setFreightAmount(event.target.value)}
                  placeholder={t("purchases.freightAmountPlaceholder")}
                  className={fieldClass}
                />
              </label>
              <label className="block space-y-1 text-start">
                <span className={labelClass}>{t("purchases.freightCurrency")}</span>
                <select
                  name="freightCurrency"
                  value={freightCurrency}
                  onChange={(event) =>
                    setFreightCurrency(event.target.value === "USD" ? "USD" : "IQD")
                  }
                  className={fieldClass}
                >
                  <option value="IQD">IQD</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="inline-flex h-10 min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-muted px-3 text-sm font-medium"
              >
                <Camera className="size-4" aria-hidden />
                {t("purchases.addProof")}
              </button>
              {proofPreviews.length > 0 ? (
                <p className="text-xs text-fg-muted">
                  {t("purchases.proofCount", { count: proofPreviews.length })}
                </p>
              ) : null}
            </div>
            {proofPreviews.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {proofPreviews.map((proof, index) => (
                  <li key={proof.url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proof.url}
                      alt=""
                      className="size-14 rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeProof(index)}
                      className="absolute -end-1 -top-1 inline-flex size-6 items-center justify-center rounded-full bg-fg text-surface"
                      aria-label={t("purchases.removeProof")}
                    >
                      <X className="size-3" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      {formError ? (
        <p className="text-sm text-red-700 dark:text-red-300" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || !warehouseId}
        className="btn btn-important w-full"
      >
        {pending
          ? t("purchases.submitting")
          : receiveNow
            ? t("purchases.submitReceive")
            : t("purchases.submitDraft")}
      </button>

      <CameraCapture
        open={cameraOpen}
        kind="STOCK"
        onClose={() => setCameraOpen(false)}
        onCaptured={(blob) => {
          addProof(blob);
          setCameraOpen(false);
        }}
      />
    </form>
  );
}

function StepHeader({ n, title, hint }: { n: number; title: string; hint: string }) {
  return (
    <div className="flex items-start gap-2 text-start">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-judi-700 text-[11px] font-bold text-white dark:bg-judi-500 dark:text-judi-950">
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-fg">{title}</h3>
        <p className="text-[11px] text-fg-muted">{hint}</p>
      </div>
    </div>
  );
}

function emptyLine(
  products: PurchaseProductOption[],
  currency: "IQD" | "USD",
): Line {
  const product = products[0];
  return {
    productId: product?.id ?? "",
    productUnitId: product?.units[0]?.id ?? "",
    quantity: "",
    unitCost: "",
    currency,
    lotCode: "",
    expiryDate: suggestExpiryFromShelfLife(product?.shelfLifeDays) ?? "",
  };
}

function errorLabel(
  t: ReturnType<typeof useTranslations>,
  code: string,
): string {
  switch (code) {
    case "invalid_supplier":
      return t("purchases.invalidSupplier");
    case "invalid_warehouse":
    case "warehouse":
      return t("stock.warehouseRequired");
    case "invalid_expiry":
      return t("purchases.invalidExpiry");
    case "no_lines":
      return t("purchases.needLines");
    default:
      return t("common.error");
  }
}
