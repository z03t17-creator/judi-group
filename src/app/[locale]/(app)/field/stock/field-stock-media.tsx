"use client";

import { useTranslations } from "next-intl";
import { StockMediaPanel } from "@/components/stock-media-panel";
import { decideTransferAction } from "@/app/[locale]/(app)/dashboard/transfers/actions";

type TransferMediaRow = {
  id: string;
  label: string;
  primaryMediaUrl: string | null;
  lines: string[];
};

/**
 * Camera 4 on PAGE 20 — today's count-proof gallery + optional van-load transfer proof.
 */
export function FieldStockMediaSections({
  auditId,
  auditDateLabel,
  auditPrimaryUrl,
  transfers,
}: {
  auditId: string;
  auditDateLabel: string;
  auditPrimaryUrl: string | null;
  transfers: TransferMediaRow[];
}) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <div className="mb-3 text-start">
          <h2 className="font-semibold text-fg">{t("field.countPhotosTitle")}</h2>
          <p className="text-sm text-fg-muted">
            {t("field.countPhotosHint", { date: auditDateLabel })}
          </p>
        </div>
        <StockMediaPanel
          entityType="StockAudit"
          entityId={auditId}
          label={t("field.countPhotosTitle")}
          initialPrimaryUrl={auditPrimaryUrl}
          canEdit
          defaultOpen={false}
          size="md"
        />
      </section>

      {transfers.length > 0 ? (
        <section className="space-y-3">
          <div className="text-start">
            <h2 className="font-semibold text-fg">{t("field.loadPhotosTitle")}</h2>
            <p className="text-sm text-fg-muted">{t("field.loadPhotosHint")}</p>
          </div>
          {transfers.map((transfer) => (
            <article
              key={transfer.id}
              className="rounded-2xl border border-line bg-surface p-4 shadow-sm"
            >
              <p className="font-semibold text-fg">{transfer.label}</p>
              <ul className="mt-2 space-y-1 text-sm text-fg-muted">
                {transfer.lines.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <div className="mt-3">
                <StockMediaPanel
                  entityType="StockTransfer"
                  entityId={transfer.id}
                  label={transfer.label}
                  initialPrimaryUrl={transfer.primaryMediaUrl}
                  canEdit
                  size="sm"
                />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <form action={decideTransferAction}>
                  <input type="hidden" name="id" value={transfer.id} />
                  <input type="hidden" name="decision" value="ACCEPTED" />
                  <input type="hidden" name="from" value="field" />
                  <button
                    type="submit"
                    className="btn btn-important w-full text-lg"
                  >
                    {t("transfers.accept")}
                  </button>
                </form>
                <form action={decideTransferAction}>
                  <input type="hidden" name="id" value={transfer.id} />
                  <input type="hidden" name="decision" value="REJECTED" />
                  <input type="hidden" name="from" value="field" />
                  <button
                    type="submit"
                    className="min-h-touch w-full rounded-xl border border-red-300 px-4 text-lg font-semibold text-red-800 dark:border-red-800 dark:text-red-200"
                  >
                    {t("transfers.reject")}
                  </button>
                </form>
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}
