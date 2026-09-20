"use client";

import { useId, useState } from "react";
import {
  Building2,
  MapPin,
  ShoppingBag,
  Store,
  UserPlus,
  UserRoundSearch,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Thumb } from "@/components/thumb";
import { STORE_TIERS } from "@/lib/constants";
import { createFieldStoreAction } from "../actions";

type SaveKind = "ACTIVE" | "PROSPECT";

export function AddCustomerForm() {
  const t = useTranslations();
  const formId = useId();
  const [kind, setKind] = useState<SaveKind>("ACTIVE");
  const [gpsPending, setGpsPending] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  function captureGps() {
    if (!navigator.geolocation) {
      setGpsError(t("stores.gpsUnavailable"));
      return;
    }
    setGpsPending(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setGpsError(null);
        setGpsPending(false);
      },
      () => {
        setGpsPending(false);
        setGpsError(t("stores.gpsDenied"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <form
      id={formId}
      action={createFieldStoreAction}
      className="space-y-4"
    >
      <input type="hidden" name="returnTo" value="new" />
      <input type="hidden" name="status" value={kind} />
      <input type="hidden" name="latitude" value={lat} />
      <input type="hidden" name="longitude" value={lng} />

      <section className="surface-panel space-y-4 p-4 sm:p-5">
        <div className="flex items-start gap-3 text-start">
          <Thumb kind="store" size="lg" src={null} alt="" icon={Store} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-fg">{t("stores.createHint")}</p>
            <p className="mt-1 text-sm text-fg-muted">{t("stores.photosAfterSave")}</p>
          </div>
        </div>

        <fieldset className="space-y-2 text-start">
          <legend className="text-sm font-medium text-fg">{t("field.customerKind")}</legend>
          <p className="text-sm text-fg-muted">{t("field.customerKindHint")}</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <KindChip
              pressed={kind === "ACTIVE"}
              onClick={() => setKind("ACTIVE")}
              icon={UserPlus}
              label={t("field.saveAsCustomer")}
            />
            <KindChip
              pressed={kind === "PROSPECT"}
              onClick={() => setKind("PROSPECT")}
              icon={UserRoundSearch}
              label={t("field.saveAsProspect")}
            />
          </div>
        </fieldset>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="block text-start md:col-span-2">
            <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-fg">
              <Store className="size-3.5 text-judi-700 dark:text-judi-300" aria-hidden />
              {t("stores.storeName")}
            </span>
            <input
              name="storeName"
              required
              placeholder={t("stores.storeNameHint")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg placeholder:text-fg-subtle"
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-fg">{t("stores.ownerName")}</span>
            <input
              name="ownerName"
              placeholder={t("stores.ownerNameHint")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg placeholder:text-fg-subtle"
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-fg">{t("stores.phone")}</span>
            <input
              name="phone"
              required
              inputMode="tel"
              placeholder={t("stores.phoneHint")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg placeholder:text-fg-subtle"
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-fg">{t("stores.email")}</span>
            <input
              name="email"
              type="email"
              placeholder={t("stores.emailHint")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg placeholder:text-fg-subtle"
            />
          </label>
          <label className="block text-start">
            <span className="mb-1 block text-sm font-medium text-fg">{t("stores.address")}</span>
            <input
              name="address"
              placeholder={t("stores.addressHint")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg placeholder:text-fg-subtle"
            />
          </label>
          <label className="block text-start md:col-span-2">
            <span className="mb-1 flex items-center gap-1.5 text-sm font-medium text-fg">
              <Building2 className="size-3.5 text-judi-700 dark:text-judi-300" aria-hidden />
              {t("stores.tier")}
            </span>
            <select
              name="tier"
              defaultValue="SUPERMARKET"
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
            >
              {STORE_TIERS.map((tier) => (
                <option key={tier} value={tier}>
                  {t(`storeTiers.${tier}`)}
                </option>
              ))}
            </select>
            <span className="mt-1 flex items-center gap-1 text-xs text-fg-muted">
              <ShoppingBag className="size-3 shrink-0" aria-hidden />
              {t("stores.tierHint")}
            </span>
          </label>
        </div>
      </section>

      <section className="surface-panel space-y-3 p-4 sm:p-5 text-start">
        <h2 className="font-semibold text-fg">{t("field.gpsCoords")}</h2>
        <p className="text-sm text-fg-muted">
          {lat && lng
            ? `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`
            : t("field.noCoords")}
        </p>
        {gpsError ? (
          <p className="text-sm text-red-700 dark:text-red-300" role="alert">
            {gpsError}
          </p>
        ) : null}
        <button
          type="button"
          onClick={captureGps}
          disabled={gpsPending}
          className="inline-flex min-h-touch items-center gap-2 rounded-xl border border-judi-300 px-4 font-semibold text-judi-900 dark:border-judi-700 dark:text-judi-200"
        >
          <MapPin className="size-4 shrink-0" aria-hidden />
          {gpsPending ? t("stores.capturing") : t("stores.captureGps")}
        </button>
      </section>

      <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-line bg-surface/95 p-3 backdrop-blur sm:static sm:bottom-auto sm:z-auto sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        <button
          type="submit"
          form={formId}
          className="btn btn-important mx-auto w-full max-w-content text-lg"
        >
          <UserPlus className="size-5 shrink-0" aria-hidden />
          {kind === "PROSPECT" ? t("field.saveAsProspect") : t("field.addCustomerSticky")}
        </button>
      </div>
    </form>
  );
}

function KindChip({
  pressed,
  onClick,
  icon: Icon,
  label,
}: {
  pressed: boolean;
  onClick: () => void;
  icon: typeof UserPlus;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-touch items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors ${
        pressed
          ? "seg-on"
          : "border border-line-strong bg-muted text-fg hover:bg-surface"
      }`}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
