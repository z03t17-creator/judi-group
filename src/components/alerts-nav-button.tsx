"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useTranslations } from "next-intl";
import { InstantLink } from "@/components/instant-nav";
import { usePathname } from "@/i18n/navigation";

type AlertsNavButtonProps = {
  href: "/dashboard/alerts" | "/field/alerts";
  /** Compact circular control next to theme / language / logout */
  className?: string;
};

/**
 * Chrome control for alerts — sits with theme, language, and sign-out.
 * Unread badge loads after mount to avoid SSR/client hydration mismatches.
 */
export function AlertsNavButton({ href, className = "" }: AlertsNavButtonProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname === href || pathname.startsWith(`${href}/`);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/notifications?count=1", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { unreadCount?: number };
        if (!cancelled) setUnread(Number(data.unreadCount ?? 0) || 0);
      } catch {
        /* ignore */
      }
    }

    void load();
    const timer = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return (
    <InstantLink
      href={href}
      pendingPulse
      title={t("alerts")}
      aria-label={
        unread > 0 ? `${t("alerts")} (${unread})` : t("alerts")
      }
      className={`relative chrome-btn chrome-btn-alerts ${
        active ? "ring-2 ring-amber-200" : ""
      } ${className}`}
    >
      <Bell className="size-4 lg:size-5" aria-hidden />
      {unread > 0 ? (
        <span className="absolute -end-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white tabular-nums">
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </InstantLink>
  );
}
