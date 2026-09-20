"use client";

import { Printer, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  buildEscPosRasterReceipt,
  receiptTextLines,
  type EscPosLabels,
} from "@/lib/escpos";

type SerialPortLike = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  writable: WritableStream<Uint8Array> | null;
};

type SerialNavigator = Navigator & {
  serial?: {
    requestPort: () => Promise<SerialPortLike>;
  };
};

export type ThermalReceipt = {
  brand: string;
  invoiceNumber: string;
  storeName: string;
  invoiceType: string;
  currency: string;
  lines: { name: string; quantity: string; total: string }[];
  subTotal: string;
  discountAmount: string;
  totalAmount: string;
  paidAmount: string;
  debtAmount: string;
};

export function PrintReceiptButtons({
  receipt,
  labels,
}: {
  receipt: ThermalReceipt;
  labels: EscPosLabels;
}) {
  const t = useTranslations();

  async function printThermal() {
    const bytes = buildEscPosRasterReceipt(receipt, labels);
    const serial = (navigator as SerialNavigator).serial;
    if (!serial) {
      window.print();
      return;
    }
    try {
      const port = await serial.requestPort();
      await port.open({ baudRate: 9600 });
      const writer = port.writable?.getWriter();
      if (!writer) {
        await port.close();
        window.print();
        return;
      }
      await writer.write(bytes);
      writer.releaseLock();
      await port.close();
    } catch {
      window.print();
    }
  }

  return (
    <div className="no-print flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => void printThermal()}
        className="btn btn-info"
      >
        <Receipt className="size-4 shrink-0" aria-hidden />
        {t("invoices.printThermal")}
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="btn btn-regular"
      >
        <Printer className="size-4 shrink-0" aria-hidden />
        {t("invoices.printBrowser")}
      </button>
    </div>
  );
}

export function ThermalReceiptPreview({
  receipt,
  labels,
}: {
  receipt: ThermalReceipt;
  labels: EscPosLabels;
}) {
  const t = useTranslations("invoices");
  const lines = receiptTextLines(receipt, labels);

  return (
    <section className="no-print surface-panel space-y-3 p-3 sm:p-4">
      <div className="text-start">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Receipt className="size-4 shrink-0 text-judi-700 dark:text-judi-300" aria-hidden />
          {t("thermalPreview")}
        </h2>
        <p className="mt-1 text-sm text-fg-muted">{t("thermalPreviewHint")}</p>
      </div>
      <div className="flex justify-center">
        <div
          dir="ltr"
          className="w-full max-w-[280px] rounded-sm bg-white px-4 py-5 font-mono text-[12px] leading-5 text-black shadow-inner ring-1 ring-black/10"
        >
          {lines.map((line, index) => (
            <p key={`${index}-${line}`} className="break-words whitespace-pre-wrap">
              {line}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
