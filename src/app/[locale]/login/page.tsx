import { Building2, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { JudiLogo } from "@/components/judi-logo";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { getDevLoginAccounts, SEED_PASSWORD } from "@/lib/dev-accounts";
import { DevLoginAccounts } from "./dev-login-accounts";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const t = await getTranslations();
  const params = await searchParams;
  const devAccounts = getDevLoginAccounts();

  return (
    <main className="relative min-h-dvh bg-canvas">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-200/50 via-canvas to-amber-50/40 dark:from-judi-800/50 dark:via-canvas dark:to-judi-950" />
        <div className="absolute -end-24 -top-24 h-72 w-72 rounded-full bg-sky-300/35 blur-3xl dark:bg-sky-500/20" />
        <div className="absolute -bottom-32 -start-16 h-80 w-80 rounded-full bg-amber-400/20 blur-3xl dark:bg-amber-400/10" />
      </div>

      <div
        className="relative mx-auto flex min-h-full w-full max-w-content flex-col"
        style={{
          paddingInlineStart: "max(1rem, env(safe-area-inset-left, 0px))",
          paddingInlineEnd: "max(1rem, env(safe-area-inset-right, 0px))",
          paddingTop: "max(1rem, env(safe-area-inset-top, 0px))",
          paddingBottom: "max(1rem, env(safe-area-inset-bottom, 0px))",
        }}
      >
        <header className="flex shrink-0 items-center justify-end gap-2 sm:gap-3">
          <ThemeToggle />
          <LocaleSwitcher />
        </header>

        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-6 sm:max-w-lg sm:py-10 lg:max-w-xl lg:py-12">
          <div className="mb-6 flex flex-col items-start gap-4 text-start sm:mb-8">
            <JudiLogo href={null} size="lg" tone="surface" />
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">
                {t("auth.loginTitle")}
              </h1>
              <p className="mt-1.5 max-w-prose text-sm text-fg-muted sm:text-base">
                {t("auth.loginSubtitle")}
              </p>
            </div>
          </div>

          <section aria-labelledby="login-heading">
            <h2 id="login-heading" className="sr-only">
              {t("auth.loginTitle")}
            </h2>
            {devAccounts.length > 0 ? (
              <DevLoginAccounts
                accounts={devAccounts}
                seedPassword={SEED_PASSWORD}
              />
            ) : null}
            <LoginForm
              callbackUrl={params.callbackUrl}
              warehouseError={params.error === "warehouse"}
            />
          </section>

          {devAccounts.length === 0 ? (
          <aside
            className="mt-6 text-start sm:mt-8"
            aria-labelledby="login-role-hint-title"
          >
            <div className="mb-3">
              <h2
                id="login-role-hint-title"
                className="text-sm font-semibold text-fg"
              >
                {t("auth.roleHintTitle")}
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">{t("auth.roleHint")}</p>
            </div>

            <ul className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              <li className="flex min-h-touch items-start gap-3 rounded-2xl border border-line bg-surface/90 px-3 py-3 dark:bg-surface/60">
                <span className="icon-badge icon-badge-md tone-sky">
                  <Building2 className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 text-start">
                  <p className="text-sm font-medium text-fg">
                    {t("auth.roleHintOfficeTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">
                    {t("auth.roleHintOffice")}
                  </p>
                </div>
              </li>
              <li className="flex min-h-touch items-start gap-3 rounded-2xl border border-line bg-surface/90 px-3 py-3 dark:bg-surface/60">
                <span className="icon-badge icon-badge-md tone-amber">
                  <Truck className="size-5" aria-hidden />
                </span>
                <div className="min-w-0 text-start">
                  <p className="text-sm font-medium text-fg">
                    {t("auth.roleHintFieldTitle")}
                  </p>
                  <p className="mt-0.5 text-xs text-fg-muted sm:text-sm">
                    {t("auth.roleHintField")}
                  </p>
                </div>
              </li>
            </ul>
          </aside>
          ) : null}

          <p className="mt-8 text-center text-xs text-fg-subtle sm:mt-10">
            {t("app.tagline")}
          </p>
        </div>
      </div>
    </main>
  );
}
