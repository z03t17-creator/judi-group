"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

export function ExpensesPeriodForm({
  from,
  to,
}: {
  from: string;
  to: string;
}) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextFrom = String(data.get("from") || from);
    const nextTo = String(data.get("to") || to);
    const params = new URLSearchParams();
    params.set("from", nextFrom);
    params.set("to", nextTo);
    startTransition(() => {
      router.replace(`/dashboard/expenses?${params.toString()}`);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="surface-panel flex flex-wrap items-end gap-3 p-3"
      aria-labelledby="expenses-period-heading"
    >
      <div className="min-w-0 flex-1 text-start">
        <h2 id="expenses-period-heading" className="text-sm font-semibold text-fg">
          {t("expenses.periodTitle")}
        </h2>
        <p className="text-xs text-fg-muted">{t("expenses.periodHint")}</p>
      </div>
      <label className="block space-y-1 text-start">
        <span className="text-xs font-medium text-fg-muted">{t("expenses.from")}</span>
        <input
          type="date"
          name="from"
          defaultValue={from}
          className="min-h-touch rounded-xl border border-line-strong bg-muted px-3 text-sm text-fg focus:border-judi-500 focus:bg-surface"
        />
      </label>
      <label className="block space-y-1 text-start">
        <span className="text-xs font-medium text-fg-muted">{t("expenses.to")}</span>
        <input
          type="date"
          name="to"
          defaultValue={to}
          className="min-h-touch rounded-xl border border-line-strong bg-muted px-3 text-sm text-fg focus:border-judi-500 focus:bg-surface"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn btn-important"
      >
        {pending ? t("expenses.applying") : t("expenses.applyPeriod")}
      </button>
    </form>
  );
}
