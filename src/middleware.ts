import createIntlMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { routing } from "@/i18n/routing";
import { isOfficeRole } from "@/lib/constants";
import type { Role } from "@prisma/client";

const { auth } = NextAuth(authConfig);
const intlMiddleware = createIntlMiddleware(routing);

function pathWithoutLocale(pathname: string) {
  const segments = pathname.split("/");
  const maybeLocale = segments[1];
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }
  return pathname;
}

function localeFromPath(pathname: string) {
  const maybeLocale = pathname.split("/")[1];
  if (routing.locales.includes(maybeLocale as (typeof routing.locales)[number])) {
    return maybeLocale;
  }
  return routing.defaultLocale;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const locale = localeFromPath(pathname);
  const path = pathWithoutLocale(pathname);
  const isLoggedIn = Boolean(req.auth?.user);
  const role = req.auth?.user?.role as Role | undefined;

  const isLogin = path === "/login";
  const isDashboard = path === "/dashboard" || path.startsWith("/dashboard/");
  const isField = path === "/field" || path.startsWith("/field/");
  const isProtected = isDashboard || isField;

  if (!isLoggedIn && isProtected) {
    const loginUrl = new URL(`/${locale}/login`, req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoggedIn && isLogin) {
    const home =
      role === "FIELD_DELEGATE" ? `/${locale}/field` : `/${locale}/dashboard`;
    return NextResponse.redirect(new URL(home, req.nextUrl.origin));
  }

  if (isLoggedIn && isDashboard && role === "FIELD_DELEGATE") {
    return NextResponse.redirect(new URL(`/${locale}/field`, req.nextUrl.origin));
  }

  if (isLoggedIn && isField && role && isOfficeRole(role)) {
    return NextResponse.redirect(
      new URL(`/${locale}/dashboard`, req.nextUrl.origin),
    );
  }

  return intlMiddleware(req);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
