"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = {
  en: "EN",
  ar: "عربي",
  ckb: "کوردی",
};

/** Short codes for the collapsed office rail (phone / tablet). */
const SHORT_LABELS: Record<string, string> = {
  en: "EN",
  ar: "ع",
  ckb: "ک",
};

type LocaleSwitcherProps = {
  /** `surface` follows page theme; `chrome` is for dark brand rails */
  tone?: "surface" | "chrome";
  /**
   * `inline` — horizontal chips (headers, desktop sidebar).
   * `rail` — stacked short codes below `lg`, full labels from `lg`.
   */
  layout?: "inline" | "rail";
};

export function LocaleSwitcher({
  tone = "surface",
  layout = "inline",
}: LocaleSwitcherProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const isRail = layout === "rail";

  return (
    <nav
      aria-label={t("language")}
      className={
        isRail
          ? "flex w-full flex-col items-stretch gap-1 lg:flex-row lg:items-center"
          : "flex items-center gap-1"
      }
    >
      {routing.locales.map((code) => {
        const active = code === locale;
        const className =
          tone === "chrome"
            ? active
              ? "bg-judi-600 text-white"
              : "border border-judi-700/60 bg-judi-900/40 text-judi-50 hover:bg-judi-800"
            : active
              ? "chip-on"
              : "chip-off";

        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            title={LABELS[code] ?? code}
            className={`inline-flex min-h-touch items-center justify-center rounded-lg font-medium ${className} ${
              isRail
                ? "w-full px-1 text-xs lg:w-auto lg:min-w-touch lg:px-3 lg:text-sm"
                : "min-w-touch px-3 text-sm"
            }`}
          >
            {isRail ? (
              <>
                <span className="lg:hidden">{SHORT_LABELS[code] ?? code}</span>
                <span className="hidden lg:inline">{LABELS[code] ?? code}</span>
              </>
            ) : (
              (LABELS[code] ?? code)
            )}
          </Link>
        );
      })}
    </nav>
  );
}
