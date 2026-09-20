"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import {
  Banknote,
  Camera,
  CircleDollarSign,
  NotebookPen,
  Search,
  Store,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { AmountInput } from "@/components/amount-input";
import { CameraCapture } from "@/components/camera-capture";
import { Thumb } from "@/components/thumb";
import { useRouter } from "@/i18n/navigation";
import {
  createFieldCollectionResult,
  createOfficeCollectionResult,
} from "@/lib/collection-actions";
import { PAYMENT_METHODS } from "@/lib/constants";
import { formatDualMoney, formatMoney } from "@/lib/money";

export type CollectionStore = {
  id: string;
  storeName: string;
  ownerName: string | null;
  phone: string;
  currentDebt: string;
  currentDebtUsd: string;
  primaryMediaUrl?: string | null;
};

type CollectionFormProps = {
  stores: CollectionStore[];
  successId?: string;
  errorCode?: string;
  surface?: "office" | "field";
  /** Pre-select a store (e.g. deep-link from debts AR list). */
  initialStoreId?: string | null;
};

const fieldClass =
  "min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface";

async function uploadCollectionProof(transactionId: string, blob: Blob) {
  const form = new FormData();
  form.set("file", blob, "capture.jpg");
  form.set("kind", "STOCK");
  form.set("entityType", "Transaction");
  form.set("entityId", transactionId);
  const res = await fetch("/api/media", { method: "POST", body: form });
  if (!res.ok) throw new Error("upload_failed");
}

function storeHasDebt(store: CollectionStore) {
  return Number(store.currentDebt) > 0 || Number(store.currentDebtUsd) > 0;
}

