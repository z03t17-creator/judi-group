import { AppShell } from "@/components/app-shell";
import { NavigationProgress } from "@/components/instant-nav";
import { PushBootstrap } from "@/components/push-bootstrap";
import { requireSession } from "@/lib/rbac";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <AppShell
      role={session.user.role}
      name={session.user.name ?? session.user.email ?? ""}
    >
      <NavigationProgress />
      <PushBootstrap />
      {children}
    </AppShell>
  );
}
