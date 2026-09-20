import { describe, expect, it } from "vitest";
import {
  buildEscPosRasterFromMono,
  buildEscPosRasterReceipt,
  buildEscPosReceipt,
  rgbaToMono,
} from "@/lib/escpos";

function decode(buffer: Uint8Array) {
  return new TextDecoder().decode(buffer);
}

const sample = {
  brand: "جودی",
  invoiceNumber: "INV-000001",
  storeName: "فرۆشگای ئامال",
  invoiceType: "نەقد",
  currency: "IQD",
  lines: [
    {
      name: "پەنری تەواو چەور کارتۆن",
      quantity: "1",
      total: "52000 IQD",
    },
  ],
  subTotal: "52000 IQD",
  discountAmount: "0 IQD",
  totalAmount: "52000 IQD",
  paidAmount: "52000 IQD",
  debtAmount: "0 IQD",
};

const labels = {
  subtotal: "کۆی لاوەکی",
  discount: "داشکاندن",
  total: "کۆی گشتی",
  paid: "پارەدراو",
  debt: "قەرز",
};

describe("buildEscPosReceipt", () => {
  it("includes the invoice number and uses translated labels", () => {
    const iqd = decode(
      buildEscPosReceipt(
        {
          invoiceNumber: "INV-000001",
          storeName: "Al-Amal Supermarket",
          invoiceType: "CASH",
          currency: "IQD",
          lines: [{ name: "Cheese carton", quantity: "1", total: "52000 IQD" }],
          subTotal: "52000 IQD",
          discountAmount: "0 IQD",
          totalAmount: "52000 IQD",
          paidAmount: "52000 IQD",
          debtAmount: "0 IQD",
        },
        {
          subtotal: "Subtotal",
          discount: "Discount",
          total: "Total",
          paid: "Paid",
          debt: "Debt",
        },
      ),
    );
    expect(iqd).toContain("INV-000001");
    expect(iqd).toContain("Subtotal");
    expect(iqd).toContain("IQD");
  });
});

describe("buildEscPosRasterReceipt", () => {
  it("emits GS v 0 raster with Kurdish Sorani glyphs in the source lines", () => {
    const bytes = buildEscPosRasterReceipt(sample, labels);
    expect(bytes.length).toBeGreaterThan(100);
    // ESC @ init
    expect(bytes[0]).toBe(0x1b);
    expect(bytes[1]).toBe(0x40);
    // GS v 0
    expect(bytes[2]).toBe(0x1d);
    expect(bytes[3]).toBe(0x76);
    expect(bytes[4]).toBe(0x30);

    const longer = buildEscPosRasterReceipt(
      {
        ...sample,
        lines: [
          ...sample.lines,
          { name: "چا پ چ ک گ ڤ ۆ ێ ڵ ڕ", quantity: "2", total: "3000 IQD" },
        ],
      },
      labels,
    );
    expect(longer.length).toBeGreaterThan(bytes.length);
  });
});

describe("rgbaToMono and buildEscPosRasterFromMono", () => {
  it("packs black pixels into GS v 0 bytes", () => {
    const width = 16;
    const height = 2;
    const rgba = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i += 1) {
      const black = i % 2 === 0;
      rgba[i * 4] = black ? 0 : 255;
      rgba[i * 4 + 1] = black ? 0 : 255;
      rgba[i * 4 + 2] = black ? 0 : 255;
      rgba[i * 4 + 3] = 255;
    }
    const mono = rgbaToMono(rgba, width, height);
    expect(mono[0]).toBe(1);
    expect(mono[1]).toBe(0);
    const raster = buildEscPosRasterFromMono(width, height, mono);
    expect(raster[2]).toBe(0x1d);
    expect(raster.length).toBeGreaterThan(10);
  });
});
