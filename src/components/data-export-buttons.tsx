"use client";

import { Download, FileDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { isRtlLocale } from "@/lib/constants";
import { downloadCsv, openPrintableTablePdf } from "@/lib/export/download";

export type DataExportButtonsProps = {
  title: string;
  subtitle?: string;
  metaLines?: readonly string[];
  fileBase: string;
  headers: readonly string[];
  rows: readonly (readonly (string | number | null | undefined)[])[];
  className?: string;
};

export function DataExportButtons({
  title,
  subtitle,
  metaLines,
  fileBase,
  headers,
  rows,
  className = "",
}: DataExportButtonsProps) {
  const t = useTranslations("export");
  const locale = useLocale();
  const disabled = rows.length === 0;

  function onCsv() {
    if (disabled) {
      window.alert(t("empty"));
      return;
    }
    downloadCsv({ fileBase, headers, rows });
  }

  function onPdf() {
    if (disabled) {
      window.alert(t("empty"));
      return;
    }
    openPrintableTablePdf({
      title,
      subtitle,
      metaLines: [
        ...(metaLines ?? []),
        t("rowCount", { count: rows.length }),
      ],
      headers,
      rows,
      dir: isRtlLocale(locale) ? "rtl" : "ltr",
      printBlockedMessage: t("printBlocked"),
      generatedLabel: t("generatedAt", {
        when: new Date().toLocaleString(locale),
      }),
    });
  }

  return (
    <div
      role="group"
      aria-label={t("groupLabel")}
      className={`flex flex-wrap gap-2 ${className}`}
    >
      <button
        type="button"
        onClick={onCsv}
        disabled={disabled}
        className="btn btn-regular"
      >
        <Download className="size-4 shrink-0" aria-hidden />
        {t("csv")}
      </button>
      <button
        type="button"
        onClick={onPdf}
        disabled={disabled}
        className="btn btn-info"
      >
        <FileDown className="size-4 shrink-0" aria-hidden />
        {t("pdf")}
      </button>
    </div>
  );
}
