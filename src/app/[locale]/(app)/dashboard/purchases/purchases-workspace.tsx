"use client";

import { useState, type ReactNode } from "react";
import { ClipboardList, ShoppingCart } from "lucide-react";
import { useTranslations } from "next-intl";

type Tab = "new" | "list";

export function PurchasesWorkspace({
  canManage,
  initialTab = "new",
  form,
  directory,
}: {
  canManage: boolean;
  initialTab?: Tab;
  form: ReactNode;
  directory: ReactNode;
}) {
  const t = useTranslations("purchases");
  const [tab, setTab] = useState<Tab>(canManage ? initialTab : "list");

  if (!canManage) return <>{directory}</>;

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={t("title")}
        className="grid grid-cols-2 gap-1 rounded-xl border border-line-strong bg-muted p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "new"}
          onClick={() => setTab("new")}
          className={`inline-flex h-10 min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
            tab === "new"
              ? "seg-on"
              : "text-fg-muted hover:bg-surface hover:text-fg"
          }`}
        >
          <ShoppingCart className="size-4 shrink-0" aria-hidden />
          {t("tabNew")}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "list"}
          onClick={() => setTab("list")}
          className={`inline-flex h-10 min-h-10 items-center justify-center gap-1.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
            tab === "list"
              ? "seg-on"
              : "text-fg-muted hover:bg-surface hover:text-fg"
          }`}
        >
          <ClipboardList className="size-4 shrink-0" aria-hidden />
          {t("tabList")}
        </button>
      </div>
      {tab === "new" ? form : directory}
    </div>
  );
}
