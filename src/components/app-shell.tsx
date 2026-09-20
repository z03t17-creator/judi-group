import { AlertsNavButton } from "@/components/alerts-nav-button";
import { JudiLogo } from "@/components/judi-logo";
import { FieldBottomNav } from "@/components/field-bottom-nav";
import { OfficeSidebar } from "@/components/office-sidebar";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import type { Role } from "@prisma/client";

type AppShellProps = {
  role: Role;
  name: string;
  children: React.ReactNode;
};

export function AppShell({ role, name, children }: AppShellProps) {
  const isField = role === "FIELD_DELEGATE";

  if (isField) {
    return (
      <div className="min-h-screen bg-canvas">
        <header
          className="sticky top-0 z-30 border-b border-judi-800 bg-judi-950 text-white"
          style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          <div className="page-frame flex items-center justify-between gap-2 py-2 sm:py-2.5">
            <JudiLogo href="/field" size="sm" tone="chrome" />
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <p className="hidden text-sm text-judi-100 sm:block">{name}</p>
              <AlertsNavButton href="/field/alerts" />
              <ThemeToggle />
              <LocaleSwitcher tone="chrome" />
              <SignOutButton variant="sidebar" />
            </div>
          </div>
        </header>
        <div className="page-frame-field">{children}</div>
        <FieldBottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-canvas">
      <OfficeSidebar role={role} name={name} />
      <div className="min-w-0 flex-1 overflow-x-hidden">
        <div
          className="page-frame py-6"
          style={{ paddingTop: "max(1.5rem, env(safe-area-inset-top, 0px))" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
