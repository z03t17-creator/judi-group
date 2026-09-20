"use client";

import { useEffect, useMemo, useState, useTransition, type FormEvent } from "react";
import { ArrowRight, Camera, Plus, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { CameraCapture } from "@/components/camera-capture";
import { Thumb } from "@/components/thumb";
import { resolveProductBarcode } from "@/lib/barcode-resolve";
import { toBaseQuantity } from "@/lib/uom";
import { createTransferResult } from "./actions";

export type TransferProductOption = {
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
    isBaseUnit?: boolean;
  }[];
};

type Line = {
  productId: string;
  productUnitId: string;
  quantity: string;
};

async function uploadTransferProof(transferId: string, blob: Blob) {
  const form = new FormData();
  form.set("file", blob, "capture.jpg");
  form.set("kind", "STOCK");
  form.set("entityType", "StockTransfer");
  form.set("entityId", transferId);
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload_failed");
}

const fieldClass =
  "h-9 w-full rounded-lg border border-line-strong bg-muted px-2 text-sm text-start text-fg focus:border-judi-500 focus:bg-surface";

export function TransferForm({
  sourceId,
  sourceLabel,
  sources,
  destinations,
  products,
}: {
  sourceId: string;
  sourceLabel: string;
  /** When set (admin), changing source reloads stock for that warehouse. */
  sources?: { id: string; label: string }[];
  destinations: { id: string; label: string }[];
  products: TransferProductOption[];
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [destinationId, setDestinationId] = useState(destinations[0]?.id ?? "");
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
    },
  ]);

  useEffect(() => {
    if (!destinations.some((item) => item.id === destinationId)) {
      setDestinationId(destinations[0]?.id ?? "");
    }
  }, [destinationId, destinations]);

  useEffect(() => {
    setLines([
      {
        productId: products[0]?.id ?? "",
        productUnitId: products[0]?.units[0]?.id ?? "",
        quantity: "",
      },
    ]);
  }, [sourceId, products]);

  const destinationLabel =
    destinations.find((item) => item.id === destinationId)?.label ??
    destinations[0]?.label ??
    "";

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

  function changeSource(nextSourceId: string) {
    if (nextSourceId === sourceId) return;
    router.replace(`/dashboard/transfers?sourceId=${nextSourceId}`);
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
    setLines((current) => [
      ...current,
      {
        productId: products[0]?.id ?? "",
        productUnitId: products[0]?.units[0]?.id ?? "",
        quantity: "",
      },
    ]);
  }

  function applyScan() {
    const hit = resolveProductBarcode(products, scanCode, {
      fallbackUnit: "base",
    });
    if (!hit) {
      setScanError(t("transfers.barcodeNotFound"));
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
          const nextQty = String((Number(line.quantity) || 0) + 1);
          return { ...line, quantity: nextQty };
        });
      }
      const empty = current.findIndex((line) => !line.quantity);
      if (empty >= 0) {
        return current.map((line, index) =>
          index === empty
            ? {
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
    if (!destinationId || products.length === 0 || blocked || pending) return;

    const formData = new FormData(event.currentTarget);
    formData.set("linesJson", JSON.stringify(lines));

    startTransition(async () => {
      const result = await createTransferResult(formData);
      if (!result.ok) {
        const qs = new URLSearchParams({
          sourceId: result.sourceId ?? sourceId,
          error: result.error,
        });
        router.replace(`/dashboard/transfers?${qs.toString()}`);
        return;
      }

      let uploadFailed = false;
      try {
        for (const item of proofPreviews) {
          await uploadTransferProof(result.transferId, item.blob);
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
        },
      ]);

      const qs = new URLSearchParams({
        sourceId: result.sourceId,
        ok: "created",
        transferId: result.transferId,
        focus: "photos",
      });
      if (uploadFailed) qs.set("error", "upload_failed");
      router.replace(`/dashboard/transfers?${qs.toString()}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <input type="hidden" name="sourceId" value={sourceId} />

      <div className="rounded-lg border border-line bg-muted/40 p-2.5">
        <p className="mb-2 text-[11px] text-fg-muted text-start">{t("transfers.routeHint")}</p>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <label className="block space-y-0.5 text-start">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-judi-800 dark:text-judi-200">
              <span className="rounded bg-judi-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:bg-judi-950/60">
                {t("transfers.from")}
              </span>
              {t("transfers.source")}
            </span>
            {sources && sources.length > 0 ? (
              <select
                value={sourceId}
                onChange={(event) => changeSource(event.target.value)}
                className={fieldClass}
              >
                {sources.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.label}
                  </option>
                ))}
              </select>
            ) : (
              <p className="flex h-9 items-center rounded-lg border border-line bg-surface px-2 text-sm font-medium text-fg">
                {sourceLabel}
              </p>
            )}
          </label>

          <span
            className="hidden h-9 items-center justify-center text-fg-muted sm:flex"
            aria-hidden
          >
            <ArrowRight className="size-5 rtl:rotate-180" />
          </span>

          <label className="block space-y-0.5 text-start">
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 dark:text-amber-200">
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide dark:bg-amber-950/50">
                {t("transfers.to")}
              </span>
              {t("transfers.destination")}
            </span>
            <select
              name="destinationId"
              value={destinationId}
              onChange={(event) => setDestinationId(event.target.value)}
              required
              className={fieldClass}
            >
              {destinations.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs font-medium text-fg text-start">
          <span className="text-judi-800 dark:text-judi-200">{sourceLabel}</span>
          <ArrowRight className="size-3.5 shrink-0 text-fg-muted rtl:rotate-180" aria-hidden />
          <span className="text-amber-900 dark:text-amber-200">{destinationLabel}</span>
        </p>
      </div>

      <label className="block space-y-0.5 text-start">
        <span className="text-xs font-medium text-fg">{t("transfers.scanBarcode")}</span>
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
            placeholder={t("transfers.scanBarcodePlaceholder")}
            className={fieldClass}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={applyScan}
            className="inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted"
          >
            {t("transfers.applyScan")}
          </button>
        </div>
        {scanError ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {scanError}
          </p>
        ) : null}
      </label>

      {/* Compact spreadsheet lines — one row each */}
      <div className="overflow-hidden rounded-lg border border-line">
        <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_2rem] gap-1 border-b border-line bg-muted/50 px-2 py-1.5 text-[11px] font-medium text-fg-muted sm:grid">
          <span className="text-start">{t("transfers.product")}</span>
          <span className="text-start">{t("transfers.unit")}</span>
          <span className="text-start">{t("transfers.quantity")}</span>
          <span className="sr-only">{t("transfers.removeLine")}</span>
        </div>

        <ul className="divide-y divide-line">
          {lines.map((line, index) => {
            const product = products.find((item) => item.id === line.productId) ?? products[0];
            const units = product?.units ?? [];
            let preview = "—";
            try {
              const unit = units.find((item) => item.id === line.productUnitId);
              if (unit && line.quantity) {
                preview = toBaseQuantity(line.quantity, unit.conversionRatio).toString();
              }
            } catch {
              preview = "—";
            }

            return (
              <li key={`${index}-${line.productId}`} className="px-2 py-1.5">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_5.5rem_4.5rem_2rem] sm:items-center sm:gap-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="hidden shrink-0 sm:inline-flex">
                      <Thumb
                        kind="product"
                        size="xs"
                        src={product?.primaryMediaUrl}
                        alt=""
                      />
                    </span>
                    <select
                      value={product?.id ?? ""}
                      onChange={(event) => updateLine(index, { productId: event.target.value })}
                      aria-label={t("transfers.product")}
                      className={`${fieldClass} min-w-0 flex-1`}
                      title={`${t("transfers.onHand")}: ${product?.baseQty ?? "0"}`}
                    >
                      {products.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.sku} — {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    value={line.productUnitId}
                    onChange={(event) =>
                      updateLine(index, { productUnitId: event.target.value })
                    }
                    aria-label={t("transfers.unit")}
                    className={fieldClass}
                  >
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    value={line.quantity}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    required
                    aria-label={t("transfers.quantity")}
                    placeholder="0"
                    className={fieldClass}
                  />
                  <button
                    type="button"
                    disabled={lines.length <= 1}
                    className="inline-flex h-9 w-8 items-center justify-center justify-self-end rounded-lg text-red-700 enabled:hover:bg-red-50 disabled:opacity-30 dark:text-red-300 dark:enabled:hover:bg-red-950/40 sm:justify-self-center"
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                    aria-label={t("transfers.removeLine")}
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
                <p className="mt-0.5 text-[11px] text-fg-subtle text-start sm:ps-9">
                  {preview} {t("transfers.baseUnits")}
                  <span aria-hidden className="mx-1">
                    ·
                  </span>
                  {t("transfers.onHand")} {product?.baseQty ?? "0"}
                </p>
              </li>
            );
          })}
        </ul>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line px-2 py-1.5">
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 text-xs font-medium text-judi-800 hover:underline dark:text-judi-300"
            onClick={addLine}
          >
            <Plus className="size-3.5" aria-hidden />
            {t("transfers.addLine")}
          </button>
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            disabled={pending}
            className="inline-flex h-8 items-center gap-1 text-xs font-medium text-fg-muted hover:text-fg disabled:opacity-60"
          >
            <Camera className="size-3.5" aria-hidden />
            {t("transfers.addProofPhoto")}
            {proofPreviews.length > 0 ? ` (${proofPreviews.length})` : ""}
          </button>
          {proofPreviews.map((item, index) => (
            <span key={item.url} className="relative inline-flex">
              <Thumb kind="stock" size="xs" src={item.url} alt="" />
              <button
                type="button"
                onClick={() => removeProof(index)}
                className="absolute -end-1 -top-1 inline-flex size-4 items-center justify-center rounded-full bg-surface text-fg ring-1 ring-line"
                aria-label={t("transfers.removeProofPhoto")}
              >
                <X className="size-2.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-0.5 text-start">
          <span className="text-xs font-medium text-fg-muted">{t("transfers.notes")}</span>
          <input
            name="notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
            placeholder={t("transfers.notesPlaceholder")}
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={!destinationId || products.length === 0 || blocked || pending}
          className="btn btn-important btn-sm shrink-0"
        >
          {pending ? t("transfers.submitting") : t("transfers.submit")}
        </button>
      </div>

      {blocked ? (
        <p className="text-xs text-red-700 text-start dark:text-red-300" role="alert">
          {t("transfers.insufficient")}
        </p>
      ) : null}

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
