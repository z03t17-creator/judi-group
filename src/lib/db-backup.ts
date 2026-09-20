import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { Prisma, type PrismaClient } from "@prisma/client";
import {
  BACKUP_FILE_EXT,
  BACKUP_FORMAT,
  BACKUP_TABLE_ORDER,
  BACKUP_VERSION,
  type BackupTableName,
} from "@/lib/db-backup-shared";
import { ensureUploadDir, MEDIA_UPLOAD_DIR } from "@/lib/media";
import { isSafeMediaFileName } from "@/lib/media-shared";
import { prisma } from "@/lib/prisma";

export {
  BACKUP_FILE_EXT,
  BACKUP_FORMAT,
  BACKUP_TABLE_ORDER,
  BACKUP_VERSION,
  type BackupTableName,
} from "@/lib/db-backup-shared";

/** Optional FKs that reference tables inserted later (MediaAsset cycle). */
const DEFERRED_FK_FIELDS: Partial<Record<BackupTableName, readonly string[]>> = {
  User: ["primaryMediaId"],
  Product: ["primaryMediaId"],
  Store: ["primaryMediaId"],
};

const BATCH_SIZE = 250;

export type JudiBackupPayload = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  appVersion: string;
  tables: Record<string, Record<string, unknown>[]>;
  files: Record<string, string>;
};

type TxClient = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

function delegateKey(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function getDelegate(client: PrismaClient | TxClient, modelName: string) {
  const key = delegateKey(modelName);
  const delegate = (client as unknown as Record<string, unknown>)[key] as
    | {
        findMany: (args?: { take?: number }) => Promise<Record<string, unknown>[]>;
        createMany: (args: { data: Record<string, unknown>[] }) => Promise<unknown>;
        update: (args: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => Promise<unknown>;
      }
    | undefined;
  if (!delegate?.findMany || !delegate?.createMany) {
    throw new Error(`Missing Prisma delegate for ${modelName}`);
  }
  return delegate;
}

/** All Prisma model names must appear in BACKUP_TABLE_ORDER. */
export function assertBackupTableCoverage(): void {
  const ordered = new Set<string>(BACKUP_TABLE_ORDER);
  const models = Prisma.dmmf.datamodel.models.map((m) => m.name);
  const missing = models.filter((name) => !ordered.has(name));
  const extra = [...ordered].filter((name) => !models.includes(name));
  if (missing.length || extra.length) {
    throw new Error(
      `Backup table order out of sync. missing=[${missing.join(", ")}] extra=[${extra.join(", ")}]`,
    );
  }
}

function fieldTypeMap(modelName: string): Map<string, string> {
  const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
  const map = new Map<string, string>();
  if (!model) return map;
  for (const field of model.fields) {
    if (field.kind === "scalar" || field.kind === "enum") {
      map.set(field.name, field.type);
    }
  }
  return map;
}

export function serializeRow(
  modelName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const types = fieldTypeMap(modelName);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = value;
      continue;
    }
    const type = types.get(key);
    if (type === "Decimal" || value instanceof Prisma.Decimal) {
      out[key] = value instanceof Prisma.Decimal ? value.toString() : String(value);
      continue;
    }
    if (type === "DateTime" || value instanceof Date) {
      out[key] = value instanceof Date ? value.toISOString() : String(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

export function deserializeRow(
  modelName: string,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const types = fieldTypeMap(modelName);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined) {
      out[key] = value;
      continue;
    }
    const type = types.get(key);
    if (type === "Decimal") {
      out[key] = new Prisma.Decimal(String(value));
      continue;
    }
    if (type === "DateTime") {
      out[key] = new Date(String(value));
      continue;
    }
    out[key] = value;
  }
  return out;
}

function stripDeferredFks(
  modelName: BackupTableName,
  row: Record<string, unknown>,
): Record<string, unknown> {
  const deferred = DEFERRED_FK_FIELDS[modelName];
  if (!deferred?.length) return row;
  const copy = { ...row };
  for (const field of deferred) {
    copy[field] = null;
  }
  return copy;
}

async function collectUploadFiles(): Promise<Record<string, string>> {
  await ensureUploadDir();
  const files: Record<string, string> = {};
  let names: string[];
  try {
    names = await readdir(MEDIA_UPLOAD_DIR);
  } catch {
    return files;
  }

  for (const name of names) {
    if (!isSafeMediaFileName(name)) continue;
    // Keep VAPID / other non-media sidecars out of DB restore payloads.
    if (!/\.(jpe?g|png|webp|gif)$/i.test(name)) continue;
    try {
      const buf = await readFile(path.join(MEDIA_UPLOAD_DIR, name));
      files[name] = buf.toString("base64");
    } catch {
      // Skip unreadable files.
    }
  }
  return files;
}

async function writeUploadFiles(files: Record<string, string>): Promise<number> {
  await ensureUploadDir();
  let written = 0;
  for (const [name, b64] of Object.entries(files)) {
    if (!isSafeMediaFileName(name) || typeof b64 !== "string") continue;
    try {
      await writeFile(path.join(MEDIA_UPLOAD_DIR, name), Buffer.from(b64, "base64"));
      written += 1;
    } catch {
      // Continue restoring remaining files.
    }
  }
  return written;
}

export async function createBackupPayload(
  client: PrismaClient = prisma,
): Promise<JudiBackupPayload> {
  assertBackupTableCoverage();

  const tables: Record<string, Record<string, unknown>[]> = {};
  for (const modelName of BACKUP_TABLE_ORDER) {
    const rows = await getDelegate(client, modelName).findMany();
    tables[modelName] = rows.map((row) => serializeRow(modelName, row));
  }

  const files = await collectUploadFiles();

  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: new Date().toISOString(),
    appVersion: process.env.npm_package_version ?? "0.1.0",
    tables,
    files,
  };
}

export function backupFileName(createdAt = new Date()): string {
  const stamp = createdAt.toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `judi-backup-${stamp}${BACKUP_FILE_EXT}`;
}

export function parseBackupPayload(raw: unknown): JudiBackupPayload {
  if (!raw || typeof raw !== "object") {
    throw new Error("invalid_backup");
  }
  const data = raw as Partial<JudiBackupPayload>;
  if (data.format !== BACKUP_FORMAT) {
    throw new Error("invalid_format");
  }
  if (data.version !== BACKUP_VERSION) {
    throw new Error("unsupported_version");
  }
  if (!data.tables || typeof data.tables !== "object") {
    throw new Error("missing_tables");
  }
  for (const modelName of BACKUP_TABLE_ORDER) {
    const rows = data.tables[modelName];
    if (rows == null) continue;
    if (!Array.isArray(rows)) {
      throw new Error(`invalid_table:${modelName}`);
    }
  }
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    appVersion: typeof data.appVersion === "string" ? data.appVersion : "unknown",
    tables: data.tables as Record<string, Record<string, unknown>[]>,
    files:
      data.files && typeof data.files === "object" && !Array.isArray(data.files)
        ? (data.files as Record<string, string>)
        : {},
  };
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function truncateAllAppTables(tx: TxClient): Promise<void> {
  const list = BACKUP_TABLE_ORDER.map(quoteIdent).join(", ");
  await tx.$executeRawUnsafe(`TRUNCATE TABLE ${list} CASCADE`);
}

async function insertTable(
  tx: TxClient,
  modelName: BackupTableName,
  rows: Record<string, unknown>[],
): Promise<void> {
  if (!rows.length) return;
  const delegate = getDelegate(tx, modelName);
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE).map((row) => {
      const deserialized = deserializeRow(modelName, row);
      return stripDeferredFks(modelName, deserialized);
    });
    await delegate.createMany({ data: chunk });
  }
}

