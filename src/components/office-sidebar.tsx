"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Boxes,
  BadgePercent,
  CircleDollarSign,
  ClipboardList,
  Factory,
  FileText,
  LayoutDashboard,
  MapPinned,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Store,
  Tags,
  Truck,
  Users,
  Wallet,
  Warehouse,
  CalendarClock,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Role } from "@prisma/client";
import { InstantLink, RouteWarmup } from "@/components/instant-nav";
import { usePathname } from "@/i18n/navigation";
import { AlertsNavButton } from "@/components/alerts-nav-button";
import { JudiLogo } from "@/components/judi-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { navIcon, OFFICE_NAV_TONES } from "@/lib/ui-tones";

type NavHref =
  | "/dashboard"
  | "/dashboard/users"
  | "/dashboard/warehouses"
  | "/dashboard/products"
  | "/dashboard/categories"
  | "/dashboard/discounts"
  | "/dashboard/suppliers"
  | "/dashboard/purchases"
  | "/dashboard/stock"
  | "/dashboard/expiry"
  | "/dashboard/expenses"
  | "/dashboard/transfers"
  | "/dashboard/stores"
  | "/dashboard/invoices"
  | "/dashboard/collections"
  | "/dashboard/debts"
  | "/dashboard/reports"
  | "/dashboard/map"
  | "/dashboard/settings";

type OfficeSidebarProps = {
  role: Role;
  name: string;
};

type NavItem = {
  href: NavHref;
  labelKey:
    | "dashboard"
    | "users"
    | "warehouses"
    | "products"
    | "categories"
    | "discounts"
    | "suppliers"
    | "purchases"
    | "stock"
    | "expiry"
    | "expenses"
    | "transfers"
    | "stores"
    | "invoices"
    | "collections"
    | "debts"
    | "reports"
    | "map"
    | "settings";
  icon: LucideIcon;
};

function itemsForRole(role: Role): NavItem[] {
  const isAdmin = role === "ADMIN";
  const isCollector = role === "COLLECTOR_ACCOUNTANT";

  const items: NavItem[] = [
    { href: "/dashboard", labelKey: "dashboard", icon: LayoutDashboard },
  ];

  if (isAdmin) {
    items.push({ href: "/dashboard/users", labelKey: "users", icon: Users });
  }

  if (!isCollector) {
    items.push(
      { href: "/dashboard/warehouses", labelKey: "warehouses", icon: Warehouse },
      { href: "/dashboard/products", labelKey: "products", icon: Package },
      { href: "/dashboard/categories", labelKey: "categories", icon: Tags },
      { href: "/dashboard/discounts", labelKey: "discounts", icon: BadgePercent },
      { href: "/dashboard/suppliers", labelKey: "suppliers", icon: Factory },
      { href: "/dashboard/purchases", labelKey: "purchases", icon: ShoppingCart },
      { href: "/dashboard/stock", labelKey: "stock", icon: Boxes },
      { href: "/dashboard/expiry", labelKey: "expiry", icon: CalendarClock },
      { href: "/dashboard/expenses", labelKey: "expenses", icon: Receipt },
      { href: "/dashboard/transfers", labelKey: "transfers", icon: Truck },
    );
  }

  items.push(
    { href: "/dashboard/stores", labelKey: "stores", icon: Store },
    { href: "/dashboard/invoices", labelKey: "invoices", icon: FileText },
  );

  if (isAdmin || isCollector) {
    items.push({ href: "/dashboard/collections", labelKey: "collections", icon: Wallet });
  }

  items.push({ href: "/dashboard/debts", labelKey: "debts", icon: CircleDollarSign });

  items.push(
    { href: "/dashboard/reports", labelKey: "reports", icon: ClipboardList },
    { href: "/dashboard/map", labelKey: "map", icon: MapPinned },
    { href: "/dashboard/settings", labelKey: "settings", icon: Settings },
  );

  return items;
}

export function OfficeSidebar({ role, name }: OfficeSidebarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const items = useMemo(() => itemsForRole(role), [role]);
  const warmupHrefs = useMemo(
    () => [...items.map((item) => item.href), "/dashboard/alerts" as const],
    [items],
  );

  return (
    <aside className="sticky top-0 z-30 flex h-dvh w-[4.5rem] shrink-0 flex-col border-e border-judi-800 bg-judi-950 text-white pt-[env(safe-area-inset-top,0px)] lg:w-60">
      <div className="border-b border-judi-800 px-2 py-4 lg:px-4">
        <JudiLogo
          href="/dashboard"
          size="sm"
          tone="chrome"
          className="justify-center lg:justify-start [&_.judi-wordmark]:hidden lg:[&_.judi-wordmark]:flex"
        />
      </div>

      <RouteWarmup hrefs={warmupHrefs} />
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 lg:px-3" aria-label={t("dashboard")}>
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <InstantLink
              key={item.href}
              href={item.href}
              pendingPulse
              title={t(item.labelKey)}
              className={`flex min-h-touch min-w-touch items-center justify-center gap-3 rounded-xl px-2 text-sm font-medium transition-colors duration-75 lg:justify-start lg:px-3 ${
                active
                  ? "bg-judi-700 text-white"
                  : "text-judi-100 hover:bg-judi-800 hover:text-white"
              }`}
            >
              <Icon
                className={`size-5 shrink-0 ${active ? "text-white" : navIcon(OFFICE_NAV_TONES[item.href] ?? "teal")}`}
                aria-hidden
              />
              <span className="hidden text-start lg:inline">{t(item.labelKey)}</span>
            </InstantLink>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-judi-800 px-1.5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] lg:space-y-3 lg:px-3 lg:py-4 lg:pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <p className="hidden truncate px-1 text-sm text-judi-100 lg:block" title={name}>
          {name}
        </p>
        <div className="flex flex-col items-center gap-2 lg:items-stretch">
          <div className="flex w-full flex-col items-center gap-2 lg:flex-row lg:justify-start">
            <AlertsNavButton href="/dashboard/alerts" />
            <ThemeToggle />
          </div>
          <LocaleSwitcher tone="chrome" layout="rail" />
          <SignOutButton variant="sidebar" />
        </div>
      </div>
    </aside>
  );
}
