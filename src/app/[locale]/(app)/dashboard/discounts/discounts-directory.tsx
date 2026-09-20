"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import {
  BadgePercent,
  Pause,
  Play,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DISCOUNT_RULE_KINDS,
  DISCOUNT_SCOPES,
  DISCOUNT_VALUE_TYPES,
  STORE_TIERS,
} from "@/lib/constants";
import type { DiscountRuleSnapshot } from "@/lib/discount-engine";
import {
  createDiscountRuleAction,
  deleteDiscountRuleAction,
  toggleDiscountRuleAction,
  updateDiscountRuleAction,
} from "./actions";

export type DiscountRuleRow = DiscountRuleSnapshot & {
  startsAtLocal: string;
  endsAtLocal: string;
};

type CatalogProduct = { id: string; sku: string; name: string; categoryId: string };
type CatalogCategory = { id: string; name: string };

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; id: string };

type KindFilter = "all" | (typeof DISCOUNT_RULE_KINDS)[number];
type ActiveFilter = "all" | "active" | "paused";

const searchClass =
  "h-10 min-h-10 w-full rounded-lg border border-line-strong bg-muted ps-9 pe-3 text-sm text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface";

function chipClass(active: boolean) {
  return `chip chip-sm ${active ? "chip-on" : "chip-off"}`;
}

