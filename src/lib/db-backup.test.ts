import { describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  assertBackupTableCoverage,
  backupFileName,
  deserializeRow,
  parseBackupPayload,
  serializeRow,
} from "@/lib/db-backup";
import {
  BACKUP_FORMAT,
  BACKUP_TABLE_ORDER,
  BACKUP_VERSION,
} from "@/lib/db-backup-shared";

describe("db-backup", () => {
  it("covers every Prisma model in insert order", () => {
    expect(() => assertBackupTableCoverage()).not.toThrow();
    expect(BACKUP_TABLE_ORDER.length).toBeGreaterThan(10);
  });

  it("round-trips Decimal and DateTime fields", () => {
    const row = {
      id: "abc",
      maxDiscountAllowed: new Prisma.Decimal("12.50"),
      createdAt: new Date("2026-09-17T08:00:00.000Z"),
      email: "admin@judi.local",
    };
    const serialized = serializeRow("User", row);
    expect(serialized.maxDiscountAllowed).toBe("12.5");
    expect(serialized.createdAt).toBe("2026-09-17T08:00:00.000Z");

    const back = deserializeRow("User", serialized);
    expect(back.maxDiscountAllowed).toBeInstanceOf(Prisma.Decimal);
    expect((back.maxDiscountAllowed as Prisma.Decimal).toString()).toBe("12.5");
    expect(back.createdAt).toBeInstanceOf(Date);
    expect((back.createdAt as Date).toISOString()).toBe("2026-09-17T08:00:00.000Z");
  });

  it("rejects invalid backup payloads", () => {
    expect(() => parseBackupPayload(null)).toThrow("invalid_backup");
    expect(() => parseBackupPayload({ format: "other", version: 1, tables: {} })).toThrow(
      "invalid_format",
    );
    expect(() =>
      parseBackupPayload({ format: BACKUP_FORMAT, version: 99, tables: {} }),
    ).toThrow("unsupported_version");
  });

  it("accepts a minimal valid payload", () => {
    const payload = parseBackupPayload({
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      createdAt: "2026-09-17T08:00:00.000Z",
      appVersion: "0.1.0",
      tables: { User: [] },
      files: {},
    });
    expect(payload.format).toBe(BACKUP_FORMAT);
    expect(payload.tables.User).toEqual([]);
  });

  it("builds a .judibak filename", () => {
    expect(backupFileName(new Date("2026-09-17T08:30:00.000Z"))).toMatch(
      /^judi-backup-2026-09-17T08-30-00\.judibak$/,
    );
  });
});
