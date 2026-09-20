/** Build a valid EAN-13 from a SKU (or any seed string). */
export function ean13Checksum(digits12: string): number {
  if (!/^\d{12}$/.test(digits12)) {
    throw new Error("EAN-13 body must be 12 digits");
  }
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    const n = Number(digits12[i]);
    sum += i % 2 === 0 ? n : n * 3;
  }
  return (10 - (sum % 10)) % 10;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function generateEan13FromSku(sku: string): string {
  const seed = sku.trim().toUpperCase() || "JUDI";
  const body = String(hashSeed(seed)).padStart(9, "0").slice(-9);
  const twelve = `628${body}`;
  return `${twelve}${ean13Checksum(twelve)}`;
}

/** Rough Arabic / Kurdish (Arabic script) → Latin for readable SKUs. */
const ARABIC_SCRIPT_MAP: Record<string, string> = {
  ا: "A",
  أ: "A",
  إ: "E",
  آ: "A",
  ء: "",
  ب: "B",
  پ: "P",
  ت: "T",
  ث: "TH",
  ج: "J",
  چ: "CH",
  ح: "H",
  خ: "KH",
  د: "D",
  ذ: "DH",
  ر: "R",
  ڕ: "R",
  ز: "Z",
  ژ: "ZH",
  س: "S",
  ش: "SH",
  ص: "S",
  ض: "D",
  ط: "T",
  ظ: "Z",
  ع: "A",
  غ: "GH",
  ف: "F",
  ڤ: "V",
  ق: "Q",
  ك: "K",
  ک: "K",
  گ: "G",
  ل: "L",
  ڵ: "L",
  م: "M",
  ن: "N",
  ه: "H",
  ھ: "H",
  ة: "A",
  و: "W",
  ۆ: "O",
  ۇ: "U",
  ی: "Y",
  ي: "Y",
  ێ: "E",
  ە: "E",
  ى: "Y",
  ئ: "",
  لا: "LA",
};

function transliterateArabicScript(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ARABIC_SCRIPT_MAP[ch] !== undefined) {
      out += ARABIC_SCRIPT_MAP[ch];
      continue;
    }
    if (/[A-Za-z0-9]/.test(ch)) {
      out += ch.toUpperCase();
      continue;
    }
    if (/\s|[-_/.,]/.test(ch)) {
      out += "-";
    }
  }
  return out;
}

function toSkuSlug(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Build a SKU from a product name (EN, AR, or CKB).
 * Example: "water king 150ml" → "WATER-KING-150ML"
 * Kurdish/Arabic names are transliterated locally (no AI API).
 */
export function generateSkuFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return `PRD-${String(Date.now()).slice(-6)}`;

  const latinDirect = toSkuSlug(
    trimmed.normalize("NFKD").replace(/[\u0300-\u036f]/g, ""),
  );

  const fromScript = toSkuSlug(transliterateArabicScript(trimmed));
  const latin =
    latinDirect.length >= 2 && /[A-Z]/.test(latinDirect)
      ? latinDirect
      : fromScript;

  const digits = (trimmed.match(/\d+/g) ?? []).join("-");

  if (latin.length >= 2 && /[A-Z]/.test(latin)) {
    return latin.slice(0, 28);
  }

  const suffix = hashSeed(trimmed).toString(36).toUpperCase().slice(0, 4);
  if (digits) {
    return `PRD-${digits}-${suffix}`.slice(0, 28);
  }
  return `PRD-${suffix}-${String(Date.now()).slice(-4)}`.slice(0, 28);
}
