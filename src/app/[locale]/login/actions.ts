"use server";

import { AuthError } from "next-auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { loginSchema } from "@/lib/validators";

export type LoginState = { error?: string } | undefined;

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  const locale = await getLocale();

  if (!parsed.success) {
    return { error: "invalid" };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "invalid" };
    }
    throw error;
  }

  const callbackUrl = formData.get("callbackUrl");
  if (typeof callbackUrl === "string" && callbackUrl.startsWith("/")) {
    redirect(callbackUrl);
  }

  redirect(`/${locale}`);
}

export async function devLoginAction(formData: FormData) {
  if (process.env.NODE_ENV === "production") {
    return { error: "invalid" } satisfies LoginState;
  }
  return loginAction(undefined, formData);
}
