"use client";

import { LogOut } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { signOutAction } from "@/components/sign-out-action";

type SignOutButtonProps = {
  variant?: "default" | "sidebar";
};

export function SignOutButton({ variant = "default" }: SignOutButtonProps) {
  const t = useTranslations("nav");
  const locale = useLocale();
  const label = t("signOut");

  if (variant === "sidebar") {
    return (
      <form
        action={async () => {
          await signOutAction(locale);
        }}
      >
        <button
          type="submit"
          title={label}
          aria-label={label}
          className="btn btn-danger w-full px-2 lg:px-4"
        >
          <LogOut className="size-4 shrink-0" aria-hidden />
          <span className="hidden lg:inline">{label}</span>
        </button>
      </form>
    );
  }

  return (
    <form
      action={async () => {
        await signOutAction(locale);
      }}
    >
      <button
        type="submit"
        className="btn btn-danger"
      >
        {label}
      </button>
    </form>
  );
}
