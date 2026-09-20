"use client";

import { useEffect, useState } from "react";
import { Download, ShieldCheck, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  ensureServiceWorker,
  isSecurePushContext,
  notificationsSupported,
} from "@/lib/push-client";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstallPanel() {
  const t = useTranslations("settings");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [swReady, setSwReady] = useState(false);
  const [secure, setSecure] = useState(true);
  const [pushOk, setPushOk] = useState(false);

  useEffect(() => {
    setSecure(isSecurePushContext());
    setPushOk(notificationsSupported());
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        ("standalone" in navigator &&
          Boolean((navigator as Navigator & { standalone?: boolean }).standalone)),
    );

    void ensureServiceWorker()
      .then(() => setSwReady(true))
      .catch(() => setSwReady(false));

    const onBip = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      setDeferred(null);
    }
  }

  return (
    <div className="space-y-4 text-start">
      <p className="text-sm text-fg-muted">{t("pwaHint")}</p>

      <ul className="space-y-2 text-sm">
        <StatusRow
          ok={secure}
          okLabel={t("pwaSecureOk")}
          badLabel={t("pwaSecureBad")}
        />
        <StatusRow
          ok={swReady}
          okLabel={t("pwaSwOk")}
          badLabel={t("pwaSwBad")}
        />
        <StatusRow
          ok={pushOk && secure}
          okLabel={t("pwaPushOk")}
          badLabel={t("pwaPushBad")}
        />
        <StatusRow
          ok={installed}
          okLabel={t("pwaInstalled")}
          badLabel={t("pwaNotInstalled")}
        />
      </ul>

      {deferred && !installed ? (
        <button
          type="button"
          onClick={() => void install()}
          className="btn btn-important"
        >
          <Download className="size-4" aria-hidden />
          {t("pwaInstall")}
        </button>
      ) : null}

      {!deferred && !installed ? (
        <p className="flex items-start gap-2 text-sm text-fg-muted">
          <Smartphone className="mt-0.5 size-4 shrink-0" aria-hidden />
          {t("pwaManualInstall")}
        </p>
      ) : null}

      <p className="flex items-start gap-2 text-xs text-fg-subtle">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        {t("pwaProdNote")}
      </p>
    </div>
  );
}

function StatusRow({
  ok,
  okLabel,
  badLabel,
}: {
  ok: boolean;
  okLabel: string;
  badLabel: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`inline-block size-2.5 shrink-0 rounded-full ${
          ok ? "bg-judi-600" : "bg-amber-500"
        }`}
        aria-hidden
      />
      <span className="text-fg">{ok ? okLabel : badLabel}</span>
    </li>
  );
}
