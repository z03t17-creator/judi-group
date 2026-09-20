/** Digits-only international number for wa.me / sms, or null if unusable. */
export function toInternationalPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "").replace(/^00/, "");
  if (!digits) return null;
  if (digits.startsWith("0") && digits.length >= 10) {
    digits = `964${digits.slice(1)}`;
  }
  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

export function whatsappHref(text: string, phone?: string | null): string {
  const encoded = encodeURIComponent(text);
  const intl = toInternationalPhone(phone);
  return intl ? `https://wa.me/${intl}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
}

export function telegramHref(text: string, url: string): string {
  const params = new URLSearchParams({ text, url });
  return `https://t.me/share/url?${params.toString()}`;
}

export function facebookHref(url: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export function viberHref(text: string): string {
  return `viber://forward?text=${encodeURIComponent(text)}`;
}

export function smsHref(text: string, phone?: string | null): string {
  const intl = toInternationalPhone(phone);
  const body = encodeURIComponent(text);
  return intl ? `sms:+${intl}?body=${body}` : `sms:?body=${body}`;
}

export function mailtoHref(subject: string, body: string): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type InvoiceShareFields = {
  brand: string;
  invoiceNumber: string;
  storeName: string;
  typeLabel: string;
  dateYmd: string;
  totalLabel: string;
  paidLabel: string;
  debtLabel: string;
  totalCaption: string;
  paidCaption: string;
  debtCaption: string;
};

export function invoiceShareText(fields: InvoiceShareFields, url?: string): string {
  const lines = [
    fields.brand,
    `${fields.invoiceNumber} · ${fields.typeLabel} · ${fields.dateYmd}`,
    fields.storeName,
    `${fields.totalCaption}: ${fields.totalLabel}`,
    `${fields.paidCaption}: ${fields.paidLabel}`,
    `${fields.debtCaption}: ${fields.debtLabel}`,
  ];
  if (url) lines.push(url);
  return lines.join("\n");
}
