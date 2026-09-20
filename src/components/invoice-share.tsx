"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  Copy,
  Mail,
  MessageCircle,
  MessageSquare,
  Send,
  Share2,
  X,
} from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import {
  facebookHref,
  invoiceShareText,
  mailtoHref,
  smsHref,
  telegramHref,
  toInternationalPhone,
  viberHref,
  whatsappHref,
} from "@/lib/invoice-share";

export type InvoiceSharePayload = {
  invoiceId: string;
  invoiceNumber: string;
  storeName: string;
  storePhone?: string | null;
  invoiceType: "CASH" | "DEBT" | "GIFT_PROMOTION" | "RETURN";
  dateYmd: string;
  totalLabel: string;
  paidLabel: string;
  debtLabel: string;
  /** Office list/detail vs field receipt URL. */
  surface?: "office" | "field";
};

function invoicePageUrl(payload: InvoiceSharePayload, locale: string): string {
  const path =
    payload.surface === "field"
      ? `/${locale}/field/invoice/${payload.invoiceId}`
      : `/${locale}/dashboard/invoices/${payload.invoiceId}`;
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function openExternal(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function InvoiceShareBar({
  payload,
  className = "",
}: {
  payload: InvoiceSharePayload;
  className?: string;
}) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);

  return (
    <div className={`no-print flex flex-wrap gap-2 ${className}`}>
      <WhatsAppButton payload={payload} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-regular"
      >
        <Share2 className="size-4 shrink-0" aria-hidden />
        {t("share")}
      </button>
      {open ? (
        <InvoiceShareSheet payload={payload} onClose={() => setOpen(false)} />
      ) : null}
    </div>
  );
}

export function InvoiceShareIconButton({
  payload,
}: {
  payload: InvoiceSharePayload;
}) {
  const t = useTranslations("invoices");
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
        className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
        aria-label={t("share")}
      >
        <Share2 className="size-5" aria-hidden />
      </button>
      {open ? (
        <InvoiceShareSheet payload={payload} onClose={() => setOpen(false)} />
      ) : null}
    </>
  );
}

