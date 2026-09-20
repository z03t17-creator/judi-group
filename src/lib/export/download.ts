import { csvWithBom, rowsToCsv } from "@/lib/export/csv";

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

export function downloadCsv(options: {
  fileBase: string;
  headers: readonly string[];
  rows: readonly (readonly (string | number | null | undefined)[])[];
}): void {
  const body = csvWithBom(rowsToCsv(options.headers, options.rows));
  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const stamp = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `${sanitizeFileBase(options.fileBase)}-${stamp}.csv`);
}

export type PrintableTableOptions = {
  title: string;
  subtitle?: string;
  metaLines?: readonly string[];
  headers: readonly string[];
  rows: readonly (readonly (string | number | null | undefined)[])[];
  dir?: "ltr" | "rtl";
  printBlockedMessage: string;
  generatedLabel: string;
};

/**
 * Opens a printable HTML table so the user can Save as PDF.
 * Prefer this over binary PDF libs so AR/CKB text stays correct.
 */
export function openPrintableTablePdf(options: PrintableTableOptions): void {
  const dir = options.dir ?? "ltr";
  const escape = (value: string | number | null | undefined) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const metaHtml = (options.metaLines ?? [])
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p class="meta">${escape(line)}</p>`)
    .join("");

  const headerHtml = options.headers
    .map((h) => `<th>${escape(h)}</th>`)
    .join("");

  const bodyHtml = options.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escape(cell)}</td>`).join("")}</tr>`,
    )
    .join("");

  const subtitleHtml = options.subtitle
    ? `<p class="subtitle">${escape(options.subtitle)}</p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="" dir="${dir}">
<head>
  <meta charset="utf-8" />
  <title>${escape(options.title)}</title>
  <style>
    @page { margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 16px;
      font-family: "Segoe UI", Tahoma, Arial, sans-serif;
      color: #1c1917;
      background: #fff;
    }
    h1 {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 700;
    }
    .subtitle, .meta, .generated {
      margin: 0 0 4px;
      font-size: 12px;
      color: #57534e;
    }
    .generated { margin-top: 8px; margin-bottom: 12px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    th, td {
      border: 1px solid #d6d3d1;
      padding: 6px 8px;
      text-align: start;
      vertical-align: top;
    }
    th {
      background: #f5f5f4;
      font-weight: 600;
    }
    tr:nth-child(even) td { background: #fafaf9; }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <h1>${escape(options.title)}</h1>
  ${subtitleHtml}
  ${metaHtml}
  <p class="generated">${escape(options.generatedLabel)}</p>
  <table>
    <thead><tr>${headerHtml}</tr></thead>
    <tbody>${bodyHtml || `<tr><td colspan="${options.headers.length}">—</td></tr>`}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const popup = window.open(url, "_blank", "width=960,height=720");
  if (!popup) {
    URL.revokeObjectURL(url);
    window.alert(options.printBlockedMessage);
    return;
  }

  const cleanup = () => URL.revokeObjectURL(url);
  popup.addEventListener("beforeunload", cleanup);
  window.setTimeout(() => {
    try {
      popup.focus();
      popup.print();
    } catch {
      // User can still print / Save as PDF from the open tab.
    }
    window.setTimeout(cleanup, 60_000);
  }, 300);
}

function sanitizeFileBase(value: string): string {
  const cleaned = value
    .trim()
    .replace(/[^\w\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "export";
}
