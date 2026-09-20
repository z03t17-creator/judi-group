export type UiTone =
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "amber"
  | "rose"
  | "emerald"
  | "orange"
  | "cyan"
  | "slate"
  | "fuchsia"
  | "lime"
  | "blue";

export function iconBadge(tone: UiTone, size: "sm" | "md" | "lg" = "md") {
  return `icon-badge icon-badge-${size} tone-${tone}`;
}

export function cardTone(tone: UiTone) {
  return `card-tone-${tone}`;
}

export function tileTone(tone: UiTone) {
  return `tile-tone-${tone}`;
}

export function navIcon(tone: UiTone) {
  return `nav-icon-${tone}`;
}

export const OFFICE_NAV_TONES: Record<string, UiTone> = {
  "/dashboard": "teal",
  "/dashboard/users": "sky",
  "/dashboard/warehouses": "indigo",
  "/dashboard/products": "violet",
  "/dashboard/categories": "fuchsia",
  "/dashboard/discounts": "orange",
  "/dashboard/suppliers": "cyan",
  "/dashboard/purchases": "blue",
  "/dashboard/stock": "indigo",
  "/dashboard/expiry": "amber",
  "/dashboard/expenses": "rose",
  "/dashboard/transfers": "lime",
  "/dashboard/stores": "amber",
  "/dashboard/invoices": "sky",
  "/dashboard/collections": "emerald",
  "/dashboard/debts": "rose",
  "/dashboard/reports": "blue",
  "/dashboard/map": "lime",
  "/dashboard/settings": "slate",
};

export const DASHBOARD_SHORTCUT_TONES: Record<string, UiTone> = {
  "/dashboard/users": "sky",
  "/dashboard/warehouses": "indigo",
  "/dashboard/products": "violet",
  "/dashboard/stock": "indigo",
  "/dashboard/expiry": "amber",
  "/dashboard/expenses": "rose",
  "/dashboard/transfers": "lime",
  "/dashboard/stores": "orange",
  "/dashboard/invoices": "sky",
  "/dashboard/collections": "emerald",
  "/dashboard/debts": "rose",
  "/dashboard/reports": "blue",
};
