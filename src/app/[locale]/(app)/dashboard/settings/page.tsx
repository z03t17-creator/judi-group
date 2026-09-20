import {
  Building2,
  DatabaseBackup,
  Download,
  Palette,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { getTranslations } from "next-intl/server";
import { requireOfficeSession } from "@/lib/rbac";
import { getCompanyProfile } from "@/lib/company-profile";
import { DbBackupPanel } from "@/components/db-backup-panel";
import { DensityToggle } from "@/components/density-toggle";
import { ThemePicker } from "@/components/theme-picker";
import { CompanyProfileForm } from "./company-profile-form";
import { PwaInstallPanel } from "@/components/pwa-install-panel";

export default async function SettingsPage() {
  const session = await requireOfficeSession();
  const t = await getTranslations("settings");
  const isAdmin = session.user.role === "ADMIN";
  const company = await getCompanyProfile();

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 text-start">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-judi-800 dark:text-judi-100">
            <Settings className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-fg">{t("title")}</h1>
        </div>
      </div>

      <section
        className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
        aria-labelledby="company-heading"
      >
        <div className="mb-4 flex items-center gap-3 text-start">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-fg">
            <Building2 className="size-5" aria-hidden />
          </span>
          <h2 id="company-heading" className="text-lg font-semibold text-fg">
            {t("company")}
          </h2>
        </div>
        <CompanyProfileForm profile={company} canEdit={isAdmin} />
      </section>

      <section
        className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
        aria-labelledby="appearance-heading"
      >
        <div className="mb-4 flex items-center gap-3 text-start">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-fg">
            <Palette className="size-5" aria-hidden />
          </span>
          <h2 id="appearance-heading" className="text-lg font-semibold text-fg">
            {t("appearance")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg">{t("themeLabel")}</p>
          <ThemePicker />
        </div>
      </section>

      <section
        className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
        aria-labelledby="advanced-heading"
      >
        <div className="mb-4 flex items-center gap-3 text-start">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-fg">
            <SlidersHorizontal className="size-5" aria-hidden />
          </span>
          <h2 id="advanced-heading" className="text-lg font-semibold text-fg">
            {t("advanced")}
          </h2>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg">{t("densityLabel")}</p>
          <DensityToggle />
        </div>
      </section>

      <section
        className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
        aria-labelledby="pwa-heading"
      >
        <div className="mb-4 flex items-center gap-3 text-start">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-fg">
            <Download className="size-5" aria-hidden />
          </span>
          <h2 id="pwa-heading" className="text-lg font-semibold text-fg">
            {t("pwaTitle")}
          </h2>
        </div>
        <PwaInstallPanel />
      </section>

      {isAdmin ? (
        <section
          className="rounded-2xl border border-line bg-surface p-5 shadow-sm"
          aria-labelledby="backup-heading"
        >
          <div className="mb-4 flex items-center gap-3 text-start">
            <span className="inline-flex size-10 items-center justify-center rounded-xl bg-muted text-fg">
              <DatabaseBackup className="size-5" aria-hidden />
            </span>
            <h2 id="backup-heading" className="text-lg font-semibold text-fg">
              {t("backup")}
            </h2>
          </div>
          <DbBackupPanel />
        </section>
      ) : null}
    </main>
  );
}
