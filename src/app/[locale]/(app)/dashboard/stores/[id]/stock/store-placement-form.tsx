"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { ArrowRight, Camera, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CameraCapture } from "@/components/camera-capture";
import { Thumb } from "@/components/thumb";
import { resolveProductBarcode } from "@/lib/barcode-resolve";
import { toBaseQuantity } from "@/lib/uom";
import { createStorePlacementResult } from "./actions";

export type StorePlacementProductOption = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  /** Available base qty for the active direction (warehouse or store). */
  baseQty: string;
  primaryMediaUrl?: string | null;
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
  expiryDate: string;
  lotCode: string;
};

async function uploadPlacementProof(placementId: string, blob: Blob) {
  const form = new FormData();
  form.set("file", blob, "capture.jpg");
  form.set("kind", "STOCK");
  form.set("entityType", "StorePlacement");
  form.set("entityId", placementId);
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload_failed");
}

const fieldClass =
  "min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface sm:h-9 sm:min-h-0 sm:rounded-lg sm:px-2";

export function StorePlacementForm({
  storeId,
  storeName,
  warehouses,
  warehouseId,
  direction,
  products,
  fromField = false,
  onWarehouseChange,
}: {
  storeId: string;
  storeName: string;
  warehouses: { id: string; label: string }[];
  warehouseId: string;
  direction: "TO_STORE" | "FROM_STORE";
  products: StorePlacementProductOption[];
  fromField?: boolean;
  /** Office: changing warehouse reloads available qty. */
  onWarehouseChange?: (warehouseId: string) => void;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [proofPreviews, setProofPreviews] = useState<{ url: string; blob: Blob }[]>([]);
  const [lines, setLines] = useState<Line[]>([
    {
      productId: products[0]?.id ?? "",
      productUnitId: products[0]?.units[0]?.id ?? "",
      quantity: "",
      expiryDate: "",
      lotCode: "",
    },
  ]);

  useEffect(() => {
    setLines([
      {
        productId: products[0]?.id ?? "",
        productUnitId: products[0]?.units[0]?.id ?? "",
        quantity: "",
        expiryDate: "",
        lotCode: "",
      },
    ]);
  }, [warehouseId, direction, products]);

  const warehouseLabel =
    warehouses.find((item) => item.id === warehouseId)?.label ?? warehouses[0]?.label ?? "";

  const neededByProduct = useMemo(() => {
    const totals = new Map<string, number>();
    for (const line of lines) {
      const product = products.find((item) => item.id === line.productId);
      const unit = product?.units.find((item) => item.id === line.productUnitId);
      if (!product || !unit || !line.quantity) continue;
      try {
        const base = Number(toBaseQuantity(line.quantity, unit.conversionRatio).toString());
        totals.set(product.id, (totals.get(product.id) ?? 0) + base);
      } catch {
        /* ignore incomplete lines */
      }
    }
    return totals;
  }, [lines, products]);

  const blocked = products.some((product) => {
    const needed = neededByProduct.get(product.id) ?? 0;
    return needed > Number(product.baseQty);
  });

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
    setLines((current) => [
      ...current,
      {
        productId: products[0]?.id ?? "",
        productUnitId: products[0]?.units[0]?.id ?? "",
        quantity: "",
        expiryDate: "",
        lotCode: "",
      },
    ]);
  }

  function removeLine(index: number) {
    setLines((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }

  function applyScan() {
    const hit = resolveProductBarcode(products, scanCode, { fallbackUnit: "base" });
    if (!hit) {
      setScanError(t("storeStock.barcodeNotFound"));
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
              }
            : line,
        );
      }
      return [
        ...current,
        {
          productId: hit.productId,
          productUnitId: hit.productUnitId,
          quantity: "1",
          expiryDate: "",
          lotCode: "",
        },
      ];
    });
    setScanCode("");
    setScanError(null);
  }

  function addProof(blob: Blob) {
    const url = URL.createObjectURL(blob);
    setProofPreviews((prev) => [...prev, { url, blob }]);
  }

  function removeProof(index: number) {
    setProofPreviews((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!warehouseId || products.length === 0 || blocked || pending) return;

    const formData = new FormData(event.currentTarget);
    formData.set(
      "linesJson",
      JSON.stringify(
        lines.map((line) => ({
          productId: line.productId,
          productUnitId: line.productUnitId,
          quantity: line.quantity,
          expiryDate: line.expiryDate,
          lotCode: line.lotCode,
        })),
      ),
    );
    if (fromField) formData.set("from", "field");

    const basePath = fromField
      ? `/field/customers/${storeId}/stock`
      : `/dashboard/stores/${storeId}/stock`;

    startTransition(async () => {
      const result = await createStorePlacementResult(formData);
      if (!result.ok) {
        const qs = new URLSearchParams({
          warehouseId: result.warehouseId ?? warehouseId,
          error: result.error,
          tab: direction === "TO_STORE" ? "place" : "return",
        });
        router.replace(`${basePath}?${qs.toString()}`);
        return;
      }

      let uploadFailed = false;
      try {
        for (const item of proofPreviews) {
          await uploadPlacementProof(result.placementId, item.blob);
        }
      } catch {
        uploadFailed = true;
      }

      for (const item of proofPreviews) {
        URL.revokeObjectURL(item.url);
      }
      setProofPreviews([]);
      setNotes("");
      setLines([
        {
          productId: products[0]?.id ?? "",
          productUnitId: products[0]?.units[0]?.id ?? "",
          quantity: "",
          expiryDate: "",
          lotCode: "",
        },
      ]);

      const qs = new URLSearchParams({
        warehouseId: result.warehouseId,
        ok: result.direction === "TO_STORE" ? "placed" : "returned",
        placementId: result.placementId,
        focus: "photos",
        tab: direction === "TO_STORE" ? "place" : "return",
      });
      if (uploadFailed) qs.set("error", "upload_failed");
      router.replace(`${basePath}?${qs.toString()}`);
      router.refresh();
    });
  }

  const isToStore = direction === "TO_STORE";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="direction" value={direction} />
      {fromField ? <input type="hidden" name="from" value="field" /> : null}

      <div className="rounded-xl border border-line bg-muted/40 p-3">
        <p className="mb-2 text-xs text-fg-muted text-start">
          {isToStore ? t("storeStock.placeRouteHint") : t("storeStock.returnRouteHint")}
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block space-y-1 text-start">
            <span className="text-xs font-semibold text-judi-800 dark:text-judi-200">
              {isToStore ? t("storeStock.fromWarehouse") : t("storeStock.fromStore")}
            </span>
            {isToStore ? (
              warehouses.length > 1 && onWarehouseChange ? (
                <select
                  name="warehouseId"
                  value={warehouseId}
                  onChange={(event) => onWarehouseChange(event.target.value)}
                  className={fieldClass}
                >
                  {warehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.label}
                    </option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="hidden" name="warehouseId" value={warehouseId} />
                  <p className="flex min-h-touch items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-fg sm:h-9 sm:min-h-0 sm:rounded-lg sm:px-2">
                    {warehouseLabel}
                  </p>
                </>
              )
            ) : (
              <p className="flex min-h-touch items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-fg sm:h-9 sm:min-h-0 sm:rounded-lg sm:px-2">
                {storeName}
              </p>
            )}
          </label>

          <span className="hidden h-9 items-center justify-center text-fg-muted sm:flex" aria-hidden>
            <ArrowRight className="size-5 rtl:rotate-180" />
          </span>

          <label className="block space-y-1 text-start">
            <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              {isToStore ? t("storeStock.toStore") : t("storeStock.toWarehouse")}
            </span>
            {isToStore ? (
              <p className="flex min-h-touch items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-fg sm:h-9 sm:min-h-0 sm:rounded-lg sm:px-2">
                {storeName}
              </p>
            ) : warehouses.length > 1 && onWarehouseChange ? (
              <select
                name="warehouseId"
                value={warehouseId}
                onChange={(event) => onWarehouseChange(event.target.value)}
                className={fieldClass}
              >
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.label}
                  </option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="warehouseId" value={warehouseId} />
                <p className="flex min-h-touch items-center rounded-xl border border-line bg-surface px-3 text-sm font-medium text-fg sm:h-9 sm:min-h-0 sm:rounded-lg sm:px-2">
                  {warehouseLabel}
                </p>
              </>
            )}
          </label>
        </div>
      </div>

      <label className="block space-y-1 text-start">
        <span className="text-xs font-medium text-fg">{t("storeStock.scanBarcode")}</span>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={scanCode}
            onChange={(event) => {
              setScanCode(event.target.value);
              setScanError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                applyScan();
              }
            }}
            placeholder={t("storeStock.scanBarcodePlaceholder")}
            className={fieldClass}
          />
          <button
            type="button"
            onClick={applyScan}
            className="inline-flex min-h-touch items-center justify-center rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-muted"
          >
            {t("storeStock.applyScan")}
          </button>
        </div>
        {scanError ? <p className="text-xs text-red-700 dark:text-red-300">{scanError}</p> : null}
      </label>

      <div className="space-y-2">
        {lines.map((line, index) => {
          const product = products.find((item) => item.id === line.productId);
          const unit = product?.units.find((item) => item.id === line.productUnitId);
          return (
            <div
              key={`${index}-${line.productId}`}
              className="space-y-2 rounded-xl border border-line bg-surface p-3"
            >
              <div className="flex items-start gap-2">
                <Thumb
                  kind="product"
                  size="sm"
                  src={product?.primaryMediaUrl}
                  alt={product?.name ?? ""}
                />
                <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-3">
                  <label className="block space-y-1 text-start sm:col-span-2">
                    <span className="text-xs font-medium text-fg">{t("stock.product")}</span>
                    <select
                      value={line.productId}
                      onChange={(event) => updateLine(index, { productId: event.target.value })}
                      className={fieldClass}
                      required
                    >
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} · {item.baseQty}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block space-y-1 text-start">
                    <span className="text-xs font-medium text-fg">{t("stock.unit")}</span>
                    <select
                      value={line.productUnitId}
                      onChange={(event) =>
                        updateLine(index, { productUnitId: event.target.value })
                      }
                      className={fieldClass}
                      required
                    >
                      {(product?.units ?? []).map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLine(index)}
                    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                    aria-label={t("storeStock.removeLine")}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="block space-y-1 text-start">
                  <span className="text-xs font-medium text-fg">{t("stock.quantity")}</span>
                  <input
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    required
                    className={fieldClass}
                  />
                  {unit && line.quantity ? (
                    <p className="text-[11px] text-fg-muted">
                      {t("stock.preview")}:{" "}
                      {toBaseQuantity(line.quantity || 0, unit.conversionRatio).toString()}
                    </p>
                  ) : null}
                </label>
                <label className="block space-y-1 text-start">
                  <span className="text-xs font-medium text-fg">{t("storeStock.expiryDate")}</span>
                  <input
                    type="date"
                    value={line.expiryDate}
                    onChange={(event) => updateLine(index, { expiryDate: event.target.value })}
                    className={fieldClass}
                  />
                </label>
                <label className="block space-y-1 text-start">
                  <span className="text-xs font-medium text-fg">{t("storeStock.lotCode")}</span>
                  <input
                    value={line.lotCode}
                    onChange={(event) => updateLine(index, { lotCode: event.target.value })}
                    className={fieldClass}
                    maxLength={64}
                  />
                </label>
              </div>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addLine}
        className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 text-sm font-semibold text-fg hover:bg-muted"
      >
        <Plus className="size-4" aria-hidden />
        {t("storeStock.addLine")}
      </button>

      <label className="block space-y-1 text-start">
        <span className="text-xs font-medium text-fg">{t("stock.notes")}</span>
        <textarea
          name="notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={2}
          placeholder={t("storeStock.notesPlaceholder")}
          className="min-h-[5rem] w-full rounded-xl border border-line-strong bg-muted px-3 py-2 text-sm text-fg focus:border-judi-500 focus:bg-surface"
        />
      </label>

      <div className="space-y-2 rounded-xl border border-dashed border-line bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-start">
            <p className="text-sm font-semibold text-fg">{t("storeStock.proofPhotos")}</p>
            <p className="text-xs text-fg-muted">{t("storeStock.proofPhotosHint")}</p>
          </div>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 text-sm font-semibold text-fg hover:bg-muted"
          >
            <Camera className="size-4" aria-hidden />
            {t("storeStock.addProofPhoto")}
          </button>
        </div>
        {proofPreviews.length === 0 ? (
          <p className="text-xs text-fg-muted text-start">{t("storeStock.proofPhotosEmpty")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {proofPreviews.map((item, index) => (
              <li key={item.url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt=""
                  className="size-16 rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeProof(index)}
                  className="absolute -end-1 -top-1 inline-flex size-6 items-center justify-center rounded-full bg-red-600 text-white"
                  aria-label={t("storeStock.removeProofPhoto")}
                >
                  <X className="size-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {blocked ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {isToStore ? t("storeStock.insufficient") : t("storeStock.insufficientStore")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending || blocked || products.length === 0 || !warehouseId}
        className="btn btn-important w-full"
      >
        {pending
          ? t("storeStock.saving")
          : isToStore
            ? t("storeStock.placeSubmit")
            : t("storeStock.returnSubmit")}
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