export function DiscountsDirectory({
  rules,
  products,
  categories,
  canManage,
}: {
  rules: DiscountRuleRow[];
  products: CatalogProduct[];
  categories: CatalogCategory[];
  canManage: boolean;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>({ mode: "closed" });
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const titleId = useId();

  const editing =
    panel.mode === "edit" ? rules.find((item) => item.id === panel.id) ?? null : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (kindFilter !== "all" && rule.kind !== kindFilter) return false;
      if (activeFilter === "active" && !rule.active) return false;
      if (activeFilter === "paused" && rule.active) return false;
      if (!q) return true;
      return (
        rule.name.toLowerCase().includes(q) ||
        rule.kind.toLowerCase().includes(q) ||
        rule.amount.toLowerCase().includes(q)
      );
    });
  }, [activeFilter, kindFilter, query, rules]);

  useEffect(() => {
    if (panel.mode === "closed") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.mode]);

  useEffect(() => {
    if (panel.mode === "edit" && !editing) setPanel({ mode: "closed" });
  }, [editing, panel.mode]);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-fg-muted text-start sm:text-sm">
          {filtered.length === rules.length
            ? t("discounts.listHint", { count: rules.length })
            : t("discounts.matchedHint", {
                matched: filtered.length,
                total: rules.length,
              })}
        </p>
        {canManage ? (
          <button
            type="button"
            onClick={() => setPanel({ mode: "create" })}
            className="btn btn-important btn-sm"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            {t("discounts.create")}
          </button>
        ) : null}
      </div>

      <section
        aria-labelledby="discounts-filters-heading"
        className="surface-panel space-y-2 p-2.5"
      >
        <h2 id="discounts-filters-heading" className="sr-only">
          {t("discounts.filtersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("discounts.search")}</span>
          <Search
            className="pointer-events-none absolute start-2.5 top-1/2 size-3.5 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("discounts.searchPlaceholder")}
            className={searchClass}
          />
        </label>

        <div
          className="chip-scroll"
          role="group"
          aria-label={t("discounts.filterKind")}
        >
          <button
            type="button"
            className={chipClass(kindFilter === "all")}
            onClick={() => setKindFilter("all")}
          >
            {t("discounts.filterAll")}
          </button>
          {DISCOUNT_RULE_KINDS.map((kind) => (
            <button
              key={kind}
              type="button"
              className={chipClass(kindFilter === kind)}
              onClick={() => setKindFilter(kind)}
            >
              {t(`discounts.kinds.${kind}`)}
            </button>
          ))}
        </div>

        <div
          className="chip-scroll"
          role="group"
          aria-label={t("discounts.filterStatus")}
        >
          {(
            [
              ["all", "filterAll"],
              ["active", "filterActive"],
              ["paused", "filterPaused"],
            ] as const
          ).map(([value, key]) => (
            <button
              key={value}
              type="button"
              className={chipClass(activeFilter === value)}
              onClick={() => setActiveFilter(value)}
            >
              {t(`discounts.${key}`)}
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="surface-panel px-4 py-8 text-center">
          <BadgePercent className="mx-auto size-7 text-judi-700 dark:text-judi-300" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-fg">
            {rules.length === 0 ? t("discounts.empty") : t("discounts.noMatches")}
          </p>
          <p className="mt-1 text-xs text-fg-muted">
            {rules.length === 0 ? t("discounts.emptyHint") : t("discounts.noMatchesHint")}
          </p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {filtered.map((rule) => (
            <li key={rule.id} className="surface-panel p-2.5 sm:p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <button
                  type="button"
                  className="min-w-0 flex-1 text-start"
                  onClick={() => canManage && setPanel({ mode: "edit", id: rule.id })}
                  disabled={!canManage}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-sm font-semibold text-fg">{rule.name}</span>
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                        rule.active
                          ? "bg-judi-100 text-judi-900 dark:bg-judi-950/50 dark:text-judi-100"
                          : "bg-muted text-fg-muted"
                      }`}
                    >
                      {rule.active ? t("discounts.active") : t("discounts.pausedLabel")}
                    </span>
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] text-fg-muted">
                      {t(`discounts.kinds.${rule.kind}`)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-fg-muted">
                    {t("discounts.amountLabel")}: {rule.amount}
                    {rule.kind === "PERCENT" ||
                    rule.kind === "TIER_PRICE" ||
                    (rule.kind === "SPECIAL" && rule.valueType === "PERCENT")
                      ? "%"
                      : rule.kind === "GIFT"
                        ? ` ${t("discounts.giftUnits")}`
                        : rule.currency
                          ? ` ${rule.currency}`
                          : ""}
                    {" · "}
                    {t("discounts.priority")}: {rule.priority}
                    {rule.storeTiers.length > 0
                      ? ` · ${rule.storeTiers.map((tier) => t(`storeTiers.${tier}`)).join(", ")}`
                      : ` · ${t("discounts.allTiers")}`}
                  </p>
                  {(rule.startsAtLocal || rule.endsAtLocal) && (
                    <p className="mt-0.5 text-[11px] text-fg-subtle">
                      {t("discounts.window")}: {rule.startsAtLocal || "…"} →{" "}
                      {rule.endsAtLocal || "…"} ({t("discounts.baghdadTz")})
                    </p>
                  )}
                </button>

                {canManage ? (
                  <div className="flex flex-wrap gap-1.5">
                    <form action={toggleDiscountRuleAction}>
                      <input type="hidden" name="id" value={rule.id} />
                      <input
                        type="hidden"
                        name="active"
                        value={rule.active ? "false" : "true"}
                      />
                      <button
                        type="submit"
                        className="inline-flex h-10 min-h-10 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg hover:bg-muted"
                      >
                        {rule.active ? (
                          <Pause className="size-3.5" aria-hidden />
                        ) : (
                          <Play className="size-3.5" aria-hidden />
                        )}
                        {rule.active ? t("discounts.pause") : t("discounts.activate")}
                      </button>
                    </form>
                    <button
                      type="button"
                      onClick={() => setPanel({ mode: "edit", id: rule.id })}
                      className="inline-flex h-10 min-h-10 items-center rounded-lg border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg hover:bg-muted"
                    >
                      {t("discounts.edit")}
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {panel.mode !== "closed" ? (
        <RuleDrawer
          titleId={titleId}
          title={
            panel.mode === "create" ? t("discounts.create") : t("discounts.edit")
          }
          onClose={() => setPanel({ mode: "closed" })}
        >
          <RuleForm
            key={panel.mode === "edit" ? panel.id : "create"}
            mode={panel.mode}
            rule={editing}
            products={products}
            categories={categories}
            onCancel={() => setPanel({ mode: "closed" })}
          />
        </RuleDrawer>
      ) : null}
    </div>
  );
}

function RuleDrawer({
  titleId,
  title,
  onClose,
  children,
}: {
  titleId: string;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" role="presentation">
      <button type="button" className="h-full flex-1 cursor-default" aria-label="Close" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex h-full w-full max-w-lg flex-col border-s border-line bg-surface shadow-xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-fg text-start">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-line-strong text-fg hover:bg-muted"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </div>
  );
}

function RuleForm({
  mode,
  rule,
  products,
  categories,
  onCancel,
}: {
  mode: "create" | "edit";
  rule: DiscountRuleRow | null;
  products: CatalogProduct[];
  categories: CatalogCategory[];
  onCancel: () => void;
}) {
  const t = useTranslations();
  const [kind, setKind] = useState(rule?.kind ?? "PERCENT");
  const [scope, setScope] = useState(rule?.scope ?? "INVOICE");
  const [valueType, setValueType] = useState(rule?.valueType ?? "PERCENT");
  const [active, setActive] = useState(rule?.active ?? true);
  const [storeTiers, setStoreTiers] = useState<string[]>(rule?.storeTiers ?? []);
  const [productIds, setProductIds] = useState<string[]>(rule?.productIds ?? []);
  const [categoryIds, setCategoryIds] = useState<string[]>(rule?.categoryIds ?? []);
  const [productQuery, setProductQuery] = useState("");

  const action = mode === "create" ? createDiscountRuleAction : updateDiscountRuleAction;
  const showScope = kind === "MONEY" || kind === "PERCENT" || kind === "SPECIAL";
  const showValueType = kind === "SPECIAL";
  const showCurrency =
    kind === "MONEY" || (kind === "SPECIAL" && valueType === "MONEY");
  const showStack = kind === "SPECIAL";
  const showCatalog = kind === "GIFT" || kind === "TIER_PRICE" || scope === "LINE";

  const productMatches = useMemo(() => {
    const needle = productQuery.trim().toLowerCase();
    if (!needle) return products.slice(0, 40);
    return products
      .filter(
        (product) =>
          product.name.toLowerCase().includes(needle) ||
          product.sku.toLowerCase().includes(needle),
      )
      .slice(0, 40);
  }, [productQuery, products]);

  function toggleTier(tier: string) {
    setStoreTiers((current) =>
      current.includes(tier) ? current.filter((item) => item !== tier) : [...current, tier],
    );
  }

  function toggleProduct(id: string) {
    setProductIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function toggleCategory(id: string) {
    setCategoryIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" && rule ? <input type="hidden" name="id" value={rule.id} /> : null}
      {storeTiers.map((tier) => (
        <input key={tier} type="hidden" name="storeTiers" value={tier} />
      ))}
      {productIds.map((id) => (
        <input key={id} type="hidden" name="productIds" value={id} />
      ))}
      {categoryIds.map((id) => (
        <input key={id} type="hidden" name="categoryIds" value={id} />
      ))}

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("discounts.name")}</span>
        <input
          name="name"
          required
          defaultValue={rule?.name ?? ""}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
      </label>

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("discounts.kind")}</span>
        <select
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as typeof kind)}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        >
          {DISCOUNT_RULE_KINDS.map((item) => (
            <option key={item} value={item}>
              {t(`discounts.kinds.${item}`)}
            </option>
          ))}
        </select>
        <span className="text-xs text-fg-muted">{t(`discounts.kindHints.${kind}`)}</span>
      </label>

      {showScope ? (
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("discounts.scope")}</span>
          <select
            name="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value as typeof scope)}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
          >
            {DISCOUNT_SCOPES.map((item) => (
              <option key={item} value={item}>
                {t(`discounts.scopes.${item}`)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="scope" value="LINE" />
      )}

      {showValueType ? (
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("discounts.valueType")}</span>
          <select
            name="valueType"
            value={valueType}
            onChange={(event) => setValueType(event.target.value as typeof valueType)}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
          >
            {DISCOUNT_VALUE_TYPES.map((item) => (
              <option key={item} value={item}>
                {t(`discounts.valueTypes.${item}`)}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input
          type="hidden"
          name="valueType"
          value={kind === "MONEY" ? "MONEY" : "PERCENT"}
        />
      )}

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("discounts.amount")}</span>
        <input
          name="amount"
          required
          inputMode="decimal"
          defaultValue={rule?.amount ?? ""}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
        <span className="text-xs text-fg-muted">
          {kind === "GIFT"
            ? t("discounts.amountHintGift")
            : kind === "TIER_PRICE" || kind === "PERCENT"
              ? t("discounts.amountHintPercent")
              : t("discounts.amountHintMoney")}
        </span>
      </label>

      {showCurrency ? (
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("discounts.currency")}</span>
          <select
            name="currency"
            defaultValue={rule?.currency ?? "IQD"}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
          >
            <option value="IQD">IQD</option>
            <option value="USD">USD</option>
          </select>
        </label>
      ) : (
        <input type="hidden" name="currency" value="" />
      )}

      <fieldset className="space-y-2 text-start">
        <legend className="text-sm font-medium text-fg">{t("discounts.storeTiers")}</legend>
        <p className="text-xs text-fg-muted">{t("discounts.storeTiersHint")}</p>
        <div className="flex flex-wrap gap-2">
          {STORE_TIERS.map((tier) => (
            <button
              key={tier}
              type="button"
              className={chipClass(storeTiers.includes(tier))}
              onClick={() => toggleTier(tier)}
            >
              {t(`storeTiers.${tier}`)}
            </button>
          ))}
        </div>
      </fieldset>

      {showCatalog ? (
        <>
          <fieldset className="space-y-2 text-start">
            <legend className="text-sm font-medium text-fg">{t("discounts.categories")}</legend>
            <p className="text-xs text-fg-muted">{t("discounts.catalogHint")}</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {categories.map((category) => (
                <label
                  key={category.id}
                  className="flex min-h-touch items-center gap-2 rounded-lg px-2 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={categoryIds.includes(category.id)}
                    onChange={() => toggleCategory(category.id)}
                    className="size-4"
                  />
                  <span className="text-sm text-fg">{category.name}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2 text-start">
            <legend className="text-sm font-medium text-fg">{t("discounts.products")}</legend>
            <input
              type="search"
              value={productQuery}
              onChange={(event) => setProductQuery(event.target.value)}
              placeholder={t("discounts.productSearch")}
              className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
            />
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-line p-2">
              {productMatches.map((product) => (
                <label
                  key={product.id}
                  className="flex min-h-touch items-center gap-2 rounded-lg px-2 hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={productIds.includes(product.id)}
                    onChange={() => toggleProduct(product.id)}
                    className="size-4"
                  />
                  <span className="text-sm text-fg">
                    {product.sku} — {product.name}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("discounts.startsAt")}</span>
          <input
            type="datetime-local"
            name="startsAt"
            defaultValue={rule?.startsAtLocal ?? ""}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
          />
        </label>
        <label className="block space-y-1.5 text-start">
          <span className="text-sm font-medium text-fg">{t("discounts.endsAt")}</span>
          <input
            type="datetime-local"
            name="endsAt"
            defaultValue={rule?.endsAtLocal ?? ""}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
          />
        </label>
      </div>
      <p className="text-xs text-fg-muted text-start">{t("discounts.windowHint")}</p>

      <label className="block space-y-1.5 text-start">
        <span className="text-sm font-medium text-fg">{t("discounts.priority")}</span>
        <input
          type="number"
          name="priority"
          min={0}
          max={9999}
          defaultValue={rule?.priority ?? 100}
          className="min-h-touch w-full rounded-xl border border-line-strong bg-surface px-3 text-fg"
        />
        <span className="text-xs text-fg-muted">{t("discounts.priorityHint")}</span>
      </label>

      <input type="hidden" name="active" value={active ? "true" : "false"} />
      <label className="flex min-h-touch items-center gap-3 text-start">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
          className="size-5"
        />
        <span className="text-sm font-medium text-fg">{t("discounts.active")}</span>
      </label>

      {showStack ? (
        <label className="flex min-h-touch items-center gap-3 text-start">
          <input
            type="checkbox"
            name="stackWithGift"
            value="true"
            defaultChecked={rule?.stackWithGift ?? false}
            className="size-5"
          />
          <span className="text-sm font-medium text-fg">{t("discounts.stackWithGift")}</span>
        </label>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="submit"
          className="btn btn-important flex-1"
        >
          <Save className="size-4" aria-hidden />
          {mode === "create" ? t("discounts.save") : t("discounts.update")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex min-h-touch items-center justify-center rounded-xl border border-line-strong px-4 font-medium text-fg hover:bg-muted"
        >
          {t("common.cancel")}
        </button>
      </div>

      {mode === "edit" && rule ? (
        <button
          type="submit"
          formAction={deleteDiscountRuleAction}
          className="btn btn-danger-outline w-full"
        >
          <Trash2 className="size-4" aria-hidden />
          {t("discounts.delete")}
        </button>
      ) : null}
    </form>
  );
}
