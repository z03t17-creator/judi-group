import type { NotificationKind } from "@prisma/client";

export type LocaleText = {
  en: string;
  ar: string;
  ckb: string;
};

export type NotificationDto = {
  id: string;
  kind: NotificationKind;
  title: LocaleText;
  body: LocaleText | null;
  href: string | null;
  entityType: string | null;
  entityId: string | null;
  thumbUrl: string | null;
  actorId: string | null;
  actorName: string | null;
  actorThumbUrl: string | null;
  readAt: string | null;
  createdAt: string;
};

export function pickLocaleText(text: LocaleText | null | undefined, locale: string) {
  if (!text) return "";
  if (locale === "ar") return text.ar || text.en;
  if (locale === "ckb") return text.ckb || text.en;
  return text.en;
}
