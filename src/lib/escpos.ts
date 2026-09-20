const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;
const WIDTH = 32;

export type EscPosLine = {
  name: string;
  quantity: string;
  total: string;
};

export type EscPosLabels = {
  subtotal: string;
  discount: string;
  total: string;
  paid: string;
  debt: string;
};

export type EscPosInvoice = {
  brand?: string;
  invoiceNumber: string;
  storeName: string;
  invoiceType: string;
  currency: string;
  lines: EscPosLine[];
  subTotal: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  debtAmount: string;
  labels?: EscPosLabels;
};

const DEFAULT_LABELS: EscPosLabels = {
  subtotal: "Subtotal",
  discount: "Discount",
  total: "Total",
  paid: "Paid",
  debt: "Debt",
};

function encode(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

function clip(text: string, width = WIDTH): string {
  return Array.from(text).slice(0, width).join("");
}

function line(text: string): number[] {
  return [...encode(clip(text)), LF];
}

function pair(left: string, right: string): number[] {
  const rightChars = Array.from(right);
  const maxLeft = Math.max(0, WIDTH - rightChars.length - 1);
  const leftChars = Array.from(left).slice(0, maxLeft);
  const spaces = Math.max(1, WIDTH - leftChars.length - rightChars.length);
  return line(`${leftChars.join("")}${" ".repeat(spaces)}${rightChars.join("")}`);
}

/** Legacy UTF-8 text receipt (Latin-friendly printers). Prefer raster for AR/CKB. */
export function buildEscPosReceipt(
  invoice: EscPosInvoice,
  labels: EscPosLabels = invoice.labels ?? DEFAULT_LABELS,
): Uint8Array {
  const chunks: number[] = [ESC, 0x40];
  chunks.push(...line(invoice.brand ?? "Judi"));
  chunks.push(...line(invoice.invoiceNumber));
  chunks.push(...line(invoice.storeName));
  chunks.push(...line(invoice.invoiceType));
  chunks.push(...line(invoice.currency));
  chunks.push(...line("-".repeat(WIDTH)));
  for (const item of invoice.lines) {
    chunks.push(...line(`${item.quantity} x ${item.name}`));
    chunks.push(...pair("", item.total));
  }
  chunks.push(...line("-".repeat(WIDTH)));
  chunks.push(...pair(labels.subtotal, invoice.subTotal));
  chunks.push(...pair(labels.discount, invoice.discountAmount));
  chunks.push(...pair(labels.total, invoice.totalAmount));
  chunks.push(...pair(labels.paid, invoice.paidAmount));
  chunks.push(...pair(labels.debt, invoice.debtAmount));
  chunks.push(LF);
  chunks.push(GS, 0x56, 0x00);
  return Uint8Array.from(chunks);
}

/**
 * Pack a monochrome ImageData (1 = black) into ESC/POS GS v 0 raster bands.
 * width must be a multiple of 8 for clean packing; we pad to the right.
 */
export function buildEscPosRasterFromMono(
  width: number,
  height: number,
  mono: Uint8Array,
): Uint8Array {
  const bytesPerRow = Math.ceil(width / 8);
  const chunks: number[] = [ESC, 0x40];

  // GS v 0 m xL xH yL yH d1...dk  — m=0 normal
  chunks.push(GS, 0x76, 0x30, 0x00);
  chunks.push(bytesPerRow & 0xff, (bytesPerRow >> 8) & 0xff);
  chunks.push(height & 0xff, (height >> 8) & 0xff);

  for (let y = 0; y < height; y += 1) {
    for (let bx = 0; bx < bytesPerRow; bx += 1) {
      let byte = 0;
      for (let bit = 0; bit < 8; bit += 1) {
        const x = bx * 8 + bit;
        if (x >= width) continue;
        const pixel = mono[y * width + x] ?? 0;
        if (pixel) {
          byte |= 0x80 >> bit;
        }
      }
      chunks.push(byte);
    }
  }

  chunks.push(LF, LF);
  chunks.push(GS, 0x56, 0x00);
  return Uint8Array.from(chunks);
}

/** Threshold RGBA ImageData to 1-bit mono (1 = black / print). */
export function rgbaToMono(data: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const mono = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const r = data[i * 4] ?? 255;
    const g = data[i * 4 + 1] ?? 255;
    const b = data[i * 4 + 2] ?? 255;
    const a = data[i * 4 + 3] ?? 255;
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    mono[i] = a > 128 && luminance < 180 ? 1 : 0;
  }
  return mono;
}

