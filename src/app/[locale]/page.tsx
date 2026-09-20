import { auth } from "@/auth";
import { getLocale } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function LocaleIndexPage() {
  const session = await auth();
  const locale = await getLocale();

  if (!session?.user) {
    redirect(`/${locale}/login`);
  }

  if (session.user.role === "FIELD_DELEGATE") {
    redirect(`/${locale}/field`);
  }

  redirect(`/${locale}/dashboard`);
}
