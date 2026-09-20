import { ArrowLeft, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function OfficeInvoiceNotFound() {
  const t = await getTranslations("invoices");

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <p
        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        <FileText className="mt-0.5 size-5 shrink-0" aria-hidden />
        <span>{t("invoiceNotFound")}</span>
      </p>
      <Link
        href="/dashboard/invoices"
        className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t("backToList")}
      </Link>
    </main>
  );
}
