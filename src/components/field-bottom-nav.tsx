"use client";

import type { LucideIcon } from "lucide-react";
import { BookOpen, Ellipsis, Home, PackageSearch, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { InstantLink, RouteWarmup } from "@/components/instant-nav";
import { usePathname } from "@/i18n/navigation";

type FieldTabHref =
  | "/field"
  | "/field/customers"
  | "/field/stock"
  | "/field/catalog"
  | "/field/more";

type FieldWarmupHref =
  | FieldTabHref
  | "/field/invoice"
  | "/field/collection"
  | "/field/return"
  | "/field/alerts"
  | "/field/reports"
  | "/field/movements"
  | "/field/customers/new";

type FieldTab = {
  href: FieldTabHref;
  labelKey: "home" | "customers" | "inventory" | "catalog" | "more";
  icon: LucideIcon;
  tabClass: "tab-teal" | "tab-sky" | "tab-indigo" | "tab-violet" | "tab-amber";
  match: (pathname: string) => boolean;
};

const TABS: FieldTab[] = [
  {
    href: "/field",
    labelKey: "home",
    icon: Home,
    tabClass: "tab-teal",
    match: (pathname) => pathname === "/field",
  },
  {
    href: "/field/customers",
    labelKey: "customers",
    icon: Users,
    tabClass: "tab-sky",
    match: (pathname) => pathname.startsWith("/field/customers"),
  },
  {
    href: "/field/stock",
    labelKey: "inventory",
    icon: PackageSearch,
    tabClass: "tab-indigo",
    match: (pathname) => pathname.startsWith("/field/stock"),
  },
  {
    href: "/field/catalog",
    labelKey: "catalog",
    icon: BookOpen,
    tabClass: "tab-violet",
    match: (pathname) => pathname.startsWith("/field/catalog"),
  },
  {
    href: "/field/more",
    labelKey: "more",
    icon: Ellipsis,
    tabClass: "tab-amber",
    match: (pathname) =>
      pathname.startsWith("/field/more") ||
      pathname.startsWith("/field/collection") ||
      pathname.startsWith("/field/invoice") ||
      pathname.startsWith("/field/return") ||
      pathname.startsWith("/field/prospects") ||
      pathname.startsWith("/field/settings") ||
      pathname.startsWith("/field/alerts") ||
      pathname.startsWith("/field/reports") ||
      pathname.startsWith("/field/movements"),
  },
];

const FIELD_WARMUP: FieldWarmupHref[] = [
  "/field",
  "/field/customers",
  "/field/stock",
  "/field/catalog",
  "/field/more",
  "/field/invoice",
  "/field/collection",
  "/field/return",
  "/field/alerts",
  "/field/reports",
  "/field/movements",
  "/field/customers/new",
];

export function FieldBottomNav() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const warmupHrefs = FIELD_WARMUP;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t("field")}
    >
      <RouteWarmup hrefs={warmupHrefs} />
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = tab.match(pathname);
          return (
            <li key={tab.href}>
              <InstantLink
                href={tab.href}
                pendingPulse
                className={`flex min-h-touch min-w-touch flex-col items-center justify-center gap-0 px-1 py-1.5 text-[10px] font-medium sm:py-2 sm:text-[11px] ${
                  active ? tab.tabClass : "tab-muted"
                }`}
              >
                <Icon className="size-5" aria-hidden strokeWidth={active ? 2.5 : 2} />
                <span className="text-center leading-tight">{t(tab.labelKey)}</span>
              </InstantLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
