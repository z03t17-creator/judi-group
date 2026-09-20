import type { NotificationKind, Prisma, Role } from "@prisma/client";
import webpush from "web-push";
import {
  pickLocaleText,
  type LocaleText,
  type NotificationDto,
} from "@/lib/notification-types";
import { prisma } from "@/lib/prisma";
import { configureWebPush } from "@/lib/vapid";

export type { LocaleText, NotificationDto };
export { pickLocaleText };

function asLocaleText(value: unknown, fallback = ""): LocaleText {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const en = typeof record.en === "string" ? record.en : fallback;
    return {
      en,
      ar: typeof record.ar === "string" ? record.ar : en,
      ckb: typeof record.ckb === "string" ? record.ckb : en,
    };
  }
  if (typeof value === "string" && value.trim()) {
    return { en: value, ar: value, ckb: value };
  }
  return { en: fallback, ar: fallback, ckb: fallback };
}

export function toNotificationDto(row: {
  id: string;
  kind: NotificationKind;
  title: Prisma.JsonValue;
  body: Prisma.JsonValue | null;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  thumbUrl: string | null;
  actorId: string | null;
  readAt: Date | null;
  createdAt: Date;
  actor?: {
    fullName: string;
    primaryMedia?: { url: string } | null;
  } | null;
}): NotificationDto {
  return {
    id: row.id,
    kind: row.kind,
    title: asLocaleText(row.title),
    body: row.body == null ? null : asLocaleText(row.body),
    href: row.href,
    entityType: row.entityType,
    entityId: row.entityId,
    thumbUrl: row.thumbUrl,
    actorId: row.actorId,
    actorName: row.actor?.fullName ?? null,
    actorThumbUrl: row.actor?.primaryMedia?.url ?? null,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function listNotificationsForUser(userId: string, take = 100) {
  const rows = await prisma.userNotification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    include: {
      actor: {
        select: {
          fullName: true,
          primaryMedia: { select: { url: true } },
        },
      },
    },
  });
  return rows.map(toNotificationDto);
}

export async function countUnreadNotifications(userId: string) {
  return prisma.userNotification.count({
    where: { userId, readAt: null },
  });
}

export async function createNotifications(input: {
  userIds: string[];
  kind: NotificationKind;
  title: LocaleText;
  body?: LocaleText | null;
  href?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  thumbUrl?: string | null;
  actorId?: string | null;
  /** Skip Web Push (e.g. during seed). */
  silent?: boolean;
}) {
  const uniqueIds = [...new Set(input.userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  await prisma.userNotification.createMany({
    data: uniqueIds.map((userId) => ({
      userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? undefined,
      href: input.href ?? null,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      thumbUrl: input.thumbUrl ?? null,
      actorId: input.actorId ?? null,
    })),
  });

  if (!input.silent) {
    void pushToUsers(uniqueIds, {
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      kind: input.kind,
    }).catch(() => {
      /* push best-effort */
    });
  }

  return uniqueIds;
}

export async function userIdsByRoles(roles: Role[], excludeUserId?: string | null) {
  const users = await prisma.user.findMany({
    where: {
      role: { in: roles },
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

export async function userIdsForWarehouse(
  warehouseId: string,
  excludeUserId?: string | null,
) {
  const users = await prisma.user.findMany({
    where: {
      assignedWarehouseId: warehouseId,
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
    },
    select: { id: true },
  });
  return users.map((user) => user.id);
}

type PushPayload = {
  title: LocaleText;
  body: LocaleText | null;
  href: string | null;
  kind: NotificationKind;
};

export async function pushToUsers(userIds: string[], payload: PushPayload) {
  if (userIds.length === 0) return;

  const keys = await configureWebPush();
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
  });
  if (subscriptions.length === 0) return;

  const json = JSON.stringify({
    title: payload.title,
    body: payload.body,
    href: payload.href,
    kind: payload.kind,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          json,
          { TTL: 60 * 60 * 12 },
        );
      } catch (error) {
        const statusCode =
          error && typeof error === "object" && "statusCode" in error
            ? Number((error as { statusCode?: number }).statusCode)
            : 0;
        if (statusCode === 404 || statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        }
        // Keep keys referenced so bundlers do not tree-shake configureWebPush side effects.
        void keys.publicKey;
      }
    }),
  );
}

export async function upsertPushSubscription(input: {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
}) {
  return prisma.pushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      userId: input.userId,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
    update: {
      userId: input.userId,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
    },
  });
}

export async function deletePushSubscription(endpoint: string, userId?: string) {
  const existing = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!existing) return;
  if (userId && existing.userId !== userId) return;
  await prisma.pushSubscription.delete({ where: { endpoint } });
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const where =
    ids && ids.length > 0
      ? { userId, id: { in: ids }, readAt: null }
      : { userId, readAt: null };

  await prisma.userNotification.updateMany({
    where,
    data: { readAt: new Date() },
  });
}

export async function ensureWelcomeNotification(userId: string, role: Role) {
  const existing = await prisma.userNotification.findFirst({
    where: {
      userId,
      kind: "SYSTEM",
      entityType: "Welcome",
    },
    select: { id: true },
  });
  if (existing) return;

  const href = role === "FIELD_DELEGATE" ? "/field/alerts" : "/dashboard/alerts";
  await createNotifications({
    userIds: [userId],
    kind: "SYSTEM",
    title: {
      en: "Alerts are ready",
      ar: "التنبيهات جاهزة",
      ckb: "ئاگادارییەکان ئامادەن",
    },
    body: {
      en: "Enable device notifications so Judi can reach you when this app is installed from the home-screen shortcut or manifest.",
      ar: "فعّل إشعارات الجهاز حتى تصل تنبيهات جودي عند تثبيت التطبيق من الاختصار أو البيان.",
      ckb: "ئاگادارییەکانی ئامێر چالاک بکە تا جودی پێت بگات کاتێک ئەپەکە لە قەدبڕ یان مانیفێست دامەزرا.",
    },
    href,
    entityType: "Welcome",
    entityId: userId,
    silent: true,
  });
}
