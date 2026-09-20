import { ArrowLeft, UserRoundSearch } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/rbac";
import { ProspectsDirectory } from "./prospects-directory";

export default async function FieldProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string; focus?: string }>;
}) {
  await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();
  const params = await searchParams;
  const focusId = params.focus?.trim() || null;

  const stores = await prisma.store.findMany({
    where: { status: "PROSPECT" },
    orderBy: { storeName: "asc" },
    include: {
      primaryMedia: { select: { url: true } },
    },
  });

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
            <UserRoundSearch className="size-4 shrink-0" aria-hidden />
            {t("field.prospectsTitle")}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-fg sm:text-2xl">
            {t("field.prospectsTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-fg-muted">{t("field.prospectsSubtitle")}</p>
        </div>
      </header>

      {params.error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {params.error === "gps" ? t("stores.gpsDenied") : t("common.error")}
        </p>
      ) : null}
      {params.ok ? (
        <p className="rounded-xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-900 text-start dark:border-judi-800 dark:bg-judi-950/40 dark:text-judi-100">
          {params.ok === "gps"
            ? t("stores.gpsSaved")
            : params.ok === "updated"
              ? t("stores.updated")
              : t("stores.created")}
        </p>
      ) : null}

      <ProspectsDirectory
        focusId={focusId}
        stores={stores.map((store) => ({
          id: store.id,
          storeName: store.storeName,
          ownerName: store.ownerName,
          phone: store.phone,
          email: store.email,
          address: store.address,
          tier: store.tier,
          status: store.status,
          latitude: store.latitude,
          longitude: store.longitude,
          primaryMediaUrl: store.primaryMedia?.url ?? null,
        }))}
      />
    </main>
  );
}
