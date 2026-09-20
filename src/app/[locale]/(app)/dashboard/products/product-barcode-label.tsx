"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import JsBarcode from "jsbarcode";
import { Printer, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { generateEan13FromSku } from "@/lib/barcode";

export type LabelPreviewOption = {
  key: string;
  label: string;
  barcode: string;
};

export function printBarcodeLabel(options: {
  code: string;
  productName: string;
  sku: string;
  unitName?: string;
  titleFallback: string;
  printBlockedMessage: string;
}) {
  const { code, productName, sku, unitName, titleFallback, printBlockedMessage } =
    options;
  if (!code.trim()) return;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, code, {
      format: /^\d{13}$/.test(code) ? "EAN13" : "CODE128",
      width: 1.6,
      height: 48,
      displayValue: true,
      fontSize: 12,
      margin: 4,
      background: "#ffffff",
      lineColor: "#000000",
    });
  } catch {
    try {
      JsBarcode(svg, code, {
        format: "CODE128",
        width: 1.6,
        height: 48,
        displayValue: true,
        fontSize: 12,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      return;
    }
  }

  const name = escapeHtml(productName || titleFallback);
  const skuText = escapeHtml(sku || "—");
  const unitText = unitName ? escapeHtml(unitName) : "";
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${skuText}${unitText ? ` · ${unitText}` : ""}</title>
  <style>
    @page { size: 50mm 30mm; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 50mm;
      height: 30mm;
      background: #fff;
      color: #000;
      font-family: Arial, Helvetica, sans-serif;
    }
    .label {
      width: 50mm;
      height: 30mm;
      padding: 1.5mm 2mm;
      text-align: center;
      overflow: hidden;
    }
    .name {
      margin: 0;
      font-size: 9px;
      font-weight: 700;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sku {
      margin: 1px 0 0;
      font-size: 8px;
      font-family: ui-monospace, Consolas, monospace;
    }
    .unit {
      margin: 0;
      font-size: 8px;
      font-weight: 600;
    }
    svg {
      display: block;
      margin: 1mm auto 0;
      max-width: 46mm;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="label">
    <p class="name">${name}</p>
    <p class="sku">${skuText}</p>
    ${unitText ? `<p class="unit">${unitText}</p>` : ""}
    ${svg.outerHTML}
  </div>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "width=420,height=320");
  if (!popup) {
    URL.revokeObjectURL(url);
    window.alert(printBlockedMessage);
    return;
  }

  const cleanup = () => URL.revokeObjectURL(url);
  popup.addEventListener("beforeunload", cleanup);
  window.setTimeout(() => {
    try {
      popup.focus();
      popup.print();
    } catch {
      // User can still print manually from the open label tab.
    }
    window.setTimeout(cleanup, 60_000);
  }, 250);
}

export function ProductBarcodeLabel({
  value,
  sku,
  productName,
  unitName,
  canManage,
  onBarcodeChange,
  generateSeed,
  top,
  compact,
  options,
  selectedKey,
  onSelectOption,
}: {
  value: string;
  sku: string;
  productName: string;
  /** Shown on print / preview when this label is for a specific unit. */
  unitName?: string;
  canManage: boolean;
  onBarcodeChange: (value: string) => void;
  /** Seed for EAN generation (defaults to sku / product name). */
  generateSeed?: string;
  /** Optional block above the label (e.g. product photos). */
  top?: ReactNode;
  /** Inline unit-row variant (no sticky aside chrome). */
  compact?: boolean;
  /** When set, sidebar shows chips to preview product default or each unit. */
  options?: LabelPreviewOption[];
  selectedKey?: string;
  onSelectOption?: (key: string) => void;
}) {
  const t = useTranslations("products");
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const code = value.trim();
  const hasCode = code.length > 0;
  const showPicker = Boolean(options && options.length > 0 && onSelectOption);

  useEffect(() => {
    if (!svgRef.current || !hasCode) return;
    try {
      JsBarcode(svgRef.current, code, {
        format: /^\d{13}$/.test(code) ? "EAN13" : "CODE128",
        width: compact ? 1.2 : 1.6,
        height: compact ? 36 : 48,
        displayValue: true,
        fontSize: compact ? 10 : 12,
        margin: 4,
        background: "#ffffff",
        lineColor: "#000000",
      });
    } catch {
      try {
        JsBarcode(svgRef.current, code, {
          format: "CODE128",
          width: compact ? 1.2 : 1.6,
          height: compact ? 36 : 48,
          displayValue: true,
          fontSize: compact ? 10 : 12,
          margin: 4,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch {
        svgRef.current.replaceChildren();
      }
    }
  }, [code, hasCode, compact]);

  function generateCode() {
    const seed =
      generateSeed?.trim() ||
      `${sku || productName || "JUDI"}${unitName ? `:${unitName}` : ""}`;
    onBarcodeChange(generateEan13FromSku(seed));
  }

  function printLabel() {
    printBarcodeLabel({
      code,
      productName,
      sku,
      unitName,
      titleFallback: t("labelNoName"),
      printBlockedMessage: t("printBlocked"),
    });
  }

  const body = (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-sm font-semibold text-fg">
          {unitName ? t("unitLabelTitle", { unit: unitName }) : t("labelTitle")}
        </h2>
        <button
          type="button"
          onClick={printLabel}
          disabled={!hasCode}
          className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted disabled:opacity-50"
        >
          <Printer className="size-4 shrink-0" aria-hidden />
          {t("printLabel")}
        </button>
      </div>

      {showPicker ? (
        <div
          role="tablist"
          aria-label={t("labelPreviewPicker")}
          className="flex flex-wrap gap-1"
        >
          {options!.map((option) => {
            const active = option.key === selectedKey;
            return (
              <button
                key={option.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => onSelectOption?.(option.key)}
                className={`inline-flex min-h-9 max-w-full items-center truncate rounded-lg px-2.5 text-xs font-semibold ${
                  active
                    ? "seg-on"
                    : "border border-line-strong bg-surface text-fg hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      ) : null}

      <div
        className="rounded-xl border border-line bg-white p-2.5 text-center shadow-sm"
        aria-labelledby={titleId}
      >
        <p className="truncate text-xs font-semibold text-black">
          {productName || t("labelNoName")}
        </p>
        <p className="mt-0.5 font-mono text-[11px] tabular-nums text-black">
          {sku || "—"}
        </p>
        {unitName ? (
          <p className="text-[11px] font-semibold text-black">{unitName}</p>
        ) : null}
        {hasCode ? (
          <svg
            ref={svgRef}
            role="img"
            aria-label={t("barcodeAria", { code })}
            className="mx-auto mt-1.5 max-w-full"
          />
        ) : (
          <p className="mt-2 py-3 text-xs text-stone-400">{t("labelEmpty")}</p>
        )}
        {canManage ? (
          <button
            type="button"
            onClick={generateCode}
            className="btn btn-important mt-2 w-full"
          >
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            {hasCode ? t("regenerateBarcode") : t("generateBarcode")}
          </button>
        ) : null}
      </div>
    </div>
  );

  if (compact) {
    return <div className="space-y-2 no-print">{body}</div>;
  }

  return (
    <aside className="surface-panel space-y-3 p-2.5 text-start sm:p-3 lg:sticky lg:top-4 lg:self-start no-print">
      {top ? (
        <div className="space-y-2 border-b border-line pb-3">{top}</div>
      ) : null}
      {body}
    </aside>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
