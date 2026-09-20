"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import type { ThemePreference } from "@/lib/theme";

type ThemeToggleProps = {
  className?: string;
};

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  light: "dark",
  dark: "system",
  system: "light",
};

/** Compact chrome control: cycles light → dark → system. */
export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const t = useTranslations("settings");
  const { theme, toggleTheme } = useTheme();
  const next = NEXT_THEME[theme];

  const label =
    next === "light"
      ? t("themeToLight")
      : next === "dark"
        ? t("themeToDark")
        : t("themeToSystem");

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={t("themeLabel")}
      className={`chrome-btn chrome-btn-theme ${className}`}
    >
      {theme === "light" ? (
        <Sun className="size-4 lg:size-5" aria-hidden />
      ) : theme === "dark" ? (
        <Moon className="size-4 lg:size-5" aria-hidden />
      ) : (
        <Monitor className="size-4 lg:size-5" aria-hidden />
      )}
    </button>
  );
}
