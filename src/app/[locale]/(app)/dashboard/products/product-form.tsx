"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Barcode,
  CalendarClock,
  FolderOpen,
  Languages,
  Package,
  Plus,
  Printer,
  Save,
  Sparkles,
  Tags,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AmountInput } from "@/components/amount-input";
import { generateEan13FromSku, generateSkuFromName } from "@/lib/barcode";
import { parseFormattedNumber } from "@/lib/money";
import { assertValidUnitSet } from "@/lib/uom";
import {
  matchUnitPreset,
  unitFromPreset,
  UNIT_PRESETS,
  type ProductFormValues,
  type ProductPriceCurrencyMode,
  type ProductUnitFormValue,
  type UnitPresetKey,
} from "@/lib/product-form-values";
import { createProductAction, updateProductAction } from "./actions";
import {
  printBarcodeLabel,
  ProductBarcodeLabel,
} from "./product-barcode-label";
import { ProductMediaPanel } from "@/components/product-media-panel";

export type CategoryOption = {
  id: string;
  name: string;
  subcategories: { id: string; name: string }[];
};

export type ProductFormMedia = {
  productId: string;
  productName: string;
  initialPrimaryUrl?: string | null;
  defaultOpen?: boolean;
  scrollOnOpen?: boolean;
};

const controlClass =
  "min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface disabled:cursor-not-allowed disabled:opacity-60";

