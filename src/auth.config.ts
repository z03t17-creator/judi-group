import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/en/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.warehouseId = user.warehouseId;
        token.maxDiscountAllowed = user.maxDiscountAllowed;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.role = token.role as Role;
        session.user.warehouseId = (token.warehouseId as string | null) ?? null;
        session.user.maxDiscountAllowed = String(token.maxDiscountAllowed ?? "0");
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
