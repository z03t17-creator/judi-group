import { Prisma, PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/** Prisma model → client delegate key (`PurchaseOrder` → `purchaseOrder`). */
function delegateKey(modelName: string): string {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

/**
 * After `prisma generate`, Turbopack/HMR can keep an old `PrismaClient` on
 * `globalThis` that is missing new model delegates (e.g. `stockLot`).
 */
function clientMatchesGeneratedSchema(client: PrismaClient): boolean {
  for (const model of Prisma.dmmf.datamodel.models) {
    const key = delegateKey(model.name);
    if ((client as unknown as Record<string, unknown>)[key] == null) {
      return false;
    }
  }
  return true;
}

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  if (existing && clientMatchesGeneratedSchema(existing)) {
    return existing;
  }

  if (existing) {
    void existing.$disconnect().catch(() => undefined);
  }

  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}

/**
 * Always resolve through getPrismaClient() so Turbopack HMR picks up new
 * model delegates after `prisma generate` instead of freezing the first instance.
 */
export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getPrismaClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
