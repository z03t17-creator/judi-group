import { Bell } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { AlertsDirectory } from "@/components/alerts-directory";
import {
  ensureWelcomeNotification,
  listNotificationsForUser,
} from "@/lib/notifications";
import { requireOfficeSession } from "@/lib/rbac";

export default async function DashboardAlertsPage() {
  const session = await requireOfficeSession();
  const t = await getTranslations();

  await ensureWelcomeNotification(session.user.id, session.user.role);
  const items = await listNotificationsForUser(session.user.id);

  return (
    <main className="mx-auto w-full max-w-content space-y-4">
      <header className="flex flex-wrap items-start gap-3 text-start">
        <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-judi-800 dark:text-judi-100">
          <Bell className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-fg">{t("field.alertsTitle")}</h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.alertsSubtitle")}</p>
        </div>
      </header>

      <AlertsDirectory initialItems={items} homeHref="/dashboard" />
    </main>
  );
}
