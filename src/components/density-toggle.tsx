"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import type { DensityPreference } from "@/lib/theme";

export function DensityToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("settings");
  const { density, setDensity } = useTheme();

  const options: { value: DensityPreference; label: string }[] = [
    { value: "comfortable", label: t("densityBig") },
    { value: "compact", label: t("densitySmall") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("densityLabel")}
      className={`inline-flex min-h-touch rounded-xl border border-line bg-muted p-1 ${className}`}
    >
      {options.map((option) => {
        const active = density === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setDensity(option.value)}
            className={`min-h-[2.5rem] min-w-touch rounded-lg px-4 text-sm font-medium transition-colors ${
              active
                ? "bg-surface text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