async function applyDeferredFks(
  tx: TxClient,
  modelName: BackupTableName,
  rows: Record<string, unknown>[],
): Promise<void> {
  const fields = DEFERRED_FK_FIELDS[modelName];
  if (!fields?.length || !rows.length) return;
  const delegate = getDelegate(tx, modelName);

  for (const row of rows) {
    const id = row.id;
    if (typeof id !== "string") continue;
    const data: Record<string, unknown> = {};
    let has = false;
    for (const field of fields) {
      const value = row[field];
      if (value != null && value !== "") {
        data[field] = value;
        has = true;
      }
    }
    if (!has) continue;
    await delegate.update({ where: { id }, data });
  }
}

export type RestoreBackupResult = {
  tables: number;
  rows: number;
  files: number;
  checksum: string;
};

export async function restoreBackupPayload(
  payload: JudiBackupPayload,
  client: PrismaClient = prisma,
): Promise<RestoreBackupResult> {
  assertBackupTableCoverage();

  let rowCount = 0;
  for (const modelName of BACKUP_TABLE_ORDER) {
    rowCount += payload.tables[modelName]?.length ?? 0;
  }

  await client.$transaction(
    async (tx) => {
      await truncateAllAppTables(tx);

      for (const modelName of BACKUP_TABLE_ORDER) {
        const rows = payload.tables[modelName] ?? [];
        await insertTable(tx, modelName, rows);
      }

      for (const modelName of ["User", "Product", "Store"] as const) {
        await applyDeferredFks(tx, modelName, payload.tables[modelName] ?? []);
      }
    },
    { maxWait: 60_000, timeout: 300_000 },
  );

  const filesWritten = await writeUploadFiles(payload.files ?? {});

  const checksum = createHash("sha256")
    .update(JSON.stringify({ tables: payload.tables, createdAt: payload.createdAt }))
    .digest("hex")
    .slice(0, 16);

  return {
    tables: BACKUP_TABLE_ORDER.filter((name) => (payload.tables[name]?.length ?? 0) > 0).length,
    rows: rowCount,
    files: filesWritten,
    checksum,
  };
}
