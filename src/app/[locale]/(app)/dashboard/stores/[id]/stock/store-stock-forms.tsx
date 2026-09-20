"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  StorePlacementForm,
  type StorePlacementProductOption,
} from "./store-placement-form";

type Tab = "place" | "return";

export function StoreStockForms({
  storeId,
  storeName,
  warehouses,
  warehouseId,
  placeProducts,
  returnProducts,
  fromField = false,
  initialTab = "place",
}: {
  storeId: string;
  storeName: string;
  warehouses: { id: string; label: string }[];
  warehouseId: string;
  placeProducts: StorePlacementProductOption[];
  returnProducts: StorePlacementProductOption[];
  fromField?: boolean;
  initialTab?: Tab;
}) {
  const t = useTranslations("storeStock");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);

  function changeWarehouse(nextId: string) {
    if (nextId === warehouseId) return;
    const base = fromField
      ? `/field/customers/${storeId}/stock`
      : `/dashboard/stores/${storeId}/stock`;
    router.replace(`${base}?warehouseId=${nextId}&tab=${tab}`);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div
        role="tablist"
        aria-label={t("moveTabs")}
        className="inline-flex w-full rounded-xl border border-line-strong bg-surface p-1 sm:w-auto"
      >
        <TabButton active={tab === "place"} onClick={() => setTab("place")}>
          {t("placeTab")}
        </TabButton>
        <TabButton active={tab === "return"} onClick={() => setTab("return")}>
          {t("returnTab")}
        </TabButton>
      </div>

      {tab === "place" ? (
        <StorePlacementForm
          storeId={storeId}
          storeName={storeName}
          warehouses={warehouses}
          warehouseId={warehouseId}
          direction="TO_STORE"
          products={placeProducts}
          fromField={fromField}
          onWarehouseChange={fromField ? undefined : changeWarehouse}
        />
      ) : (
        <StorePlacementForm
          storeId={storeId}
          storeName={storeName}
          warehouses={warehouses}
          warehouseId={warehouseId}
          direction="FROM_STORE"
          products={returnProducts}
          fromField={fromField}
          onWarehouseChange={fromField ? undefined : changeWarehouse}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex min-h-touch flex-1 items-center justify-center rounded-lg px-4 text-sm font-semibold sm:flex-none ${
        active
          ? "seg-on"
          : "text-fg hover:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}
