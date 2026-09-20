"use client";

import { useActionState, useId, useState } from "react";
import { Eye, EyeOff, KeyRound, LogIn, Mail } from "lucide-react";
import { useTranslations } from "next-intl";
import { loginAction, type LoginState } from "./actions";

export function LoginForm({
  callbackUrl,
  warehouseError,
}: {
  callbackUrl?: string;
  warehouseError?: boolean;
}) {
  const t = useTranslations("auth");
  const [state, action, pending] = useActionState<LoginState, FormData>(
    loginAction,
    undefined,
  );
  const [showPassword, setShowPassword] = useState(false);
  const emailId = useId();
  const passwordId = useId();

  return (
    <form action={action} className="space-y-0">
      {callbackUrl ? (
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
      ) : null}

      <div className="space-y-5 rounded-2xl border border-line bg-surface p-5 shadow-sm sm:p-7 lg:p-8">
        <div className="text-start">
          <label
            htmlFor={emailId}
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            {t("email")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-judi-700 dark:text-judi-300">
              <Mail className="size-5" aria-hidden />
            </span>
            <input
              id={emailId}
              className="min-h-12 w-full rounded-xl border border-line-strong bg-muted pe-3 ps-12 text-start text-base text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface sm:min-h-[3.25rem]"
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              required
              placeholder={t("emailPlaceholder")}
              aria-describedby={`${emailId}-hint`}
            />
          </div>
          <p id={`${emailId}-hint`} className="mt-1.5 text-xs text-fg-subtle">
            {t("emailHint")}
          </p>
        </div>

        <div className="text-start">
          <label
            htmlFor={passwordId}
            className="mb-1.5 block text-sm font-medium text-fg"
          >
            {t("password")}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3.5 text-judi-700 dark:text-judi-300">
              <KeyRound className="size-5" aria-hidden />
            </span>
            <input
              id={passwordId}
              className="min-h-12 w-full rounded-xl border border-line-strong bg-muted pe-14 ps-12 text-start text-base text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface sm:min-h-[3.25rem]"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              minLength={8}
              placeholder={t("passwordPlaceholder")}
              aria-describedby={`${passwordId}-hint`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute inset-y-0 end-0 inline-flex min-h-touch min-w-touch items-center justify-center rounded-e-xl px-3 text-fg-subtle hover:text-judi-800 dark:hover:text-judi-200"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? (
                <EyeOff className="size-5" aria-hidden />
              ) : (
                <Eye className="size-5" aria-hidden />
              )}
            </button>
          </div>
          <p id={`${passwordId}-hint`} className="mt-1.5 text-xs text-fg-subtle">
            {t("passwordHint")}
          </p>
        </div>

        {state?.error || warehouseError ? (
          <p
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-start text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200"
            role="alert"
          >
            {warehouseError ? t("requiredWarehouse") : t("invalid")}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          data-testid="login-submit"
          className="btn btn-important hidden w-full min-h-[3.25rem] text-base sm:inline-flex"
        >
          <LogIn className="size-5 shrink-0" aria-hidden />
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>

      <div className="sticky-form-actions mt-3 rounded-2xl border border-line sm:hidden">
        <button
          type="submit"
          disabled={pending}
          data-testid="login-submit"
          className="btn btn-important w-full text-base"
        >
          <LogIn className="size-5 shrink-0" aria-hidden />
          {pending ? t("submitting") : t("submit")}
        </button>
      </div>
    </form>
  );
}