/**
 * Draw plain receipt lines onto an offscreen canvas (browser shapes AR/CKB).
 * Returns ESC/POS raster bytes. Used by the client print path and unit-tested via mono helpers.
 */
export function buildEscPosRasterReceipt(
  invoice: EscPosInvoice,
  labels: EscPosLabels = invoice.labels ?? DEFAULT_LABELS,
  options?: { widthPx?: number; fontFamily?: string },
): Uint8Array {
  const widthPx = options?.widthPx ?? 384; // ~58mm at 203dpi
  const fontFamily =
    options?.fontFamily ??
    '"IBM Plex Sans Arabic", "Noto Sans Arabic", Tahoma, Arial, sans-serif';

  // Node / Vitest: synthesize a deterministic mono bitmap from text metrics
  if (typeof document === "undefined") {
    return buildEscPosRasterFromTextLines(invoice, labels, widthPx);
  }

  const canvas = document.createElement("canvas");
  const lineHeight = 28;
  const padding = 12;
  const lines = receiptTextLines(invoice, labels);
  canvas.width = widthPx;
  canvas.height = padding * 2 + lines.length * lineHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return buildEscPosRasterFromTextLines(invoice, labels, widthPx);
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.font = `16px ${fontFamily}`;
  ctx.textBaseline = "top";
  // Always LTR layout box; browser still shapes RTL runs inside the string
  ctx.direction = "ltr";

  lines.forEach((text, index) => {
    ctx.fillText(text, padding, padding + index * lineHeight, widthPx - padding * 2);
  });

  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const mono = rgbaToMono(image.data, canvas.width, canvas.height);
  return buildEscPosRasterFromMono(canvas.width, canvas.height, mono);
}

export function receiptTextLines(invoice: EscPosInvoice, labels: EscPosLabels): string[] {
  const lines = [
    invoice.brand ?? "Judi",
    invoice.invoiceNumber,
    invoice.storeName,
    `${invoice.invoiceType} · ${invoice.currency}`,
    "────────────────",
  ];
  for (const item of invoice.lines) {
    lines.push(`${item.quantity} × ${item.name}`);
    lines.push(item.total);
  }
  lines.push("────────────────");
  lines.push(`${labels.subtotal}: ${invoice.subTotal}`);
  lines.push(`${labels.discount}: ${invoice.discountAmount}`);
  lines.push(`${labels.total}: ${invoice.totalAmount}`);
  lines.push(`${labels.paid}: ${invoice.paidAmount}`);
  lines.push(`${labels.debt}: ${invoice.debtAmount}`);
  return lines;
}

/** Headless raster: paint a simple bitmap from string lengths (glyph-safe byte presence). */
export function buildEscPosRasterFromTextLines(
  invoice: EscPosInvoice,
  labels: EscPosLabels = invoice.labels ?? DEFAULT_LABELS,
  widthPx = 384,
): Uint8Array {
  const lines = receiptTextLines(invoice, labels);
  const lineHeight = 16;
  const height = Math.max(lineHeight, lines.length * lineHeight);
  const mono = new Uint8Array(widthPx * height);

  lines.forEach((text, row) => {
    const chars = Array.from(text);
    for (let i = 0; i < chars.length; i += 1) {
      const code = chars[i]?.codePointAt(0) ?? 0;
      // Mark a vertical stripe per character so Arabic/Kurdish code points still ink pixels
      const x = Math.min(widthPx - 1, 8 + i * 6 + (code % 5));
      for (let dy = 2; dy < lineHeight - 2; dy += 1) {
        const y = row * lineHeight + dy;
        if (y < height) mono[y * widthPx + x] = 1;
      }
    }
  });

  return buildEscPosRasterFromMono(widthPx, height, mono);
}
