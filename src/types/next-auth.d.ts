import type { DefaultSession } from "next-auth";
import type { Role } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
      warehouseId: string | null;
      maxDiscountAllowed: string;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
    warehouseId: string | null;
    maxDiscountAllowed: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    warehouseId?: string | null;
    maxDiscountAllowed?: string;
  }
}
