import { getTranslations } from "next-intl/server";
import {
  BarChart3,
  Bell,
  FilePlus2,
  ListTree,
  MapPinned,
  RotateCcw,
  UserPlus,
  UserRoundSearch,
  Wallet,
} from "lucide-react";
import { InstantLink } from "@/components/instant-nav";
import { DensityToggle } from "@/components/density-toggle";
import { ThemePicker } from "@/components/theme-picker";
import { requireRole } from "@/lib/rbac";
import { iconBadge, tileTone, type UiTone } from "@/lib/ui-tones";

export default async function FieldMorePage() {
  await requireRole(["FIELD_DELEGATE"]);
  const t = await getTranslations();
  const tSettings = await getTranslations("settings");

  const items = [
    {
      href: "/field/alerts" as const,
      title: t("field.alertsTitle"),
      hint: t("field.alertsSubtitle"),
      icon: Bell,
      thumbKind: "stock" as const,
      tone: "amber" as UiTone,
    },
    {
      href: "/field/reports" as const,
      title: t("field.reportsTitle"),
      hint: t("field.reportsSubtitle"),
      icon: BarChart3,
      thumbKind: "stock" as const,
      tone: "blue" as UiTone,
    },
    {
      href: "/field/movements" as const,
      title: t("field.movementsTitle"),
      hint: t("field.movementsSubtitle"),
      icon: ListTree,
      thumbKind: "stock" as const,
      tone: "indigo" as UiTone,
    },
    {
      href: "/field/customers/new" as const,
      title: t("field.addCustomerTitle"),
      hint: t("field.addCustomerHint"),
      icon: UserPlus,
      thumbKind: "store" as const,
      tone: "sky" as UiTone,
    },
    {
      href: "/field/prospects" as const,
      title: t("field.prospectsTitle"),
      hint: t("field.prospectsSubtitle"),
      icon: UserRoundSearch,
      thumbKind: "store" as const,
      tone: "cyan" as UiTone,
    },
    {
      href: "/field/settings" as const,
      title: t("field.siteSettingsTitle"),
      hint: t("field.siteSettingsSubtitle"),
      icon: MapPinned,
      thumbKind: "store" as const,
      tone: "slate" as UiTone,
    },
    {
      href: "/field/invoice" as const,
      title: t("field.orderTitle"),
      hint: t("field.orderHint"),
      icon: FilePlus2,
      thumbKind: "product" as const,
      tone: "teal" as UiTone,
    },
    {
      href: "/field/return" as const,
      title: t("field.returnTitle"),
      hint: t("field.returnHint"),
      icon: RotateCcw,
      thumbKind: "stock" as const,
      tone: "orange" as UiTone,
    },
    {
      href: "/field/collection" as const,
      title: t("field.collection"),
      hint: t("field.collectionHint"),
      icon: Wallet,
      thumbKind: "stock" as const,
      tone: "emerald" as UiTone,
    },

  return (
    <main className="mx-auto w-full max-w-content space-y-6">
      <div className="text-start">
        <h1 className="text-2xl font-bold text-fg">{t("field.moreTitle")}</h1>
        <p className="mt-1 text-fg-muted">{t("field.moreSubtitle")}</p>
        <p className="mt-1 text-sm text-fg-subtle">{t("field.moreToolsHint")}</p>
      </div>

      <section
        className="space-y-4 rounded-2xl border border-line bg-surface p-4 shadow-sm"
        aria-labelledby="field-appearance-heading"
      >
        <h2
          id="field-appearance-heading"
          className="text-sm font-semibold text-fg text-start"
        >
          {tSettings("appearance")}
        </h2>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg">{tSettings("themeLabel")}</p>
          <ThemePicker />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-fg">{tSettings("densityLabel")}</p>
          <DensityToggle />
        </div>
      </section>

      <section className="space-y-3" aria-label={t("field.moreToolsTitle")}>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <InstantLink
              key={item.href}
              href={item.href}
              className={`flex min-h-touch items-center gap-4 rounded-2xl border bg-surface p-4 text-start shadow-sm ${tileTone(item.tone)}`}
            >
              <span className={iconBadge(item.tone, "lg")}>
                <Icon className="size-6" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-fg">{item.title}</p>
                <p className="mt-1 text-sm text-fg-muted">{item.hint}</p>
              </div>
            </InstantLink>
          );
        })}
      </section>
    </main>
  );
}
