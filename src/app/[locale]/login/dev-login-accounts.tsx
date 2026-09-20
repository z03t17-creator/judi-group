"use client";

import { useFormStatus } from "react-dom";
import { Building2, Shield, Truck, Wallet, Warehouse } from "lucide-react";
import { useTranslations } from "next-intl";
import type { DevLoginAccount } from "@/lib/dev-accounts";
import { devLoginAction } from "./actions";

const ROLE_ICON = {
  ADMIN: Shield,
  WAREHOUSE_ACCOUNTANT: Warehouse,
  COLLECTOR_ACCOUNTANT: Wallet,
  FIELD_DELEGATE: Truck,
} as const;

function AccountButton({ account }: { account: DevLoginAccount }) {
  const t = useTranslations("auth");
  const tRoles = useTranslations("roles");
  const { pending } = useFormStatus();
  const Icon = ROLE_ICON[account.role] ?? Building2;
  const field = account.role === "FIELD_DELEGATE";

  const ROLE_TONE = {
    ADMIN: "tone-rose",
    WAREHOUSE_ACCOUNTANT: "tone-indigo",
    COLLECTOR_ACCOUNTANT: "tone-emerald",
    FIELD_DELEGATE: "tone-amber",
  } as const;

  return (
    <button
      type="submit"
      disabled={pending}
      className={`flex min-h-touch w-full items-center gap-3 rounded-2xl border bg-surface px-3 py-3 text-start hover:bg-muted disabled:opacity-70 ${
        field ? "tile-tone-amber" : "tile-tone-sky"
      }`}
      aria-label={t("devSignInAs", { name: account.fullName })}
    >
      <span className={`icon-badge icon-badge-md ${ROLE_TONE[account.role]}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-fg">
          {pending ? t("submitting") : account.fullName}
        </span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {tRoles(account.role)} · {account.email}
        </span>
        <span className="mt-0.5 block text-xs text-fg-subtle">
          {field ? t("roleHintFieldTitle") : t("roleHintOfficeTitle")}
        </span>
      </span>
    </button>
  );
}

export function DevLoginAccounts({
  accounts,
  seedPassword,
}: {
  accounts: readonly DevLoginAccount[];
  seedPassword: string;
}) {
  const t = useTranslations("auth");

  if (accounts.length === 0) return null;

  return (
    <div className="mb-4 rounded-2xl border border-dashed border-judi-400/70 bg-accent-soft/60 p-4 sm:mb-5 sm:p-5">
      <p className="text-sm font-semibold text-fg">{t("devAccountsTitle")}</p>
      <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">
        {t("devAccountsHint")}
      </p>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {accounts.map((account) => (
          <li key={account.email}>
            <form action={devLoginAction}>
              <input type="hidden" name="email" value={account.email} />
              <input type="hidden" name="password" value={seedPassword} />
              <AccountButton account={account} />
            </form>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-subtle">
        {t("devPasswordShared", { password: seedPassword })}
      </p>
    </div>
  );
}
