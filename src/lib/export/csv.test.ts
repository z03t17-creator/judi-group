import { describe, expect, it } from "vitest";
import { csvWithBom, escapeCsvCell, rowsToCsv } from "@/lib/export/csv";

describe("csv export", () => {
  it("escapes quotes, commas, and newlines", () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(12)).toBe("12");
  });

  it("builds CRLF CSV with headers", () => {
    const csv = rowsToCsv(["Name", "Qty"], [["Tea", 2], ["Sugar, white", 1]]);
    expect(csv).toBe('Name,Qty\r\nTea,2\r\n"Sugar, white",1');
  });

  it("prefixes UTF-8 BOM for Excel", () => {
    const withBom = csvWithBom("a,b");
    expect(withBom.charCodeAt(0)).toBe(0xfeff);
    expect(withBom.slice(1)).toBe("a,b");
  });
});
