import { describe, expect, it } from "vitest";
import {
  facebookHref,
  invoiceShareText,
  mailtoHref,
  smsHref,
  telegramHref,
  toInternationalPhone,
  whatsappHref,
} from "@/lib/invoice-share";

describe("toInternationalPhone", () => {
  it("converts Iraq local 07 numbers to 964", () => {
    expect(toInternationalPhone("07501234567")).toBe("9647501234567");
  });

  it("keeps already-international numbers", () => {
    expect(toInternationalPhone("+964 750 123 4567")).toBe("9647501234567");
    expect(toInternationalPhone("009647501234567")).toBe("9647501234567");
  });

  it("returns null for empty or too-short values", () => {
    expect(toInternationalPhone(null)).toBeNull();
    expect(toInternationalPhone("123")).toBeNull();
  });
});

describe("share hrefs", () => {
  it("targets the store on WhatsApp when a phone exists", () => {
    expect(whatsappHref("hello", "07501234567")).toBe(
      "https://wa.me/9647501234567?text=hello",
    );
  });

  it("opens the WhatsApp chooser without a phone", () => {
    expect(whatsappHref("hello")).toBe("https://wa.me/?text=hello");
  });

  it("builds telegram, facebook, sms, and mailto links", () => {
    expect(telegramHref("hi", "https://judi.example/inv")).toContain("t.me/share/url");
    expect(facebookHref("https://judi.example/inv")).toContain("facebook.com/sharer");
    expect(smsHref("hi", "07501234567")).toBe("sms:+9647501234567?body=hi");
    expect(mailtoHref("INV-1", "body")).toBe("mailto:?subject=INV-1&body=body");
  });
});

describe("invoiceShareText", () => {
  it("joins a short summary with an optional url", () => {
    const text = invoiceShareText(
      {
        brand: "Judi",
        invoiceNumber: "INV-000001",
        storeName: "Al-Amal",
        typeLabel: "Cash",
        dateYmd: "2026-09-16",
        totalLabel: "52,000 IQD",
        paidLabel: "52,000 IQD",
        debtLabel: "0 IQD",
        totalCaption: "Total",
        paidCaption: "Paid",
        debtCaption: "On account",
      },
      "https://example.com/inv",
    );
    expect(text).toContain("INV-000001 · Cash · 2026-09-16");
    expect(text).toContain("https://example.com/inv");
  });
});
