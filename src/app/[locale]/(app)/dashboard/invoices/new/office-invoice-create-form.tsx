"use client";

import { useCallback } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  InvoiceForm,
  type InvoiceProductOption,
  type InvoiceStoreOption,
  type InvoiceWarehouseOption,
} from "@/app/[locale]/(app)/field/invoice/invoice-form";
import type { DiscountRuleSnapshot } from "@/lib/discount-engine";
import { createOfficeInvoiceAction } from "../actions";

export function OfficeInvoiceCreateForm({
  stores,
  products,
  maxDiscount,
  discountRules,
  initialStoreId,
  warehouseId,
  warehouses,
  warehouseLabel,
  canPickWarehouse,
}: {
  stores: InvoiceStoreOption[];
  products: InvoiceProductOption[];
  maxDiscount: string;
  discountRules: DiscountRuleSnapshot[];
  initialStoreId?: string | null;
  warehouseId: string;
  warehouses: InvoiceWarehouseOption[];
  warehouseLabel: string | null;
  canPickWarehouse: boolean;
}) {
  const router = useRouter();

  const onWarehouseChange = useCallback(
    (nextId: string) => {
      if (!nextId || nextId === warehouseId) return;
      const params = new URLSearchParams();
      params.set("warehouseId", nextId);
      if (initialStoreId) params.set("storeId", initialStoreId);
      router.replace(`/dashboard/invoices/new?${params.toString()}`);
      router.refresh();
    },
    [initialStoreId, router, warehouseId],
  );

  return (
    <InvoiceForm
      action={createOfficeInvoiceAction}
      surface="office"
      warehouseId={warehouseId || undefined}
      warehouseLabel={warehouseLabel}
      warehouses={canPickWarehouse ? warehouses : undefined}
      onWarehouseChange={canPickWarehouse ? onWarehouseChange : undefined}
      maxDiscount={maxDiscount}
      initialStoreId={initialStoreId}
      discountRules={discountRules}
      stores={stores}
      products={products}
    />
  );
}
