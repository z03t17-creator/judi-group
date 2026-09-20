import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import {
  countUnreadNotifications,
  listNotificationsForUser,
  markNotificationsRead,
} from "@/lib/notifications";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const countOnly = new URL(request.url).searchParams.get("count") === "1";
  if (countOnly) {
    const unreadCount = await countUnreadNotifications(session.user.id);
    return NextResponse.json({ unreadCount });
  }

  const items = await listNotificationsForUser(session.user.id);
  const unreadCount = items.filter((item) => !item.readAt).length;
  return NextResponse.json({ items, unreadCount });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = z
    .object({
      ids: z.array(z.string().min(1)).optional(),
      all: z.boolean().optional(),
    })
    .safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!parsed.data.all && (!parsed.data.ids || parsed.data.ids.length === 0)) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  await markNotificationsRead(
    session.user.id,
    parsed.data.all ? undefined : parsed.data.ids,
  );

  return NextResponse.json({ ok: true });
}
