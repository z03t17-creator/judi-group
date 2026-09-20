"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ImagePlus,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { CameraCapture } from "@/components/camera-capture";
import { Thumb } from "@/components/thumb";
import { compressImageToJpeg } from "@/lib/media-compress";
import type { AppMediaKind, MediaAssetDto } from "@/lib/media-shared";
import { thumbKindForMedia } from "@/lib/media-shared";

type MediaGalleryProps = {
  kind: AppMediaKind;
  entityType: string;
  entityId: string;
  /** When false, hide create / update / delete (read-only). Default true. */
  canEdit?: boolean;
  /** Dense sidebar layout: short empty state, 2-col grid, no gallery title. */
  compact?: boolean;
  className?: string;
  /** Called after any successful mutation so parents can refresh thumbs. */
  onChanged?: (items: MediaAssetDto[]) => void;
};

export function MediaGallery({
  kind,
  entityType,
  entityId,
  canEdit = true,
  compact = false,
  className = "",
  onChanged,
}: MediaGalleryProps) {
  const t = useTranslations("media");
  const onChangedRef = useRef(onChanged);
  onChangedRef.current = onChanged;
  const storageRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<MediaAssetDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [replaceId, setReplaceId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [captionDraft, setCaptionDraft] = useState("");
  const [editingCaption, setEditingCaption] = useState(false);
  const [busy, setBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const thumbKind = thumbKindForMedia(kind);

  useEffect(() => {
    setMounted(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ entityType, entityId, kind });
      const res = await fetch(`/api/media?${qs.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("load_failed");
      const data = (await res.json()) as { items: MediaAssetDto[] };
      setItems(data.items);
      onChangedRef.current?.(data.items);
    } catch {
      setError(t("loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [entityId, entityType, kind, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function uploadBlob(blob: Blob) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", blob, "capture.jpg");
      if (replaceId) {
        const res = await fetch(`/api/media/${replaceId}`, {
          method: "PATCH",
          body: form,
        });
        if (!res.ok) throw new Error("upload_failed");
      } else {
        form.set("kind", kind);
        form.set("entityType", entityType);
        form.set("entityId", entityId);
        const res = await fetch("/api/media", { method: "POST", body: form });
        if (!res.ok) throw new Error("upload_failed");
      }
      setReplaceId(null);
      await load();
    } catch {
      setError(t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleStorageFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || busy) return;
    try {
      const blob = await compressImageToJpeg(file);
      await uploadBlob(blob);
    } catch {
      setError(t("uploadFailed"));
    } finally {
      if (storageRef.current) storageRef.current.value = "";
    }
  }

  async function setPrimary(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrimary: true }),
      });
      if (!res.ok) throw new Error("update_failed");
      await load();
    } catch {
      setError(t("updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function saveCaption(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: captionDraft.trim() || null }),
      });
      if (!res.ok) throw new Error("update_failed");
      setEditingCaption(false);
      await load();
    } catch {
      setError(t("updateFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleteId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/media/${deleteId}`, { method: "DELETE" });
      if (!res.ok) {
        if (res.status === 403) throw new Error("forbidden");
        throw new Error("delete_failed");
      }
      if (lightboxIndex !== null) setLightboxIndex(null);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(
        err instanceof Error && err.message === "forbidden"
          ? t("deleteForbidden")
          : t("deleteFailed"),
      );
    } finally {
      setBusy(false);
    }
  }

  const active = lightboxIndex !== null ? items[lightboxIndex] : null;
  const actionBtnClass = compact
    ? "inline-flex min-h-touch flex-1 items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-semibold"
    : "inline-flex min-h-touch items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold";

  return (
    <section className={`space-y-2 ${className}`}>
      <div
        className={`flex gap-2 ${
          compact ? "flex-col" : "flex-wrap items-center justify-between"
        }`}
      >
        {compact ? (
          <span className="sr-only">{t("galleryTitle")}</span>
        ) : (
          <h3 className="text-sm font-semibold text-fg text-start">
            {t("galleryTitle")}
          </h3>
        )}
        {canEdit ? (
          <div className={`flex gap-2 ${compact ? "w-full" : ""}`}>
            <button
              type="button"
              onClick={() => {
                setReplaceId(null);
                setCameraOpen(true);
              }}
              disabled={busy}
              className={`${actionBtnClass} bg-judi-700 text-white hover:bg-judi-800 disabled:opacity-60 dark:bg-judi-500 dark:text-judi-950 dark:hover:bg-judi-400`}
            >
              <Camera className="size-4 shrink-0" aria-hidden />
              {t("addPhoto")}
            </button>
            <button
              type="button"
              onClick={() => {
                setReplaceId(null);
                storageRef.current?.click();
              }}
              disabled={busy}
              className={`${actionBtnClass} border border-line-strong bg-surface text-fg hover:bg-muted disabled:opacity-60`}
            >
              <FolderOpen className="size-4 shrink-0" aria-hidden />
              {t("chooseStorage")}
            </button>
          </div>
        ) : null}
      </div>

      {/* Storage / file library — no capture attr (shared on every camera page). */}
      <input
        ref={storageRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleStorageFile(e.target.files)}
      />

      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-fg-muted">{t("loading")}</p>
      ) : items.length === 0 ? (
        <div
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-line bg-muted text-center ${
            compact ? "px-2 py-3" : "gap-2 px-3 py-5"
          }`}
        >
          {!compact ? <Thumb kind={thumbKind} size="md" alt="" /> : null}
          <p className="text-xs font-medium text-fg">{t("emptyTitle")}</p>
          {canEdit && !compact ? (
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted"
              >
                <ImagePlus className="size-4" aria-hidden />
                {t("takeFirst")}
              </button>
              <button
                type="button"
                onClick={() => storageRef.current?.click()}
                className="inline-flex min-h-touch items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted"
              >
                <FolderOpen className="size-4" aria-hidden />
                {t("chooseStorage")}
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <ul
          className={
            compact
              ? "grid grid-cols-2 gap-2"
              : "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
          }
        >
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  setLightboxIndex(index);
                  setCaptionDraft(item.caption ?? "");
                  setEditingCaption(false);
                }}
                className="group relative flex min-h-touch w-full flex-col overflow-hidden rounded-xl border border-line bg-surface text-start focus-visible:outline-none"
              >
                <span className="relative aspect-square w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element -- auth-gated local upload URLs */}
                  <img
                    src={item.url}
                    alt={item.caption ?? ""}
                    className="size-full object-cover"
                  />
                  {item.isPrimary ? (
                    <span className="absolute start-1 top-1 inline-flex items-center gap-1 rounded-lg bg-judi-700 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                      <Star className="size-3" aria-hidden />
                      {t("primary")}
                    </span>
                  ) : null}
                </span>
                {item.caption ? (
                  <span className="line-clamp-2 px-2 py-1.5 text-xs text-fg-muted">
                    {item.caption}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      <CameraCapture
        open={cameraOpen}
        kind={kind}
        onClose={() => {
          setCameraOpen(false);
          setReplaceId(null);
        }}
        onCaptured={(blob) => uploadBlob(blob)}
      />

      {mounted && active && lightboxIndex !== null
        ? createPortal(
            <Lightbox
              item={active}
              index={lightboxIndex}
              total={items.length}
              canEdit={canEdit}
              busy={busy}
              editingCaption={editingCaption}
              captionDraft={captionDraft}
              onCaptionDraft={setCaptionDraft}
              onEditCaption={() => setEditingCaption(true)}
              onCancelCaption={() => {
                setEditingCaption(false);
                setCaptionDraft(active.caption ?? "");
              }}
              onSaveCaption={() => void saveCaption(active.id)}
              onClose={() => setLightboxIndex(null)}
              onPrev={() => {
                const next = (lightboxIndex - 1 + items.length) % items.length;
                setLightboxIndex(next);
                setCaptionDraft(items[next]?.caption ?? "");
                setEditingCaption(false);
              }}
              onNext={() => {
                const next = (lightboxIndex + 1) % items.length;
                setLightboxIndex(next);
                setCaptionDraft(items[next]?.caption ?? "");
                setEditingCaption(false);
              }}
              onSetPrimary={() => void setPrimary(active.id)}
              onReplaceCamera={() => {
                setReplaceId(active.id);
                setLightboxIndex(null);
                setCameraOpen(true);
              }}
              onReplaceStorage={() => {
                setReplaceId(active.id);
                setLightboxIndex(null);
                storageRef.current?.click();
              }}
              onDelete={() => setDeleteId(active.id)}
            />,
            document.body,
          )
        : null}

      {mounted && deleteId
        ? createPortal(
            <ConfirmSheet
              title={t("deleteTitle")}
              body={t("deleteBody")}
              confirmLabel={t("deleteConfirm")}
              cancelLabel={t("cancel")}
              busy={busy}
              onCancel={() => setDeleteId(null)}
              onConfirm={() => void confirmDelete()}
            />,
            document.body,
          )
        : null}
    </section>
  );
}

type LightboxProps = {
  item: MediaAssetDto;
  index: number;
  total: number;
  canEdit: boolean;
  busy: boolean;
  editingCaption: boolean;
  captionDraft: string;
  onCaptionDraft: (value: string) => void;
  onEditCaption: () => void;
  onCancelCaption: () => void;
  onSaveCaption: () => void;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSetPrimary: () => void;
  onReplaceCamera: () => void;
  onReplaceStorage: () => void;
  onDelete: () => void;
};

function Lightbox({
  item,
  index,
  total,
  canEdit,
  busy,
  editingCaption,
  captionDraft,
  onCaptionDraft,
  onEditCaption,
  onCancelCaption,
  onSaveCaption,
  onClose,
  onPrev,
  onNext,
  onSetPrimary,
  onReplaceCamera,
  onReplaceStorage,
  onDelete,
}: LightboxProps) {
  const t = useTranslations("media");
  const titleId = useId();
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-stone-950/95 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchStartX == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
        if (dx > 60) onPrev();
        else if (dx < -60) onNext();
        setTouchStartX(null);
      }}
    >
      <header className="flex min-h-touch shrink-0 items-center justify-between gap-2 px-3 py-2">
        <p id={titleId} className="text-sm font-medium tabular-nums">
          {t("viewerCounter", { current: index + 1, total })}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl hover:bg-white/10"
          aria-label={t("close")}
        >
          <X className="size-6" aria-hidden />
        </button>
      </header>

      <div className="relative flex min-h-0 flex-1 items-center justify-center px-2">
        {total > 1 ? (
          <button
            type="button"
            onClick={onPrev}
            className="absolute start-1 z-10 inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl bg-black/40 hover:bg-black/60"
            aria-label={t("previous")}
          >
            <ChevronLeft className="size-7 rtl:rotate-180" aria-hidden />
          </button>
        ) : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.url}
          alt={item.caption ?? ""}
          className="max-h-full max-w-full object-contain"
        />
        {total > 1 ? (
          <button
            type="button"
            onClick={onNext}
            className="absolute end-1 z-10 inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl bg-black/40 hover:bg-black/60"
            aria-label={t("next")}
          >
            <ChevronRight className="size-7 rtl:rotate-180" aria-hidden />
          </button>
        ) : null}
      </div>

      <div className="shrink-0 space-y-3 border-t border-white/10 px-3 pb-4 pt-3">
        {editingCaption ? (
          <div className="flex flex-col gap-2">
            <label className="sr-only" htmlFor="media-caption">
              {t("caption")}
            </label>
            <input
              id="media-caption"
              value={captionDraft}
              onChange={(e) => onCaptionDraft(e.target.value)}
              maxLength={280}
              className="min-h-touch w-full rounded-xl border border-white/20 bg-white/10 px-3 text-start text-white placeholder:text-stone-400"
              placeholder={t("captionPlaceholder")}
            />
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onSaveCaption}
                disabled={busy}
                className="min-h-touch rounded-xl bg-judi-500 px-4 font-semibold text-judi-950 disabled:opacity-50"
              >
                {t("save")}
              </button>
              <button
                type="button"
                onClick={onCancelCaption}
                className="min-h-touch rounded-xl border border-white/25 px-4 font-medium"
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        ) : (
          <p className="min-h-6 text-sm text-stone-200 text-start">
            {item.caption || t("noCaption")}
          </p>
        )}

        {canEdit ? (
          <div className="grid grid-cols-2 gap-2">
            {!item.isPrimary ? (
              <button
                type="button"
                onClick={onSetPrimary}
                disabled={busy}
                className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
              >
                <Star className="size-4 shrink-0" aria-hidden />
                {t("setPrimary")}
              </button>
            ) : (
              <span className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-judi-700/80 px-3 text-sm font-semibold">
                <Star className="size-4 shrink-0" aria-hidden />
                {t("primary")}
              </span>
            )}
            <button
              type="button"
              onClick={onEditCaption}
              disabled={busy}
              className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
            >
              <Pencil className="size-4 shrink-0" aria-hidden />
              {t("editCaption")}
            </button>
            <button
              type="button"
              onClick={onReplaceCamera}
              disabled={busy}
              className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
            >
              <Camera className="size-4 shrink-0" aria-hidden />
              {t("replace")}
            </button>
            <button
              type="button"
              onClick={onReplaceStorage}
              disabled={busy}
              className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-sm font-medium hover:bg-white/10 disabled:opacity-50"
            >
              <FolderOpen className="size-4 shrink-0" aria-hidden />
              {t("chooseStorage")}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={busy}
              className="col-span-2 inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-red-400/40 px-3 text-sm font-medium text-red-200 hover:bg-red-500/20 disabled:opacity-50"
            >
              <Trash2 className="size-4 shrink-0" aria-hidden />
              {t("delete")}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ConfirmSheet({
  title,
  body,
  confirmLabel,
  cancelLabel,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const titleId = useId();
  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-3 sm:items-center"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-4 text-fg shadow-xl"
        style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <h3 id={titleId} className="text-base font-semibold text-start">
          {title}
        </h3>
        <p className="mt-2 text-sm text-fg-muted text-start">{body}</p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-xl bg-red-700 px-4 font-semibold text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="inline-flex min-h-touch flex-1 items-center justify-center rounded-xl border border-line-strong px-4 font-medium disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
