"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, FolderOpen, SwitchCamera, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { compressImageToJpeg } from "@/lib/media-compress";
import { facingModeForKind, type AppMediaKind } from "@/lib/media-shared";

type CameraCaptureProps = {
  open: boolean;
  kind: AppMediaKind;
  onClose: () => void;
  /** Receives a compressed JPEG blob ready for `/api/media` upload. */
  onCaptured: (blob: Blob) => void | Promise<void>;
};

/**
 * Full-screen capture UI. Portaled to `document.body` so sticky form bars
 * (z-20) cannot stack on top of the camera.
 */
export function CameraCapture({ open, kind, onClose, onCaptured }: CameraCaptureProps) {
  const t = useTranslations("media");
  const titleId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  /** Library / storage picker — no `capture` attr so the OS file UI opens. */
  const storageRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"user" | "environment">(() =>
    facingModeForKind(kind),
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setFacing(facingModeForKind(kind));
    setError(null);
  }, [open, kind]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setLive(false);
      return;
    }

    let cancelled = false;

    async function start() {
      stopStream();
      setError(null);
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(t("cameraUnavailable"));
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 960 },
          },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
        }
        setLive(true);
      } catch {
        setLive(false);
        setError(t("cameraDenied"));
      }
    }

    void start();

    return () => {
      cancelled = true;
      stopStream();
    };
  }, [open, facing, t]);

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || !live || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compressImageToJpeg(video);
      await onCaptured(blob);
      onClose();
    } catch {
      setError(t("captureFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await compressImageToJpeg(file);
      await onCaptured(blob);
      onClose();
    } catch {
      setError(t("captureFailed"));
    } finally {
      setBusy(false);
      if (storageRef.current) storageRef.current.value = "";
    }
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-stone-950 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      style={{
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <header className="flex min-h-touch items-center justify-between gap-3 px-3 py-2">
        <h2 id={titleId} className="text-base font-semibold text-start">
          {t("captureTitle")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-stone-200 hover:bg-white/10"
          aria-label={t("close")}
        >
          <X className="size-6" aria-hidden />
        </button>
      </header>

      <div className="relative mx-auto flex w-full max-w-lg flex-1 flex-col px-3">
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black ring-1 ring-white/15">
          <video
            ref={videoRef}
            playsInline
            muted
            className="size-full object-cover"
          />
          {!live ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-stone-900/80 p-6 text-center text-sm text-stone-300">
              <p>{error ?? t("cameraStarting")}</p>
              <button
                type="button"
                onClick={() => storageRef.current?.click()}
                disabled={busy}
                className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 font-medium text-white hover:bg-white/15 disabled:opacity-50"
              >
                <FolderOpen className="size-5" aria-hidden />
                {t("chooseStorage")}
              </button>
            </div>
          ) : null}
        </div>

        {error && live ? (
          <p className="mt-2 text-center text-sm text-amber-200" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-3 pb-4">
          <button
            type="button"
            onClick={() => storageRef.current?.click()}
            disabled={busy}
            className="inline-flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 rounded-xl px-3 text-xs font-medium text-stone-200 hover:bg-white/10 disabled:opacity-50"
          >
            <FolderOpen className="size-6" aria-hidden />
            {t("chooseStorage")}
          </button>

          <button
            type="button"
            onClick={() => void handleShutter()}
            disabled={!live || busy}
            className="inline-flex size-16 min-h-touch min-w-touch items-center justify-center rounded-full border-4 border-white bg-judi-500 text-white shadow-lg disabled:opacity-40"
            aria-label={t("takePhoto")}
          >
            <Camera className="size-7" aria-hidden />
          </button>

          <button
            type="button"
            onClick={() =>
              setFacing((prev) => (prev === "user" ? "environment" : "user"))
            }
            disabled={busy}
            className="inline-flex min-h-touch min-w-touch flex-col items-center justify-center gap-1 rounded-xl px-3 text-xs font-medium text-stone-200 hover:bg-white/10 disabled:opacity-50"
          >
            <SwitchCamera className="size-6" aria-hidden />
            {t("switchCamera")}
          </button>
        </div>
      </div>

      {/* No `capture` attribute — opens device file / photo library. */}
      <input
        ref={storageRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files)}
      />
    </div>,
    document.body,
  );
}