export function ProductForm({
  values: initial,
  canManage,
  categories,
  media,
}: {
  values: ProductFormValues;
  canManage: boolean;
  categories: CategoryOption[];
  /** When set (edit page), photos sit in the same sidebar as the barcode label. */
  media?: ProductFormMedia;
}) {
  const t = useTranslations();
  const [sku, setSku] = useState(initial.sku);
  const [barcode, setBarcode] = useState(initial.barcode);
  const [nameEn, setNameEn] = useState(initial.nameEn);
  const [nameAr, setNameAr] = useState(initial.nameAr);
  const [nameCkb, setNameCkb] = useState(initial.nameCkb);
  const [categoryId, setCategoryId] = useState(
    initial.categoryId || categories[0]?.id || "",
  );
  const [subcategoryId, setSubcategoryId] = useState(initial.subcategoryId);
  const [priceCurrency, setPriceCurrency] = useState<ProductPriceCurrencyMode>(
    initial.priceCurrency,
  );
  const [shelfLifeDays, setShelfLifeDays] = useState(initial.shelfLifeDays);
  const [units, setUnits] = useState(initial.units);
  const [addPreset, setAddPreset] = useState<UnitPresetKey | "">("");
  const [labelPreviewKey, setLabelPreviewKey] = useState(() =>
    initial.units.length > 0 ? "unit-0" : "product",
  );
  const isEdit = Boolean(initial.id);
  const skuTouched = useMemo(() => Boolean(initial.sku), [initial.sku]);
  const [skuManual, setSkuManual] = useState(skuTouched);

  const showIqd = priceCurrency === "IQD" || priceCurrency === "BOTH";
  const showUsd = priceCurrency === "USD" || priceCurrency === "BOTH";
  const hasAnyName = Boolean(
    nameEn.trim() || nameAr.trim() || nameCkb.trim(),
  );
  const displayName =
    nameEn.trim() || nameAr.trim() || nameCkb.trim() || "";

  function applySkuFromNames(
    nextEn: string,
    nextAr: string,
    nextCkb: string,
    force = false,
  ) {
    if (!canManage) return;
    if (!force && (isEdit || skuManual)) return;
    const source = nextEn.trim() || nextAr.trim() || nextCkb.trim();
    if (!source) return;
    setSku(generateSkuFromName(source));
  }

  function onNameEnChange(value: string) {
    setNameEn(value);
    applySkuFromNames(value, nameAr, nameCkb);
  }

  function onNameArChange(value: string) {
    setNameAr(value);
    applySkuFromNames(nameEn, value, nameCkb);
  }

  function onNameCkbChange(value: string) {
    setNameCkb(value);
    applySkuFromNames(nameEn, nameAr, value);
  }

  function generateSku() {
    applySkuFromNames(nameEn, nameAr, nameCkb, true);
  }

  const subs = useMemo(
    () => categories.find((item) => item.id === categoryId)?.subcategories ?? [],
    [categories, categoryId],
  );

  const unitDrafts = units.map((unit) => ({
    isBaseUnit: unit.isBaseUnit,
    conversionRatio: unit.conversionRatio || "0",
  }));

  const unitError = useMemo(() => {
    try {
      assertValidUnitSet(unitDrafts);
      return null;
    } catch {
      return t("products.unitsInvalid");
    }
  }, [t, unitDrafts]);

  const usedPresets = useMemo(() => {
    const used = new Set<UnitPresetKey>();
    for (const unit of units) {
      const key = matchUnitPreset(unit);
      if (key) used.add(key);
    }
    return used;
  }, [units]);

  const availablePresets = (
    Object.keys(UNIT_PRESETS) as UnitPresetKey[]
  ).filter((key) => !usedPresets.has(key));

  const unitLabels = units.map((unit) => {
    const preset = matchUnitPreset(unit);
    return preset
      ? t(`products.preset.${preset}`)
      : unit.nameEn || t("products.customUnit");
  });

  const labelOptions = [
    {
      key: "product",
      label: t("products.barcodeDefault"),
      barcode: barcode,
    },
    ...units.map((unit, index) => ({
      key: `unit-${index}`,
      label: unitLabels[index] ?? t("products.customUnit"),
      barcode: unit.barcode,
    })),
  ];

  const selectedLabel =
    labelOptions.find((option) => option.key === labelPreviewKey) ??
    labelOptions[0];
  const selectedUnitIndex =
    selectedLabel?.key.startsWith("unit-")
      ? Number(selectedLabel.key.slice(5))
      : null;

  function focusUnitPreview(index: number) {
    setLabelPreviewKey(`unit-${index}`);
  }

  function onLabelBarcodeChange(value: string) {
    if (selectedUnitIndex !== null && !Number.isNaN(selectedUnitIndex)) {
      updateUnit(selectedUnitIndex, { barcode: value });
      return;
    }
    setBarcode(value);
  }

  function updateUnit(index: number, patch: Partial<ProductUnitFormValue>) {
    setUnits((current) =>
      current.map((unit, i) => {
        if (i !== index) {
          return patch.isBaseUnit ? { ...unit, isBaseUnit: false } : unit;
        }
        const next = { ...unit, ...patch };
        if (patch.isBaseUnit) {
          next.conversionRatio = "1";
          next.isBaseUnit = true;
        }
        return next;
      }),
    );
  }

  function addUnitFromPreset() {
    if (!addPreset) return;
    setUnits((current) => [
      ...current,
      unitFromPreset(addPreset, { isBaseUnit: false }),
    ]);
    setAddPreset("");
  }

  function removeUnit(index: number) {
    setUnits((current) => current.filter((_, i) => i !== index));
  }

  const canSubmit =
    canManage &&
    !unitError &&
    categories.length > 0 &&
    hasAnyName;

  return (
    <form
      action={isEdit ? updateProductAction : createProductAction}
      className="space-y-2.5 pb-2"
    >
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input
        type="hidden"
        name="unitsJson"
        value={JSON.stringify(
          units.map((unit) => ({
            id: unit.id ?? "",
            barcode: unit.barcode,
            nameEn: unit.nameEn,
            nameAr: unit.nameAr,
            nameCkb: unit.nameCkb,
            conversionRatio: Number(parseFormattedNumber(unit.conversionRatio) || 0),
            sellingPrice: Number(
              parseFormattedNumber(showIqd ? unit.sellingPrice || "0" : "0") || 0,
            ),
            sellingPriceUsd: Number(
              parseFormattedNumber(showUsd ? unit.sellingPriceUsd || "0" : "0") || 0,
            ),
            isBaseUnit: unit.isBaseUnit,
          })),
        )}
      />
      <input type="hidden" name="baseCost" value="0" />

      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(200px,240px)]">
        <section className="surface-panel space-y-3 p-2.5 sm:p-3">
          <div className="grid gap-2 md:grid-cols-3">
            <Field
              icon={Languages}
              label={t("products.nameEn")}
              name="nameEn"
              value={nameEn}
              disabled={!canManage}
              onChange={onNameEnChange}
            />
            <Field
              icon={Languages}
              label={t("products.nameAr")}
              name="nameAr"
              value={nameAr}
              disabled={!canManage}
              onChange={onNameArChange}
            />
            <Field
              icon={Languages}
              label={t("products.nameCkb")}
              name="nameCkb"
              value={nameCkb}
              disabled={!canManage}
              onChange={onNameCkbChange}
            />
          </div>
          {!hasAnyName ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 text-start dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {t("products.namesRequired")}
            </p>
          ) : null}

          <div className="grid gap-2 border-t border-line pt-3 md:grid-cols-2">
            <div className="space-y-1 text-start md:col-span-2">
              <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
                <Package
                  className="size-3.5 text-judi-700 dark:text-judi-300"
                  aria-hidden
                />
                {t("products.sku")}
              </span>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  name="sku"
                  required
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  data-1p-ignore
                  data-lpignore="true"
                  disabled={!canManage}
                  value={sku}
                  onChange={(event) => {
                    setSkuManual(true);
                    setSku(event.target.value);
                  }}
                  className={`${controlClass} min-w-0 flex-1 font-mono tabular-nums`}
                />
                {canManage ? (
                  <button
                    type="button"
                    onClick={generateSku}
                    className="inline-flex min-h-touch shrink-0 items-center justify-center gap-1.5 rounded-xl border border-judi-300 bg-judi-50 px-3 text-sm font-medium text-judi-900 hover:bg-judi-100 dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100 dark:hover:bg-judi-900/60"
                  >
                    <Sparkles className="size-3.5 shrink-0" aria-hidden />
                    {t("products.generateSku")}
                  </button>
                ) : null}
              </div>
            </div>
            <Field
              icon={Barcode}
              label={t("products.barcodeDefault")}
              name="barcode"
              value={barcode}
              disabled={!canManage}
              onChange={setBarcode}
              hint={t("products.barcodeDefaultHint")}
            />
            <SelectField
              icon={Tags}
              label={t("products.priceCurrency")}
              name="priceCurrency"
              disabled={!canManage}
              value={priceCurrency}
              onChange={(value) =>
                setPriceCurrency(value as ProductPriceCurrencyMode)
              }
            >
              <option value="IQD">{t("products.priceCurrencyIqd")}</option>
              <option value="USD">{t("products.priceCurrencyUsd")}</option>
              <option value="BOTH">{t("products.priceCurrencyBoth")}</option>
            </SelectField>
            <Field
              icon={CalendarClock}
              label={t("products.shelfLifeDays")}
              name="shelfLifeDays"
              value={shelfLifeDays}
              disabled={!canManage}
              onChange={setShelfLifeDays}
              hint={t("products.shelfLifeDaysHint")}
            />
            <SelectField
              icon={FolderOpen}
              label={t("products.category")}
              name="categoryId"
              required
              disabled={!canManage || categories.length === 0}
              value={categoryId}
              onChange={(value) => {
                setCategoryId(value);
                setSubcategoryId("");
              }}
            >
              {categories.length === 0 ? (
                <option value="">{t("products.noCategories")}</option>
              ) : null}
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectField>
            <SelectField
              icon={Tags}
              label={t("products.subcategory")}
              name="subcategoryId"
              disabled={!canManage || subs.length === 0}
              value={subcategoryId}
              onChange={setSubcategoryId}
            >
              <option value="">{t("products.noSubcategory")}</option>
              {subs.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </SelectField>
          </div>

          {categories.length === 0 ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-900 text-start dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
              {t("products.createCategoryFirst")}{" "}
              <Link
                href="/dashboard/categories"
                className="font-semibold underline"
              >
                {t("products.manageCategories")}
              </Link>
            </p>
          ) : null}

          <div className="space-y-2 border-t border-line pt-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-fg text-start">
                <Package
                  className="size-3.5 text-judi-700 dark:text-judi-300"
                  aria-hidden
                />
                {t("products.units")}
              </h2>
              {canManage && availablePresets.length > 0 ? (
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <select
                    value={addPreset}
                    onChange={(event) =>
                      setAddPreset(event.target.value as UnitPresetKey | "")
                    }
                    className={controlClass}
                    aria-label={t("products.addUnitPreset")}
                  >
                    <option value="">{t("products.addUnitPreset")}</option>
                    {availablePresets.map((key) => (
                      <option key={key} value={key}>
                        {t(`products.preset.${key}`)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={!addPreset}
                    onClick={addUnitFromPreset}
                    className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted disabled:opacity-50"
                  >
                    <Plus className="size-3.5 shrink-0" aria-hidden />
                    {t("products.addUnit")}
                  </button>
                </div>
              ) : null}
            </div>

            {unitError ? (
              <p
                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-800 text-start dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
                role="alert"
              >
                {unitError}
              </p>
            ) : null}

            <ul className="money-cards-mobile space-y-2" role="list">
              {units.map((unit, index) => {
                const preset = matchUnitPreset(unit);
                const unitLabel = preset
                  ? t(`products.preset.${preset}`)
                  : unit.nameEn || t("products.customUnit");
                return (
                  <li
                    key={`${unit.id ?? "new"}-${index}`}
                    className="rounded-xl border border-line bg-muted/40 p-2.5"
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-fg text-start">
                        {unitLabel}
                      </p>
                      {canManage && units.length > 1 && !unit.isBaseUnit ? (
                        <button
                          type="button"
                          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                          aria-label={t("products.removeUnit")}
                          onClick={() => removeUnit(index)}
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block space-y-1 text-start">
                        <span className="text-xs font-medium text-fg-muted">
                          {t("products.conversionRatio")}
                        </span>
                        <input
                          type="number"
                          step="0.0001"
                          value={unit.conversionRatio}
                          disabled={!canManage || unit.isBaseUnit}
                          onChange={(event) =>
                            updateUnit(index, {
                              conversionRatio: event.target.value,
                            })
                          }
                          className={controlClass}
                        />
                      </label>
                      {showIqd ? (
                        <label className="block space-y-1 text-start">
                          <span className="text-xs font-medium text-fg-muted">
                            {t("products.sellingPrice")}
                          </span>
                          <AmountInput
                            value={unit.sellingPrice}
                            disabled={!canManage}
                            fractionDigits={0}
                            onValueChange={(raw) =>
                              updateUnit(index, { sellingPrice: raw })
                            }
                            className={controlClass}
                          />
                        </label>
                      ) : null}
                      {showUsd ? (
                        <label className="block space-y-1 text-start">
                          <span className="text-xs font-medium text-fg-muted">
                            {t("products.sellingPriceUsd")}
                          </span>
                          <AmountInput
                            value={unit.sellingPriceUsd}
                            disabled={!canManage}
                            fractionDigits={2}
                            onValueChange={(raw) =>
                              updateUnit(index, { sellingPriceUsd: raw })
                            }
                            className={controlClass}
                          />
                        </label>
                      ) : null}
                      <label className="col-span-2 block space-y-1 text-start">
                        <span className="text-xs font-medium text-fg-muted">
                          {t("products.unitBarcode")}
                        </span>
                        <div className="flex flex-wrap gap-2">
                          <input
                            value={unit.barcode}
                            disabled={!canManage}
                            onFocus={() => focusUnitPreview(index)}
                            onChange={(event) => {
                              focusUnitPreview(index);
                              updateUnit(index, { barcode: event.target.value });
                            }}
                            placeholder={t("products.unitBarcodeHint")}
                            className={`${controlClass} min-w-0 flex-1`}
                          />
                          {canManage ? (
                            <button
                              type="button"
                              onClick={() => {
                                focusUnitPreview(index);
                                updateUnit(index, {
                                  barcode: generateEan13FromSku(
                                    `${sku || displayName || "JUDI"}:${unitLabel}`,
                                  ),
                                });
                              }}
                              className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-xl border border-judi-300 bg-judi-50 px-3 text-sm font-medium text-judi-900 hover:bg-judi-100 dark:border-judi-700 dark:bg-judi-950/50 dark:text-judi-100 dark:hover:bg-judi-900/60"
                            >
                              <Sparkles className="size-3.5 shrink-0" aria-hidden />
                              {t("products.generateBarcode")}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            disabled={!unit.barcode.trim()}
                            onClick={() => {
                              focusUnitPreview(index);
                              printBarcodeLabel({
                                code: unit.barcode.trim(),
                                productName: displayName,
                                sku,
                                unitName: unitLabel,
                                titleFallback: t("products.labelNoName"),
                                printBlockedMessage: t("products.printBlocked"),
                              });
                            }}
                            className="inline-flex min-h-touch items-center justify-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-fg hover:bg-muted disabled:opacity-50"
                          >
                            <Printer className="size-3.5 shrink-0" aria-hidden />
                            {t("products.printLabel")}
                          </button>
                        </div>
                      </label>
                      <label className="col-span-2 inline-flex min-h-touch items-center gap-2 text-sm text-fg">
                        <input
                          type="radio"
                          name="baseUnitMobile"
                          checked={unit.isBaseUnit}
                          disabled={!canManage}
                          onChange={() =>
                            updateUnit(index, { isBaseUnit: true })
                          }
                          className="size-4 accent-judi-700"
                        />
                        {t("products.baseUnit")}
                      </label>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto rounded-xl border border-line md:block">
              <table className="w-full min-w-[720px] table-fixed border-collapse text-sm">
                <thead className="bg-muted/50 text-fg-muted">
                  <tr>
                    <th className="px-2 py-2 text-start font-medium">
                      {t("products.unit")}
                    </th>
                    <th className="px-2 py-2 text-start font-medium">
                      {t("products.unitBarcode")}
                    </th>
                    <th className="px-2 py-2 text-start font-medium">
                      {t("products.conversionRatio")}
                    </th>
                    {showIqd ? (
                      <th className="px-2 py-2 text-start font-medium">
                        {t("products.sellingPrice")}
                      </th>
                    ) : null}
                    {showUsd ? (
                      <th className="px-2 py-2 text-start font-medium">
                        {t("products.sellingPriceUsd")}
                      </th>
                    ) : null}
                    <th className="px-2 py-2 text-center font-medium">
                      {t("products.baseUnit")}
                    </th>
                    <th className="px-2 py-2 text-center font-medium">
                      <span className="sr-only">{t("products.removeUnit")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((unit, index) => {
                    const preset = matchUnitPreset(unit);
                    const unitLabel = preset
                      ? t(`products.preset.${preset}`)
                      : unit.nameEn || t("products.customUnit");
                    return (
                      <tr
                        key={`${unit.id ?? "new"}-desk-${index}`}
                        className="border-t border-line"
                      >
                        <td className="px-2 py-1.5 text-start font-medium text-fg">
                          {unitLabel}
                        </td>
                        <td className="px-2 py-1.5 text-start">
                          <div className="flex min-w-[200px] items-center gap-1">
                            <input
                              value={unit.barcode}
                              disabled={!canManage}
                              onFocus={() => focusUnitPreview(index)}
                              onChange={(event) => {
                                focusUnitPreview(index);
                                updateUnit(index, {
                                  barcode: event.target.value,
                                });
                              }}
                              placeholder={t("products.unitBarcodeHint")}
                              className="min-h-touch w-full min-w-0 rounded-lg border border-line-strong bg-muted px-2 text-start text-fg disabled:opacity-60"
                            />
                            {canManage ? (
                              <button
                                type="button"
                                onClick={() => {
                                  focusUnitPreview(index);
                                  updateUnit(index, {
                                    barcode: generateEan13FromSku(
                                      `${sku || displayName || "JUDI"}:${unitLabel}`,
                                    ),
                                  });
                                }}
                                className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-judi-800 hover:bg-judi-50 dark:text-judi-200 dark:hover:bg-judi-950/40"
                                aria-label={t("products.generateBarcode")}
                              >
                                <Sparkles className="size-4" aria-hidden />
                              </button>
                            ) : null}
                            <button
                              type="button"
                              disabled={!unit.barcode.trim()}
                              onClick={() => {
                                focusUnitPreview(index);
                                printBarcodeLabel({
                                  code: unit.barcode.trim(),
                                  productName: displayName,
                                  sku,
                                  unitName: unitLabel,
                                  titleFallback: t("products.labelNoName"),
                                  printBlockedMessage: t("products.printBlocked"),
                                });
                              }}
                              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg text-fg hover:bg-muted disabled:opacity-40"
                              aria-label={t("products.printLabel")}
                            >
                              <Printer className="size-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-start">
                          <input
                            type="number"
                            step="0.0001"
                            value={unit.conversionRatio}
                            disabled={!canManage || unit.isBaseUnit}
                            onChange={(event) =>
                              updateUnit(index, {
                                conversionRatio: event.target.value,
                              })
                            }
                            className="min-h-touch w-full min-w-0 rounded-lg border border-line-strong bg-muted px-2 text-start text-fg disabled:opacity-60"
                          />
                        </td>
                        {showIqd ? (
                          <td className="px-2 py-1.5 text-start">
                            <AmountInput
                              value={unit.sellingPrice}
                              disabled={!canManage}
                              fractionDigits={0}
                              onValueChange={(raw) =>
                                updateUnit(index, { sellingPrice: raw })
                              }
                              className="min-h-touch w-full min-w-0 rounded-lg border border-line-strong bg-muted px-2 text-start text-fg tabular-nums disabled:opacity-60"
                            />
                          </td>
                        ) : null}
                        {showUsd ? (
                          <td className="px-2 py-1.5 text-start">
                            <AmountInput
                              value={unit.sellingPriceUsd}
                              disabled={!canManage}
                              fractionDigits={2}
                              onValueChange={(raw) =>
                                updateUnit(index, { sellingPriceUsd: raw })
                              }
                              className="min-h-touch w-full min-w-0 rounded-lg border border-line-strong bg-muted px-2 text-start text-fg tabular-nums disabled:opacity-60"
                            />
                          </td>
                        ) : null}
                        <td className="px-2 py-1.5 text-center align-middle">
                          <input
                            type="radio"
                            name="baseUnit"
                            checked={unit.isBaseUnit}
                            disabled={!canManage}
                            onChange={() =>
                              updateUnit(index, { isBaseUnit: true })
                            }
                            className="size-4 accent-judi-700"
                            aria-label={t("products.baseUnit")}
                          />
                        </td>
                        <td className="px-2 py-1.5 text-center align-middle">
                          {canManage && units.length > 1 && !unit.isBaseUnit ? (
                            <button
                              type="button"
                              className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                              aria-label={t("products.removeUnit")}
                              onClick={() => removeUnit(index)}
                            >
                              <Trash2 className="size-4" aria-hidden />
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <ProductBarcodeLabel
          value={selectedLabel?.barcode ?? barcode}
          sku={sku}
          productName={displayName}
          unitName={
            selectedUnitIndex !== null && !Number.isNaN(selectedUnitIndex)
              ? unitLabels[selectedUnitIndex]
              : undefined
          }
          generateSeed={
            selectedUnitIndex !== null && !Number.isNaN(selectedUnitIndex)
              ? `${sku || displayName || "JUDI"}:${unitLabels[selectedUnitIndex]}`
              : sku || displayName || "JUDI"
          }
          canManage={canManage}
          onBarcodeChange={onLabelBarcodeChange}
          options={labelOptions}
          selectedKey={selectedLabel?.key ?? "product"}
          onSelectOption={setLabelPreviewKey}
          top={
            media ? (
              <ProductMediaPanel
                productId={media.productId}
                productName={media.productName}
                initialPrimaryUrl={media.initialPrimaryUrl}
                canEdit={canManage}
                defaultOpen={media.defaultOpen}
                scrollOnOpen={media.scrollOnOpen}
                compact
                embedded
              />
            ) : null
          }
        />
      </div>

      <div className="sticky-form-actions flex flex-wrap gap-2 no-print">
        {canManage ? (
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn btn-important flex-1 sm:flex-none"
          >
            <Save className="size-4 shrink-0" aria-hidden />
            {isEdit ? t("products.update") : t("products.save")}
          </button>
        ) : null}
        <Link
          href="/dashboard/products"
          className="inline-flex min-h-touch items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t("common.cancel")}
        </Link>
      </div>
    </form>
  );
}

function Field({
  icon: Icon,
  label,
  name,
  value,
  disabled,
  onChange,
  hint,
}: {
  icon: typeof Package;
  label: string;
  name?: string;
  value?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
  hint?: string;
}) {
  return (
    <label className="block space-y-1 text-start">
      <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
        <Icon
          className="size-3.5 text-judi-700 dark:text-judi-300"
          aria-hidden
        />
        {label}
      </span>
      <input
        name={name}
        disabled={disabled}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        className={controlClass}
      />
      {hint ? <span className="text-[11px] text-fg-muted">{hint}</span> : null}
    </label>
  );
}

function SelectField({
  icon: Icon,
  label,
  name,
  value,
  disabled,
  required,
  onChange,
  children,
}: {
  icon: typeof Package;
  label: string;
  name: string;
  value: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-1 text-start">
      <span className="flex items-center gap-1.5 text-xs font-medium text-fg">
        <Icon
          className="size-3.5 text-judi-700 dark:text-judi-300"
          aria-hidden
        />
        {label}
      </span>
      <select
        name={name}
        required={required}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={controlClass}
      >
        {children}
      </select>
    </label>
  );
}
