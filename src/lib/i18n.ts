import type { AppLocale } from "@/lib/constants";

export type LocalizedText = {
  en: string;
  ar: string;
  ckb: string;
};

export function isLocalizedText(value: unknown): value is LocalizedText {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.en === "string" &&
    typeof record.ar === "string" &&
    typeof record.ckb === "string"
  );
}

export function localized(value: unknown, locale: string): string {
  if (isLocalizedText(value)) {
    const key = (locale as AppLocale) in value ? (locale as AppLocale) : "en";
    return (
      value[key]?.trim() ||
      value.en?.trim() ||
      value.ar?.trim() ||
      value.ckb?.trim() ||
      ""
    );
  }
  if (typeof value === "string") return value;
  return "";
}
