import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import webpush from "web-push";

export type VapidKeys = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

const VAPID_FILE = path.join(process.cwd(), "uploads", ".vapid.json");

let cached: VapidKeys | null = null;

function fromEnv(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@judi.local";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

async function fromDisk(): Promise<VapidKeys | null> {
  try {
    const raw = await readFile(VAPID_FILE, "utf8");
    const parsed = JSON.parse(raw) as Partial<VapidKeys>;
    if (!parsed.publicKey || !parsed.privateKey) return null;
    return {
      publicKey: parsed.publicKey,
      privateKey: parsed.privateKey,
      subject: parsed.subject?.trim() || "mailto:admin@judi.local",
    };
  } catch {
    return null;
  }
}

async function persist(keys: VapidKeys) {
  await mkdir(path.dirname(VAPID_FILE), { recursive: true });
  await writeFile(VAPID_FILE, JSON.stringify(keys, null, 2), "utf8");
}

/**
 * Resolve VAPID keys for Web Push.
 * Order: env → uploads/.vapid.json → generate once and persist (dev only).
 * Production should set NEXT_PUBLIC_VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY
 * so every server instance shares the same keypair.
 */
export async function getVapidKeys(): Promise<VapidKeys> {
  if (cached) return cached;

  const envKeys = fromEnv();
  if (envKeys) {
    cached = envKeys;
    return cached;
  }

  const diskKeys = await fromDisk();
  if (diskKeys) {
    cached = diskKeys;
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[judi] VAPID keys missing in production — auto-generating once. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY for stable push across deploys.",
    );
  }

  const generated = webpush.generateVAPIDKeys();
  const keys: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject: process.env.VAPID_SUBJECT?.trim() || "mailto:admin@judi.local",
  };
  await persist(keys);
  cached = keys;
  return cached;
}

export async function configureWebPush() {
  const keys = await getVapidKeys();
  webpush.setVapidDetails(keys.subject, keys.publicKey, keys.privateKey);
  return keys;
}
