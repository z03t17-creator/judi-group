import { ArrowLeft, Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AlertsDirectory } from "@/components/alerts-directory";
import {
  ensureWelcomeNotification,
  listNotificationsForUser,
} from "@/lib/notifications";
import { requireRole } from "@/lib/rbac";

export default async function FieldAlertsPage() {
  const session = await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();

  await ensureWelcomeNotification(session.user.id, session.user.role);
  const items = await listNotificationsForUser(session.user.id);

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3">
        <Link
          href="/field"
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl border border-line-strong bg-surface text-fg hover:bg-muted"
          aria-label={t("field.back")}
        >
          <ArrowLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <div className="min-w-0 flex-1 text-start">
          <p className="flex items-center gap-2 text-sm font-medium text-judi-800 dark:text-judi-200">
            <Bell className="size-4 shrink-0" aria-hidden />
            {t("field.alertsTitle")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.alertsTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.alertsSubtitle")}</p>
        </div>
      </header>

      <AlertsDirectory initialItems={items} homeHref="/field" />
    </main>
  );
}
