"use client";

export function BrowserPrintButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print btn btn-info"
    >
      {label}
    </button>
  );
}