function WhatsAppButton({ payload }: { payload: InvoiceSharePayload }) {
  const t = useTranslations("invoices");
  const locale = useLocale();
  const hasPhone = Boolean(toInternationalPhone(payload.storePhone));

  function onClick() {
    const { text, url } = buildShare(payload, locale, t);
    openExternal(whatsappHref(`${text}\n${url}`, payload.storePhone));
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl bg-[#128C7E] px-4 font-semibold text-white hover:bg-[#0e7a6e]"
    >
      <WhatsAppMark />
      {hasPhone ? t("shareWhatsAppStore") : t("shareWhatsApp")}
    </button>
  );
}

function InvoiceShareSheet({
  payload,
  onClose,
}: {
  payload: InvoiceSharePayload;
  onClose: () => void;
}) {
  const t = useTranslations("invoices");
  const locale = useLocale();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState<"text" | "link" | null>(null);
  const [canNative, setCanNative] = useState(false);
  const hasPhone = Boolean(toInternationalPhone(payload.storePhone));

  useEffect(() => {
    setMounted(true);
    setCanNative(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { text, url, subject } = buildShare(payload, locale, t);

  async function copy(value: string, kind: "text" | "link") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setCopied(null);
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: subject, text, url });
      onClose();
    } catch {
      // User cancelled the sheet — stay open.
    }
  }

  if (!mounted) return null;

  const actions: {
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }[] = [
    {
      id: "whatsapp",
      label: hasPhone ? t("shareWhatsAppStore") : t("shareWhatsApp"),
      icon: <WhatsAppMark />,
      onClick: () => openExternal(whatsappHref(`${text}\n${url}`, payload.storePhone)),
    },
    {
      id: "telegram",
      label: t("shareTelegram"),
      icon: <Send className="size-5" aria-hidden />,
      onClick: () => openExternal(telegramHref(text, url)),
    },
    {
      id: "viber",
      label: t("shareViber"),
      icon: <MessageCircle className="size-5" aria-hidden />,
      onClick: () => openExternal(viberHref(`${text}\n${url}`)),
    },
    {
      id: "sms",
      label: t("shareSms"),
      icon: <MessageSquare className="size-5" aria-hidden />,
      onClick: () => {
        window.location.href = smsHref(`${text}\n${url}`, payload.storePhone);
      },
    },
    {
      id: "email",
      label: t("shareEmail"),
      icon: <Mail className="size-5" aria-hidden />,
      onClick: () => {
        window.location.href = mailtoHref(subject, `${text}\n${url}`);
      },
    },
    {
      id: "facebook",
      label: t("shareFacebook"),
      icon: <FacebookMark />,
      onClick: () => openExternal(facebookHref(url)),
    },
    {
      id: "copyText",
      label: copied === "text" ? t("shareCopied") : t("shareCopyText"),
      icon:
        copied === "text" ? (
          <Check className="size-5" aria-hidden />
        ) : (
          <Copy className="size-5" aria-hidden />
        ),
      onClick: () => void copy(`${text}\n${url}`, "text"),
    },
    {
      id: "copyLink",
      label: copied === "link" ? t("shareCopied") : t("shareCopyLink"),
      icon:
        copied === "link" ? (
          <Check className="size-5" aria-hidden />
        ) : (
          <Copy className="size-5" aria-hidden />
        ),
      onClick: () => void copy(url, "link"),
    },
  ];

  if (canNative) {
    actions.unshift({
      id: "system",
      label: t("shareSystem"),
      icon: <Share2 className="size-5" aria-hidden />,
      onClick: () => void nativeShare(),
    });
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label={t("shareClose")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 w-full max-w-lg rounded-t-2xl border border-line bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] shadow-lg sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2 text-start">
          <div>
            <h2 id={titleId} className="text-base font-semibold text-fg">
              {t("shareTitle")}
            </h2>
            <p className="text-sm tabular-nums text-fg-muted">
              {payload.invoiceNumber} · {payload.storeName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
            aria-label={t("shareClose")}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-muted px-3 text-start text-sm font-medium text-fg hover:bg-canvas"
            >
              <span className="shrink-0 text-judi-700 dark:text-judi-300">{action.icon}</span>
              <span className="min-w-0 text-start leading-tight">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function buildShare(
  payload: InvoiceSharePayload,
  locale: string,
  t: (key: string, values?: Record<string, string>) => string,
) {
  const typeLabel = t(`types.${payload.invoiceType}`);
  const url = invoicePageUrl(payload, locale);
  const text = invoiceShareText({
    brand: t("shareBrand"),
    invoiceNumber: payload.invoiceNumber,
    storeName: payload.storeName,
    typeLabel,
    dateYmd: payload.dateYmd,
    totalLabel: payload.totalLabel,
    paidLabel: payload.paidLabel,
    debtLabel: payload.debtLabel,
    totalCaption: t("total"),
    paidCaption: t("paid"),
    debtCaption: t("debt"),
  });
  return {
    text,
    url,
    subject: `${t("shareBrand")} ${payload.invoiceNumber}`,
  };
}

function WhatsAppMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M12.04 2c-5.46 0-9.91 4.44-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.44 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m0 1.8c4.46 0 8.1 3.64 8.1 8.11 0 4.47-3.64 8.1-8.1 8.1-1.42 0-2.82-.37-4.05-1.07l-.29-.17-3.12.82.83-3.04-.19-.31a8.08 8.08 0 0 1-1.28-4.33c0-4.47 3.64-8.11 8.1-8.11m-2.7 4.17c-.17 0-.44.06-.67.31-.23.26-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.56.13.17 1.75 2.67 4.24 3.74 2.07.9 2.49.72 2.94.67.45-.04 1.45-.59 1.65-1.16.21-.57.21-1.06.15-1.16-.06-.1-.23-.16-.48-.28-.25-.13-1.45-.72-1.68-.8-.22-.08-.39-.13-.55.13-.17.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.13-1.05-.39-2-1.23-.74-.66-1.24-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.12-.12.25-.29.37-.44.13-.14.17-.25.25-.42.08-.17.04-.31-.02-.44-.06-.13-.55-1.33-.75-1.82-.2-.48-.4-.41-.55-.42"
      />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
      <path
        fill="currentColor"
        d="M13.5 21v-7.2h2.43l.36-2.82H13.5V9.18c0-.82.23-1.37 1.4-1.37h1.5V5.28A20 20 0 0 0 14.2 5c-2.07 0-3.49 1.26-3.49 3.58v2.4H8.4v2.82h2.31V21z"
      />
    </svg>
  );
}
