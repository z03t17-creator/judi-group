"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import type { ThemePreference } from "@/lib/theme";

type ThemePickerProps = {
  className?: string;
};

/** Segmented Light / Dark / System control (settings surfaces). */
export function ThemePicker({ className = "" }: ThemePickerProps) {
  const t = useTranslations("settings");
  const { theme, setTheme } = useTheme();

  const options: {
    value: ThemePreference;
    label: string;
    icon: typeof Sun;
  }[] = [
    { value: "light", label: t("themeLight"), icon: Sun },
    { value: "dark", label: t("themeDark"), icon: Moon },
    { value: "system", label: t("themeSystem"), icon: Monitor },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("themeLabel")}
      className={`inline-flex min-h-touch rounded-xl border border-line bg-muted p-1 ${className}`}
    >
      {options.map((option) => {
        const active = theme === option.value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={`inline-flex min-h-[2.5rem] min-w-touch items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors sm:px-4 ${
              active
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
