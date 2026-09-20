import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

function leafKeys(value: unknown, prefix = ""): string[] {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix];
  }
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) {
    return [prefix];
  }
  return entries.flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function load(locale: string) {
  const path = join(process.cwd(), "src", "messages", `${locale}.json`);
  return JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
}

describe("message key parity", () => {
  it("keeps en, ar, and ckb leaf keys identical", () => {
    const en = new Set(leafKeys(load("en")));
    const ar = new Set(leafKeys(load("ar")));
    const ckb = new Set(leafKeys(load("ckb")));

    const missingInAr = [...en].filter((key) => !ar.has(key));
    const missingInCkb = [...en].filter((key) => !ckb.has(key));
    const extraInAr = [...ar].filter((key) => !en.has(key));
    const extraInCkb = [...ckb].filter((key) => !en.has(key));

    expect(missingInAr).toEqual([]);
    expect(missingInCkb).toEqual([]);
    expect(extraInAr).toEqual([]);
    expect(extraInCkb).toEqual([]);
  });
});
