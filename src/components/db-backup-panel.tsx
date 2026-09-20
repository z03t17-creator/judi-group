"use client";

import { useRef, useState, useTransition } from "react";
import { Download, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { BACKUP_FILE_EXT } from "@/lib/db-backup-shared";

type Status =
  | { kind: "idle" }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

const ERROR_KEYS = new Set([
  "unauthorized",
  "forbidden",
  "confirm_required",
  "file_required",
  "file_too_large",
  "invalid_json",
  "invalid_backup",
  "invalid_format",
  "unsupported_version",
  "missing_tables",
  "backup_failed",
  "restore_failed",
]);

export function DbBackupPanel() {
  const t = useTranslations("settings");
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmText, setConfirmText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function errorMessage(code: string | undefined, fallback: "backup_failed" | "restore_failed") {
    const key = code && ERROR_KEYS.has(code) ? code : fallback;
    return t(`backupError_${key}` as "backupError_backup_failed");
  }

  function onDownload() {
    setStatus({ kind: "idle" });
    startTransition(async () => {
      try {
        const res = await fetch("/api/backup", { method: "GET" });
        if (!res.ok) {
          const body = (await res.json().catch(() => null)) as { error?: string } | null;
          setStatus({
            kind: "error",
            message: errorMessage(body?.error, "backup_failed"),
          });
          return;
        }
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") ?? "";
        const match = /filename="([^"]+)"/.exec(disposition);
        const name = match?.[1] ?? `judi-backup${BACKUP_FILE_EXT}`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        setStatus({ kind: "ok", message: t("backupDownloadOk") });
      } catch {
        setStatus({ kind: "error", message: t("backupError_backup_failed") });
      }
    });
  }

  function onFileChange(fileList: FileList | null) {
    const file = fileList?.[0] ?? null;
    setFileName(file?.name ?? null);
    setStatus({ kind: "idle" });
  }

  function onRestore() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setStatus({ kind: "error", message: t("backupError_file_required") });
      return;
    }
    if (confirmText.trim() !== "RESTORE") {
      setStatus({ kind: "error", message: t("backupError_confirm_required") });
      return;
    }

    setStatus({ kind: "idle" });
    startTransition(async () => {
      try {
        const form = new FormData();
        form.set("file", file);
        form.set("confirm", "RESTORE");
        const res = await fetch("/api/backup/restore", {
          method: "POST",
          body: form,
        });
        const body = (await res.json().catch(() => null)) as
          | { error?: string; rows?: number; files?: number }
          | null;
        if (!res.ok) {
          setStatus({
            kind: "error",
            message: errorMessage(body?.error, "restore_failed"),
          });
          return;
        }
        setConfirmText("");
        if (fileRef.current) fileRef.current.value = "";
        setFileName(null);
        setStatus({
          kind: "ok",
          message: t("backupRestoreOk", {
            rows: body?.rows ?? 0,
            files: body?.files ?? 0,
          }),
        });
      } catch {
        setStatus({ kind: "error", message: t("backupError_restore_failed") });
      }
    });
  }

  return (
    <div className="space-y-5 text-start">
      <p className="text-sm text-fg-muted">{t("backupHint")}</p>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onDownload}
          className="btn btn-important"
        >
          <Download className="size-4" aria-hidden />
          {pending ? t("backupWorking") : t("backupDownload")}
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
        <p className="text-sm font-medium text-fg">{t("backupRestoreTitle")}</p>
        <p className="text-sm text-fg-muted">{t("backupRestoreWarn")}</p>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fg">
            {t("backupChooseFile")}
          </span>
          <input
            ref={fileRef}
            type="file"
            accept={`${BACKUP_FILE_EXT},application/json,.json`}
            disabled={pending}
            onChange={(e) => onFileChange(e.target.files)}
            className="block w-full min-h-touch cursor-pointer rounded-xl border border-line-strong bg-surface px-3 py-2 text-sm text-fg file:me-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-fg"
          />
          {fileName ? (
            <span className="mt-1 block text-xs text-fg-muted">{fileName}</span>
          ) : null}
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-fg">
            {t("backupConfirmLabel")}
          </span>
          <input
            type="text"
            value={confirmText}
            disabled={pending}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={t("backupConfirmPlaceholder")}
            autoComplete="off"
            spellCheck={false}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg placeholder:text-fg-subtle"
          />
        </label>

        <button
          type="button"
          disabled={pending || !fileName || confirmText.trim() !== "RESTORE"}
          onClick={onRestore}
          className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-600 px-4 text-sm font-semibold text-white disabled:opacity-50 dark:border-rose-800 dark:bg-rose-700"
        >
          <Upload className="size-4" aria-hidden />
          {pending ? t("backupWorking") : t("backupRestore")}
        </button>
      </div>

      {status.kind === "ok" ? (
        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300" role="status">
          {status.message}
        </p>
      ) : null}
      {status.kind === "error" ? (
        <p className="text-sm font-medium text-rose-700 dark:text-rose-300" role="alert">
          {status.message}
        </p>
      ) : null}
    </div>
  );
}
