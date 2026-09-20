import { cache } from "react";
import { auth } from "@/auth";
import { isOfficeRole } from "@/lib/constants";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

/** One JWT read per request — layout + page both call requireSession. */
const getSession = cache(() => auth());

export async function requireSession() {
  const session = await getSession();
  const locale = await getLocale();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  const locale = await getLocale();

  if (!roles.includes(session.user.role)) {
    redirect(
      session.user.role === "FIELD_DELEGATE"
        ? `/${locale}/field`
        : `/${locale}/dashboard`,
    );
  }

  return session;
}

export async function requireWarehouse() {
  const session = await requireSession();
  const locale = await getLocale();

  if (!session.user.warehouseId && session.user.role !== "ADMIN") {
    redirect(`/${locale}/login?error=warehouse`);
  }

  return session;
}

export async function requireOfficeSession() {
  const session = await requireSession();
  const locale = await getLocale();

  if (!isOfficeRole(session.user.role)) {
    redirect(`/${locale}/field`);
  }

  return session;
}
