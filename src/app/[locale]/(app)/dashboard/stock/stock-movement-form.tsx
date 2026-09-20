"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  ArrowDownToLine,
  Camera,
  Hash,
  NotebookPen,
  Package,
  PackageMinus,
  Ruler,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CameraCapture } from "@/components/camera-capture";
import { Thumb } from "@/components/thumb";
import { resolveProductBarcode } from "@/lib/barcode-resolve";
import { toBaseQuantity } from "@/lib/uom";
import { applyStockMovementResult } from "./actions";

export type StockProductOption = {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  baseQty: string;
  primaryMediaUrl?: string | null;
  units: {
    id: string;
    name: string;
    barcode: string | null;
    conversionRatio: string;
    isBaseUnit: boolean;
  }[];
};

type MovementType = "RECEIVE" | "WRITE_OFF";

async function uploadStockProof(movementId: string, blob: Blob) {
  const form = new FormData();
  form.set("file", blob, "capture.jpg");
  form.set("kind", "STOCK");
  form.set("entityType", "StockMovement");
  form.set("entityId", movementId);
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload_failed");
}

export function StockMovementForm({
  warehouseId,
  products,
}: {
  warehouseId: string;
  products: StockProductOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<MovementType>("RECEIVE");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [unitId, setUnitId] = useState(products[0]?.units[0]?.id ?? "");
  const [quantity, setQuantity] = useState("");
  const [scanCode, setScanCode] = useState("");
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [proofPreviews, setProofPreviews] = useState<{ url: string; blob: Blob }[]>([]);

  const product = products.find((item) => item.id === productId) ?? products[0];
  const units = product?.units ?? [];
  const unit = units.find((item) => item.id === unitId) ?? units[0];

  const preview = useMemo(() => {
    if (!unit || !quantity) return null;
    try {
      return toBaseQuantity(quantity, unit.conversionRatio).toString();
    } catch {
      return null;
    }
  }, [quantity, unit]);

  const onHand = product ? Number(product.baseQty) : 0;
  const writeOffBlocked =
    type === "WRITE_OFF" && preview !== null && Number(preview) > onHand;

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

  function applyScan() {
    const hit = resolveProductBarcode(products, scanCode, {
      fallbackUnit: "base",
    });
    if (!hit) {
      setScanError(t("stock.barcodeNotFound"));
      return;
    }
    setProductId(hit.productId);
    setUnitId(hit.productUnitId);
    setScanCode("");
    setScanError(null);
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || !unit || writeOffBlocked || pending) return;

    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await applyStockMovementResult(formData);
      if (!result.ok) {
        const qs = new URLSearchParams({
          warehouseId: result.warehouseId ?? warehouseId,
          error: result.error,
        });
        router.replace(`/dashboard/stock?${qs.toString()}`);
        return;
      }

      let uploadFailed = false;
      try {
        for (const item of proofPreviews) {
          await uploadStockProof(result.movementId, item.blob);
        }
      } catch {
        uploadFailed = true;
      }

      for (const item of proofPreviews) {
        URL.revokeObjectURL(item.url);
      }
      setProofPreviews([]);
      setQuantity("");

      const qs = new URLSearchParams({
        warehouseId: result.warehouseId,
        ok: result.type === "RECEIVE" ? "received" : "writtenOff",
        movementId: result.movementId,
        focus: "photos",
      });
      if (uploadFailed) qs.set("error", "upload_failed");
      router.replace(`/dashboard/stock?${qs.toString()}`);
      router.refresh();
    });
  }

  const fieldClass =
    "min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface";

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="warehouseId" value={warehouseId} />
      <input type="hidden" name="type" value={type} />

      <div
        role="group"
        aria-label={t("stock.movementType")}
        className="grid grid-cols-2 gap-1 rounded-xl border border-line-strong bg-muted p-1"
      >
        <button
          type="button"
          aria-pressed={type === "RECEIVE"}
          onClick={() => setType("RECEIVE")}
          className={`inline-flex min-h-touch items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
            type === "RECEIVE"
              ? "seg-on"
              : "text-fg-muted hover:bg-surface hover:text-fg"
          }`}
        >
          <ArrowDownToLine className="size-4 shrink-0" aria-hidden />
          {t("stock.receive")}
        </button>
        <button
          type="button"
          aria-pressed={type === "WRITE_OFF"}
          onClick={() => setType("WRITE_OFF")}
          className={`inline-flex min-h-touch items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors ${
            type === "WRITE_OFF"
              ? "bg-amber-600 text-white dark:bg-amber-500 dark:text-amber-950"
              : "text-fg-muted hover:bg-surface hover:text-fg"
          }`}
        >
          <PackageMinus className="size-4 shrink-0" aria-hidden />
          {t("stock.writeOff")}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block space-y-1 text-start sm:col-span-2 lg:col-span-4">
          <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Hash className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            {t("stock.scanBarcode")}
          </span>
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
              placeholder={t("stock.scanBarcodePlaceholder")}
              className={fieldClass}
              inputMode="text"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={applyScan}
              className="inline-flex min-h-touch shrink-0 items-center justify-center rounded-xl border border-line-strong bg-surface px-4 text-sm font-medium text-fg hover:bg-muted"
            >
              {t("stock.applyScan")}
            </button>
          </div>
          {scanError ? (
            <p className="text-sm text-red-700 dark:text-red-300" role="alert">
              {scanError}
            </p>
          ) : null}
        </label>

        <label className="block space-y-1 text-start sm:col-span-2">
          <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Package className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            {t("stock.product")}
          </span>
          <div className="flex items-center gap-2">
            <Thumb
              kind="product"
              size="sm"
              src={product?.primaryMediaUrl}
              alt={product?.name ?? ""}
            />
            <select
              name="productId"
              value={product?.id ?? ""}
              onChange={(event) => {
                const next = products.find((item) => item.id === event.target.value);
                setProductId(event.target.value);
                setUnitId(next?.units[0]?.id ?? "");
              }}
              required
              className={`${fieldClass} flex-1`}
            >
              {products.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.sku} — {item.name}
                </option>
              ))}
            </select>
          </div>
        </label>

        <label className="block space-y-1 text-start">
          <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Ruler className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            {t("stock.unit")}
          </span>
          <select
            name="productUnitId"
            value={unit?.id ?? ""}
            onChange={(event) => setUnitId(event.target.value)}
            required
            className={fieldClass}
          >
            {units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.conversionRatio})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1 text-start">
          <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <Hash className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
            {t("stock.quantity")}
          </span>
          <input
            name="quantity"
            type="number"
            min="0.01"
            step="0.01"
            required
            inputMode="decimal"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className={fieldClass}
          />
        </label>

        <label className="block space-y-1 text-start sm:col-span-2 lg:col-span-4">
          <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
            <NotebookPen
              className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
              aria-hidden
            />
            {t("stock.notes")}
          </span>
          <input
            name="notes"
            maxLength={500}
            className={fieldClass}
            placeholder={t("stock.notesPlaceholder")}
          />
        </label>

        {type === "RECEIVE" ? (
          <>
            <label className="block space-y-1 text-start">
              <span className="text-sm font-medium text-fg">{t("stock.lotCode")}</span>
              <input
                name="lotCode"
                maxLength={64}
                className={fieldClass}
                placeholder={t("stock.lotCodePlaceholder")}
              />
            </label>
            <label className="block space-y-1 text-start">
              <span className="text-sm font-medium text-fg">{t("stock.expiryDate")}</span>
              <input name="expiryDate" type="date" className={fieldClass} />
            </label>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={pending}
          className="btn btn-regular disabled:opacity-60"
        >
          <Camera className="size-4 text-judi-700 dark:text-judi-400" aria-hidden />
          {t("stock.addProofPhoto")}
          {proofPreviews.length > 0 ? (
            <span className="tabular-nums text-fg-muted">({proofPreviews.length})</span>
          ) : null}
        </button>

        {proofPreviews.map((item, index) => (
          <span key={item.url} className="relative inline-flex">
            <Thumb kind="stock" size="sm" src={item.url} alt="" />
            <button
              type="button"
              onClick={() => removeProof(index)}
              className="absolute -end-1 -top-1 inline-flex size-6 items-center justify-center rounded-full bg-surface text-fg shadow-sm ring-1 ring-line"
              aria-label={t("stock.removeProofPhoto")}
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}

        <p className="ms-auto text-sm text-fg-muted text-start">
          {t("stock.preview")}:{" "}
          <span className="font-medium tabular-nums text-fg">
            {preview ?? t("common.none")}
          </span>
          {type === "WRITE_OFF" ? (
            <>
              {" · "}
              {t("stock.onHand")}:{" "}
              <span className="font-medium tabular-nums text-fg">
                {product?.baseQty ?? "0"}
              </span>
            </>
          ) : null}
        </p>
      </div>

      {writeOffBlocked ? (
        <p className="text-sm text-red-700 text-start dark:text-red-300" role="alert">
          {t("stock.insufficient")}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={!product || !unit || writeOffBlocked || pending}
        className={`min-h-touch w-full rounded-xl px-4 font-semibold text-white disabled:cursor-not-allowed disabled:bg-muted disabled:text-fg-muted sm:w-auto ${
          type === "RECEIVE"
            ? "bg-judi-700 hover:bg-judi-800 dark:bg-judi-500 dark:text-judi-950 dark:hover:bg-judi-400"
            : "bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-400"
        }`}
      >
        {pending
          ? t("stock.saving")
          : type === "RECEIVE"
            ? t("stock.receiveSubmit")
            : t("stock.writeOffSubmit")}
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
