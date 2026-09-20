"use client";

import { ArrowDownToLine, PackageMinus } from "lucide-react";
import { useTranslations } from "next-intl";
import { StockMediaPanel } from "@/components/stock-media-panel";
import { Thumb } from "@/components/thumb";

export type RecentMovementRow = {
  id: string;
  type: "RECEIVE" | "WRITE_OFF";
  productLabel: string;
  qtyLabel: string;
  notes: string | null;
  createdAtLabel: string;
  primaryMediaUrl: string | null;
  productMediaUrl?: string | null;
};

export function RecentStockMovements({
  movements,
  focusMovementId,
  canEdit,
}: {
  movements: RecentMovementRow[];
  focusMovementId?: string;
  canEdit: boolean;
}) {
  const t = useTranslations("stock");

  if (movements.length === 0) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-10 text-center">
        <p className="text-sm font-medium text-fg">{t("recentEmptyTitle")}</p>
        <p className="max-w-sm text-sm text-fg-muted">{t("recentEmptyHint")}</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="text-start">
        <h2 className="font-semibold text-fg">{t("recentTitle")}</h2>
        <p className="text-sm text-fg-muted">{t("recentHint")}</p>
      </div>

      <ul className="space-y-3">
        {movements.map((movement) => {
          const focused = focusMovementId === movement.id;
          const TypeIcon =
            movement.type === "RECEIVE" ? ArrowDownToLine : PackageMinus;
          return (
            <li
              key={movement.id}
              className={`rounded-2xl border bg-surface p-4 shadow-sm ${
                focused ? "border-judi-500 ring-2 ring-judi-500/30" : "border-line"
              }`}
            >
              <div className="flex items-start gap-3">
                <Thumb
                  kind="product"
                  size="sm"
                  src={movement.productMediaUrl}
                  alt=""
                />
                <div className="min-w-0 flex-1 text-start">
                  <p className="font-semibold text-fg">{movement.productLabel}</p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
                    <span
                      className={`inline-flex min-h-touch items-center gap-1.5 rounded-xl px-3 text-xs font-medium ${
                        movement.type === "RECEIVE"
                          ? "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
                          : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                      }`}
                    >
                      <TypeIcon className="size-3.5" aria-hidden />
                      {movement.type === "RECEIVE" ? t("receive") : t("writeOff")}
                    </span>
                    <span className="tabular-nums">{movement.qtyLabel}</span>
                    <span aria-hidden className="text-line-strong">
                      ·
                    </span>
                    <span>{movement.createdAtLabel}</span>
                  </p>
                  {movement.notes ? (
                    <p className="mt-1 text-sm text-fg-muted">{movement.notes}</p>
                  ) : null}
                </div>
              </div>

              <div className="mt-3">
                <StockMediaPanel
                  entityType="StockMovement"
                  entityId={movement.id}
                  label={movement.productLabel}
                  initialPrimaryUrl={movement.primaryMediaUrl}
                  canEdit={canEdit}
                  defaultOpen={focused}
                  size="sm"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
