/** CSV helpers — UTF-8 with BOM so Excel opens Arabic/Kurdish correctly. */

export function escapeCsvCell(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

export function rowsToCsv(
  headers: readonly string[],
  rows: readonly (readonly (string | number | null | undefined)[])[],
): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];
  return lines.join("\r\n");
}

/** Excel-friendly UTF-8 CSV (BOM + CRLF). */
export function csvWithBom(csvBody: string): string {
  return `\uFEFF${csvBody}`;
}
