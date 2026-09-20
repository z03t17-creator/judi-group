export const SEED_PASSWORD = "JudiAdmin!26";

export type DevLoginRole =
  | "ADMIN"
  | "WAREHOUSE_ACCOUNTANT"
  | "FIELD_DELEGATE"
  | "COLLECTOR_ACCOUNTANT";

export type SeedWarehouseKind = "main" | "van" | null;

export type DevLoginAccount = {
  email: string;
  fullName: string;
  role: DevLoginRole;
  maxDiscountAllowed: number;
  warehouse: SeedWarehouseKind;
};

/** Seeded local users — shown on the login page in development only. */
export const DEV_LOGIN_ACCOUNTS: readonly DevLoginAccount[] = [
  {
    email: "admin@judi.local",
    fullName: "Judi Admin",
    role: "ADMIN",
    maxDiscountAllowed: 100,
    warehouse: null,
  },
  {
    email: "warehouse@judi.local",
    fullName: "Sara Warehouse",
    role: "WAREHOUSE_ACCOUNTANT",
    maxDiscountAllowed: 0,
    warehouse: "main",
  },
  {
    email: "collector@judi.local",
    fullName: "Ali Collector",
    role: "COLLECTOR_ACCOUNTANT",
    maxDiscountAllowed: 0,
    warehouse: "main",
  },
  {
    email: "delegate@judi.local",
    fullName: "Karwan Ahmed",
    role: "FIELD_DELEGATE",
    maxDiscountAllowed: 3,
    warehouse: "van",
  },
];

export function getDevLoginAccounts(): readonly DevLoginAccount[] {
  if (process.env.NODE_ENV === "production") return [];
  return DEV_LOGIN_ACCOUNTS;
}