export function CollectionForm({
  stores,
  successId,
  errorCode,
  surface = "office",
  initialStoreId = null,
}: CollectionFormProps) {
  const t = useTranslations();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [debtOnly, setDebtOnly] = useState(true);
  const [storeId, setStoreId] = useState(() => {
    if (initialStoreId && stores.some((store) => store.id === initialStoreId)) {
      return initialStoreId;
    }
    return stores.find(storeHasDebt)?.id ?? stores[0]?.id ?? "";
  });
  const [currency, setCurrency] = useState<"IQD" | "USD">("IQD");
  const [amount, setAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(errorCode ?? null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [proofPreviews, setProofPreviews] = useState<{ url: string; blob: Blob }[]>(
    [],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return stores.filter((store) => {
      if (debtOnly && !storeHasDebt(store)) return false;
      if (!needle) return true;
      return (
        store.storeName.toLowerCase().includes(needle) ||
        store.phone.includes(needle) ||
        (store.ownerName ?? "").toLowerCase().includes(needle)
      );
    });
  }, [debtOnly, query, stores]);

  const selected = stores.find((store) => store.id === storeId) ?? filtered[0] ?? null;
  const debt = selected
    ? currency === "USD"
      ? selected.currentDebtUsd
      : selected.currentDebt
    : "0";
  const hasDebt = Number(debt) > 0;

  function addProof(blob: Blob) {
    const url = URL.createObjectURL(blob);
    setProofPreviews((prev) => [...prev, { url, blob }]);
  }

  function removeProof(index: number) {
    setProofPreviews((prev) => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed) URL.revokeObjectURL(removed.url);
      return next;
    });
  }

  function errorMessage(code: string) {
    if (code === "overpay") return t("collection.overpay");
    if (code === "no_debt") return t("collection.noDebt");
    if (code === "invalid_amount" || code === "invalid") {
      return t("collection.invalidAmount");
    }
    if (code === "upload_failed") return t("collection.uploadFailed");
    return t("common.error");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !hasDebt || pending) return;

    const formData = new FormData(event.currentTarget);
    formData.set("storeId", selected.id);
    formData.set("currency", currency);
    formData.set("amount", amount);

    startTransition(async () => {
      setFormError(null);
      const recordAction =
        surface === "office"
          ? createOfficeCollectionResult
          : createFieldCollectionResult;
      const result = await recordAction(formData);
      if (!result.ok) {
        setFormError(result.error);
        return;
      }

      let uploadFailed = false;
      try {
        for (const item of proofPreviews) {
          await uploadCollectionProof(result.transactionId, item.blob);
        }
      } catch {
        uploadFailed = true;
      }

      for (const item of proofPreviews) {
        URL.revokeObjectURL(item.url);
      }
      setProofPreviews([]);
      setAmount("");

      const qs = new URLSearchParams({ recorded: "1" });
      if (uploadFailed) qs.set("error", "upload_failed");

      if (surface === "office") {
        router.replace(
          `/dashboard/collections/${result.transactionId}?${qs.toString()}`,
        );
      } else {
        const fieldQs = new URLSearchParams({ ok: result.transactionId });
        if (uploadFailed) fieldQs.set("error", "upload_failed");
        router.replace(`/field/collection?${fieldQs.toString()}`);
      }
      router.refresh();
    });
  }

  const stickyClass =
    surface === "field" ? "sticky-form-actions-field" : "sticky-form-actions";

  return (
    <div className="space-y-4">
      {successId ? (
        <p
          className="rounded-xl border border-judi-200 bg-judi-50 px-4 py-3 text-sm text-judi-950 text-start dark:border-judi-800 dark:bg-judi-950/40 dark:text-judi-100"
          role="status"
        >
          {t("collection.recorded")}
        </p>
      ) : null}
      {formError ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {errorMessage(formError)}
        </p>
      ) : null}

      <section className="surface-panel space-y-3 p-3 sm:p-4">
        <div className="flex items-center gap-2 text-start">
          <Store
            className="size-4 shrink-0 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <h2 className="text-sm font-semibold text-fg">{t("collection.searchStore")}</h2>
        </div>

        <label className="relative block text-start">
          <span className="sr-only">{t("collection.searchStore")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("stores.search")}
            className={`${fieldClass} ps-9`}
          />
        </label>

        <div role="group" aria-label={t("collection.hasDebt")} className="chip-scroll">
          <button
            type="button"
            aria-pressed={debtOnly}
            onClick={() => setDebtOnly(true)}
            className={`inline-flex min-h-touch shrink-0 items-center rounded-xl px-3 text-sm font-medium ${
              debtOnly
                ? "seg-on"
                : "border border-line-strong bg-muted text-fg hover:bg-surface"
            }`}
          >
            {t("collection.hasDebt")}
          </button>
          <button
            type="button"
            aria-pressed={!debtOnly}
            onClick={() => setDebtOnly(false)}
            className={`inline-flex min-h-touch shrink-0 items-center rounded-xl px-3 text-sm font-medium ${
              !debtOnly
                ? "seg-on"
                : "border border-line-strong bg-muted text-fg hover:bg-surface"
            }`}
          >
            {t("collection.allStores")}
          </button>
        </div>

        <div className="max-h-[min(16rem,50vh)] space-y-2 overflow-y-auto overscroll-contain">
          {filtered.length === 0 ? (
            <p className="px-1 py-4 text-sm text-fg-muted text-start">
              {t("collection.noStores")}
            </p>
          ) : (
            filtered.map((store) => {
              const active = store.id === (selected?.id ?? "");
              const owing = storeHasDebt(store);
              return (
                <button
                  key={store.id}
                  type="button"
                  onClick={() => {
                    setStoreId(store.id);
                    setAmount("");
                    setCurrency(Number(store.currentDebt) > 0 ? "IQD" : "USD");
                  }}
                  className={`flex min-h-touch w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-start ${
                    active
                      ? "border-judi-500 bg-judi-50 dark:bg-judi-950/40"
                      : "border-line bg-surface hover:bg-muted"
                  }`}
                >
                  <Thumb
                    kind="store"
                    size="sm"
                    src={store.primaryMediaUrl}
                    alt=""
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-fg">
                      {store.storeName}
                    </span>
                    <span className="block truncate text-sm tabular-nums text-fg-muted">
                      {store.ownerName ? `${store.ownerName} · ` : ""}
                      {store.phone}
                    </span>
                    <span className="mt-0.5 block text-sm tabular-nums text-fg" dir="ltr">
                      {formatDualMoney(store.currentDebt, store.currentDebtUsd)}
                    </span>
                  </span>
                  <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-xs font-semibold ${
                      owing
                        ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                        : "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100"
                    }`}
                  >
                    {owing ? t("collection.hasDebt") : t("collection.cleared")}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </section>

      {selected ? (
        <form onSubmit={onSubmit} className="space-y-0">
        <div className="space-y-4 rounded-2xl border border-line bg-surface p-3 shadow-sm sm:p-4">
          <div className="flex items-start gap-3 text-start">
            <Thumb
              kind="store"
              size="md"
              src={selected.primaryMediaUrl}
              alt=""
            />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-fg">{selected.storeName}</h2>
              <p className="text-sm text-fg-muted">
                {selected.ownerName ? `${selected.ownerName} · ` : ""}
                {selected.phone}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="inline-flex min-h-8 items-center rounded-lg bg-muted px-2.5 text-sm tabular-nums text-fg">
                  {t("invoices.currencies.IQD")}: {formatMoney(selected.currentDebt, "IQD")}
                </span>
                <span className="inline-flex min-h-8 items-center rounded-lg bg-muted px-2.5 text-sm tabular-nums text-fg">
                  {t("invoices.currencies.USD")}: {formatMoney(selected.currentDebtUsd, "USD")}
                </span>
                <span
                  className={`inline-flex min-h-8 items-center rounded-lg px-2.5 text-sm font-semibold ${
                    hasDebt
                      ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100"
                      : "bg-judi-100 text-judi-900 dark:bg-judi-950/60 dark:text-judi-100"
                  }`}
                >
                  {hasDebt ? t("collection.hasDebt") : t("collection.cleared")}
                </span>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5 text-start">
              <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                <CircleDollarSign
                  className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
                  aria-hidden
                />
                {t("invoices.currency")}
              </span>
              <select
                name="currency"
                value={currency}
                onChange={(event) => {
                  setCurrency(event.target.value as "IQD" | "USD");
                  setAmount("");
                }}
                className={fieldClass}
              >
                <option value="IQD">{t("invoices.currencies.IQD")}</option>
                <option value="USD">{t("invoices.currencies.USD")}</option>
              </select>
            </label>
            <label className="block space-y-1.5 text-start">
              <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
                <Banknote
                  className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
                  aria-hidden
                />
                {t("collection.amount")}
              </span>
              <AmountInput
                name="amount"
                value={amount}
                onValueChange={setAmount}
                fractionDigits={currency === "USD" ? 2 : 0}
                required
                disabled={!hasDebt || pending}
                placeholder={formatMoney(debt, currency)}
                className={`${fieldClass} tabular-nums`}
              />
              <span className="block text-xs text-fg-subtle">
                {t("collection.amountHint")}
              </span>
            </label>
          </div>

          <button
            type="button"
            disabled={!hasDebt || pending}
            onClick={() => setAmount(debt)}
            className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-muted px-4 text-sm font-medium text-fg hover:bg-surface disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t("collection.payAll")}
          </button>

          <label className="block space-y-1.5 text-start">
            <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <Wallet
                className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              {t("collection.paymentMethod")}
            </span>
            <select
              name="paymentMethod"
              defaultValue="CASH"
              className={fieldClass}
            >
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {t(`collection.methods.${method}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5 text-start">
            <span className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <NotebookPen
                className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              {t("collection.notes")}
            </span>
            <textarea
              name="notes"
              rows={2}
              maxLength={500}
              placeholder={t("collection.notesPlaceholder")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 py-2 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
            />
          </label>

          <div className="space-y-2 text-start">
            <p className="flex items-center gap-1.5 text-sm font-medium text-fg">
              <Camera
                className="size-3.5 shrink-0 text-judi-700 dark:text-judi-300"
                aria-hidden
              />
              {t("collection.proofPhotos")}
            </p>
            <p className="text-sm text-fg-muted">{t("collection.proofPhotosHint")}</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCameraOpen(true)}
                disabled={pending}
                className="btn btn-regular disabled:opacity-60"
              >
                <Camera className="size-4 text-judi-700 dark:text-judi-400" aria-hidden />
                {t("collection.addProofPhoto")}
                {proofPreviews.length > 0 ? (
                  <span className="tabular-nums text-fg-muted">
                    ({proofPreviews.length})
                  </span>
                ) : null}
              </button>
              {proofPreviews.map((item, index) => (
                <span key={item.url} className="inline-flex items-center gap-1">
                  <Thumb kind="stock" size="sm" src={item.url} alt="" />
                  <button
                    type="button"
                    onClick={() => removeProof(index)}
                    className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
                    aria-label={t("collection.removeProofPhoto")}
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <p className="text-sm text-fg-muted text-start">
            {t("collection.outstanding")}:{" "}
            <strong className="tabular-nums text-fg" dir="ltr">
              {formatMoney(debt, currency)}
            </strong>
          </p>
        </div>

          <div className={stickyClass}>
            <button
              type="submit"
              disabled={!hasDebt || !amount || pending}
              className="btn btn-success w-full text-base"
            >
              {pending ? t("collection.saving") : t("collection.submit")}
            </button>
          </div>
        </form>
      ) : null}

      <CameraCapture
        open={cameraOpen}
        kind="STOCK"
        onClose={() => setCameraOpen(false)}
        onCaptured={(blob) => {
          addProof(blob);
          setCameraOpen(false);
        }}
      />
    </div>
  );
}
