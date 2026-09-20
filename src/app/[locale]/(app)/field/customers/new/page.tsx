import { ArrowLeft, UserPlus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/rbac";
import { AddCustomerForm } from "./add-customer-form";

export default async function FieldAddCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();
  const params = await searchParams;

  return (
    <main className="mx-auto w-full max-w-content space-y-4 pb-28 sm:pb-8">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          href="/field/customers"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("field.back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="flex items-center gap-2 text-sm font-medium text-judi-800 dark:text-judi-200">
            <UserPlus className="size-4 shrink-0" aria-hidden />
            {t("field.addCustomerTitle")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.addCustomerTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.addCustomerSubtitle")}</p>
        </div>
      </header>

      {params.error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {t("common.error")}
        </p>
      ) : null}

      <AddCustomerForm />
    </main>
  );
}
