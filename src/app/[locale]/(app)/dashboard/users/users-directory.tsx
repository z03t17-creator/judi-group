"use client";

import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@prisma/client";
import {
  BadgePercent,
  ChevronRight,
  KeyRound,
  LayoutGrid,
  List,
  Mail,
  Phone,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  Truck,
  UserPlus,
  UserRound,
  Users,
  Warehouse,
  Wallet,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EmployeeMediaPanel } from "@/components/employee-media-panel";
import { EntityAvatar } from "@/components/thumb";
import { ROLES } from "@/lib/constants";
import {
  createUserAction,
  deleteUserAction,
  updateUserAction,
} from "./actions";

const ROLE_ICONS: Record<Role, LucideIcon> = {
  ADMIN: Shield,
  WAREHOUSE_ACCOUNTANT: Warehouse,
  FIELD_DELEGATE: Truck,
  COLLECTOR_ACCOUNTANT: Wallet,
};

export type UsersDirectoryUser = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: Role;
  maxDiscountAllowed: string;
  assignedWarehouseId: string | null;
  warehouseName: string | null;
  primaryMediaUrl: string | null;
};

export type UsersDirectoryWarehouse = {
  id: string;
  name: string;
};

type Panel =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; userId: string };

type ViewMode = "grid" | "list";
type RoleFilter = "all" | Role;

export function UsersDirectory({
  users,
  warehouses,
  focusUserId = null,
}: {
  users: UsersDirectoryUser[];
  warehouses: UsersDirectoryWarehouse[];
  /** Open edit + portrait gallery after create (`?focus=`). */
  focusUserId?: string | null;
}) {
  const t = useTranslations();
  const [panel, setPanel] = useState<Panel>(() =>
    focusUserId ? { mode: "edit", userId: focusUserId } : { mode: "closed" },
  );
  const [portraitByUserId, setPortraitByUserId] = useState<
    Record<string, string | null>
  >(() => Object.fromEntries(users.map((user) => [user.id, user.primaryMediaUrl])));
  const [focusPhotosUserId, setFocusPhotosUserId] = useState<string | null>(
    focusUserId,
  );
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const titleId = useId();

  const editingUser =
    panel.mode === "edit"
      ? users.find((user) => user.id === panel.userId) ?? null
      : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((user) => {
      if (roleFilter !== "all" && user.role !== roleFilter) return false;
      if (!q) return true;
      return (
        user.fullName.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone?.toLowerCase().includes(q) ?? false) ||
        (user.warehouseName?.toLowerCase().includes(q) ?? false) ||
        t(`roles.${user.role}`).toLowerCase().includes(q)
      );
    });
  }, [query, roleFilter, t, users]);

  useEffect(() => {
    setPortraitByUserId((prev) => {
      const next = { ...prev };
      for (const user of users) {
        if (!(user.id in next)) next[user.id] = user.primaryMediaUrl;
      }
      return next;
    });
  }, [users]);

  useEffect(() => {
    if (!focusUserId) return;
    setPanel({ mode: "edit", userId: focusUserId });
    setFocusPhotosUserId(focusUserId);
  }, [focusUserId]);

  useEffect(() => {
    if (panel.mode === "closed") return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel({ mode: "closed" });
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [panel.mode]);

  useEffect(() => {
    if (panel.mode === "edit" && !editingUser) {
      setPanel({ mode: "closed" });
    }
  }, [editingUser, panel.mode]);

  function openEdit(userId: string) {
    setFocusPhotosUserId(null);
    setPanel({ mode: "edit", userId });
  }

  function portraitUrl(user: UsersDirectoryUser) {
    return portraitByUserId[user.id] ?? user.primaryMediaUrl;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-fg-muted text-start">
          {filtered.length === users.length
            ? t("users.listHint", { count: users.length })
            : t("users.matchedHint", {
                matched: filtered.length,
                total: users.length,
              })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <ViewToggle view={view} onChange={setView} />
          <button
            type="button"
            onClick={() => setPanel({ mode: "create" })}
            className="btn btn-important"
          >
            <Plus className="size-4 shrink-0" aria-hidden />
            {t("users.create")}
          </button>
        </div>
      </div>

      <section
        aria-labelledby="users-filters-heading"
        className="surface-panel space-y-2.5 p-3"
      >
        <h2 id="users-filters-heading" className="sr-only">
          {t("users.filtersTitle")}
        </h2>
        <label className="relative block text-start">
          <span className="sr-only">{t("users.search")}</span>
          <Search
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-judi-700 dark:text-judi-300"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("users.searchPlaceholder")}
            className="min-h-touch w-full rounded-xl border border-line-strong bg-muted ps-9 pe-3 text-start text-fg placeholder:text-fg-subtle focus:border-judi-500 focus:bg-surface"
          />
        </label>

        <div
          role="group"
          aria-label={t("users.filterRole")}
          className="chip-scroll"
        >
          <RoleChip
            pressed={roleFilter === "all"}
            onClick={() => setRoleFilter("all")}
            label={t("users.allRoles")}
          />
          {ROLES.map((role) => {
            const Icon = ROLE_ICONS[role];
            return (
              <RoleChip
                key={role}
                pressed={roleFilter === role}
                onClick={() => setRoleFilter(role)}
                label={t(`roles.${role}`)}
                icon={Icon}
              />
            );
          })}
        </div>
      </section>

      {users.length === 0 ? (
        <EmptyState
          title={t("users.empty")}
          action={
            <button
              type="button"
              onClick={() => setPanel({ mode: "create" })}
              className="btn btn-important"
            >
              <Plus className="size-4 shrink-0" aria-hidden />
              {t("users.create")}
            </button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("users.noMatches")}
          hint={t("users.noMatchesHint")}
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setRoleFilter("all");
              }}
              className="inline-flex min-h-touch items-center rounded-xl border border-line-strong bg-surface px-4 font-medium text-fg hover:bg-muted"
            >
              {t("users.clearFilters")}
            </button>
          }
        />
      ) : view === "grid" ? (
        <ul
          className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          role="list"
        >
          {filtered.map((user) => (
            <li key={user.id}>
              <UserGridCard
                user={user}
                portraitUrl={portraitUrl(user)}
                onOpen={() => openEdit(user.id)}
              />
            </li>
          ))}
        </ul>
      ) : (
        <>
          <ul className="directory-cards" role="list">
            {filtered.map((user) => (
              <li key={user.id}>
                <UserListCard
                  user={user}
                  portraitUrl={portraitUrl(user)}
                  onOpen={() => openEdit(user.id)}
                />
              </li>
            ))}
          </ul>
          <div className="directory-table surface-panel">
            <table className="w-full min-w-0 text-start text-sm">
              <thead className="border-b border-line bg-muted/50 text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("users.fullName")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("auth.email")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell" scope="col">
                    {t("users.role")}
                  </th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell" scope="col">
                    {t("users.warehouse")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    {t("users.discount")}
                  </th>
                  <th className="px-4 py-3 font-medium" scope="col">
                    <span className="sr-only">{t("users.openProfile")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((user) => (
                  <UserTableRow
                    key={user.id}
                    user={user}
                    portraitUrl={portraitUrl(user)}
                    onOpen={() => openEdit(user.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {panel.mode !== "closed" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-stone-950/50 dark:bg-black/70"
            aria-label={t("users.dismissOverlay")}
            onClick={() => setPanel({ mode: "closed" })}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-line bg-surface shadow-xl sm:rounded-3xl"
          >
            <header className="flex items-start gap-3 border-b border-line px-4 py-4 text-start sm:px-5">
              <span className="icon-badge icon-badge-md tone-sky">
                {panel.mode === "create" ? (
                  <UserPlus className="size-5" aria-hidden />
                ) : (
                  <UserRound className="size-5" aria-hidden />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="font-semibold text-fg">
                  {panel.mode === "create"
                    ? t("users.create")
                    : t("users.profileTitle")}
                </h2>
                <p className="text-sm text-fg-subtle">
                  {panel.mode === "create"
                    ? t("users.createHint")
                    : editingUser?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPanel({ mode: "closed" })}
                className="inline-flex min-h-touch min-w-touch shrink-0 items-center justify-center rounded-xl text-fg-muted hover:bg-muted hover:text-fg"
                aria-label={t("users.closeProfile")}
              >
                <X className="size-5" aria-hidden />
              </button>
            </header>

            <div className="overflow-y-auto px-4 py-4 sm:px-5">
              {panel.mode === "create" ? (
                <CreateProfileForm warehouses={warehouses} />
              ) : editingUser ? (
                <EditProfileForm
                  user={editingUser}
                  warehouses={warehouses}
                  primaryMediaUrl={
                    portraitByUserId[editingUser.id] ?? editingUser.primaryMediaUrl
                  }
                  defaultOpenPhotos={focusPhotosUserId === editingUser.id}
                  onPrimaryUrlChange={(url) => {
                    setPortraitByUserId((prev) => ({
                      ...prev,
                      [editingUser.id]: url,
                    }));
                  }}
                />
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function ViewToggle({
  view,
  onChange,
}: {
  view: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const t = useTranslations();
  return (
    <div
      role="group"
      aria-label={t("users.viewMode")}
      className="inline-flex rounded-xl border border-line-strong bg-surface p-1"
    >
      <button
        type="button"
        aria-pressed={view === "grid"}
        aria-label={t("users.viewGrid")}
        onClick={() => onChange("grid")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 transition-colors ${
          view === "grid"
            ? "seg-on"
            : "text-fg-muted hover:bg-muted hover:text-fg"
        }`}
      >
        <LayoutGrid className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-pressed={view === "list"}
        aria-label={t("users.viewList")}
        onClick={() => onChange("list")}
        className={`inline-flex min-h-touch min-w-touch items-center justify-center rounded-lg px-3 transition-colors ${
          view === "list"
            ? "seg-on"
            : "text-fg-muted hover:bg-muted hover:text-fg"
        }`}
      >
        <List className="size-4" aria-hidden />
      </button>
    </div>
  );
}

function RoleChip({
  label,
  pressed,
  onClick,
  icon: Icon,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  icon?: LucideIcon;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`inline-flex min-h-touch shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors ${
        pressed
          ? "seg-on"
          : "border border-line-strong bg-muted text-fg hover:bg-surface"
      }`}
    >
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden /> : null}
      {label}
    </button>
  );
}

function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-muted/40 px-4 py-10 text-center">
      <span className="inline-flex size-14 items-center justify-center rounded-2xl bg-muted text-judi-800 dark:text-judi-200">
        <Users className="size-7" aria-hidden />
      </span>
      <p className="max-w-sm text-sm font-medium text-fg">{title}</p>
      {hint ? <p className="max-w-sm text-sm text-fg-muted">{hint}</p> : null}
      {action}
    </div>
  );
}

function UserMeta({ user }: { user: UsersDirectoryUser }) {
  const t = useTranslations();
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-fg-subtle">
      <span className="truncate">{user.email}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span>{t(`roles.${user.role}`)}</span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span className="truncate">
        {user.warehouseName ?? t("users.unassigned")}
      </span>
      <span aria-hidden className="text-line-strong">
        ·
      </span>
      <span className="inline-flex items-center gap-1 tabular-nums">
        <BadgePercent className="size-3.5" aria-hidden />
        {user.maxDiscountAllowed}%
      </span>
    </span>
  );
}

function UserGridCard({
  user,
  portraitUrl,
  onOpen,
}: {
  user: UsersDirectoryUser;
  portraitUrl: string | null;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const RoleIcon = ROLE_ICONS[user.role];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-touch w-full items-center gap-2.5 rounded-2xl border border-line bg-surface px-2.5 py-2 text-start shadow-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
    >
      <EntityAvatar
        icon={RoleIcon}
        size="sm"
        src={portraitUrl}
        alt={user.fullName}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">
          {user.fullName}
        </span>
        <span className="mt-0.5 block truncate text-xs font-medium text-judi-800 dark:text-judi-200">
          {t(`roles.${user.role}`)}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-fg-subtle">
          <span className="truncate">
            {user.warehouseName ?? t("users.unassigned")}
          </span>
          <span aria-hidden className="text-line-strong">
            ·
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 tabular-nums text-fg-muted">
            <BadgePercent className="size-3" aria-hidden />
            {user.maxDiscountAllowed}%
          </span>
        </span>
      </span>
    </button>
  );
}

function UserListCard({
  user,
  portraitUrl,
  onOpen,
}: {
  user: UsersDirectoryUser;
  portraitUrl: string | null;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const RoleIcon = ROLE_ICONS[user.role];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-h-touch w-full items-center gap-3 rounded-2xl border border-line bg-surface px-3 py-2 text-start shadow-sm transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-4"
    >
      <EntityAvatar
        icon={RoleIcon}
        size="sm"
        src={portraitUrl}
        alt={user.fullName}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-fg">{user.fullName}</span>
        <UserMeta user={user} />
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-judi-800 dark:text-judi-200">
        {t("users.openProfile")}
        <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
      </span>
    </button>
  );
}

function UserTableRow({
  user,
  portraitUrl,
  onOpen,
}: {
  user: UsersDirectoryUser;
  portraitUrl: string | null;
  onOpen: () => void;
}) {
  const t = useTranslations();
  const RoleIcon = ROLE_ICONS[user.role];
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="flex min-h-touch items-center gap-3 text-start font-medium text-fg hover:text-judi-800 focus-visible:outline-none dark:hover:text-judi-200"
        >
          <EntityAvatar
            icon={RoleIcon}
            size="xs"
            src={portraitUrl}
            alt=""
            desktopOnly
          />
          <span className="truncate">{user.fullName}</span>
        </button>
      </td>
      <td className="px-4 py-2 text-fg-muted">
        <span className="line-clamp-1">{user.email}</span>
      </td>
      <td className="hidden px-4 py-2 text-fg-muted md:table-cell">
        {t(`roles.${user.role}`)}
      </td>
      <td className="hidden px-4 py-2 text-fg-muted lg:table-cell">
        <span className="line-clamp-1">
          {user.warehouseName ?? t("users.unassigned")}
        </span>
      </td>
      <td className="px-4 py-2 tabular-nums text-fg-muted">
        {user.maxDiscountAllowed}%
      </td>
      <td className="px-4 py-2">
        <button
          type="button"
          onClick={onOpen}
          className="inline-flex min-h-touch min-w-touch items-center justify-center rounded-xl text-judi-800 hover:bg-muted dark:text-judi-200"
          aria-label={t("users.openProfile")}
        >
          <ChevronRight className="size-4 rtl:rotate-180" aria-hidden />
        </button>
      </td>
    </tr>
  );
}

function CreateProfileForm({
  warehouses,
}: {
  warehouses: UsersDirectoryWarehouse[];
}) {
  const t = useTranslations();
  return (
    <form action={createUserAction} className="grid gap-3">
      <p className="rounded-xl border border-dashed border-line bg-muted/40 px-3 py-3 text-sm text-fg-muted text-start">
        {t("users.photosAfterSave")}
      </p>
      <Field
        icon={UserRound}
        label={t("users.fullName")}
        name="fullName"
        hint={t("users.fullNameHint")}
        required
      />
      <Field
        icon={Mail}
        label={t("auth.email")}
        name="email"
        type="email"
        hint={t("users.emailHint")}
        autoComplete="off"
        required
      />
      <Field
        icon={Phone}
        label={t("users.phone")}
        name="phone"
        type="tel"
        hint={t("users.phoneHint")}
      />
      <Field
        icon={KeyRound}
        label={t("users.password")}
        name="password"
        type="password"
        hint={t("users.passwordHint")}
        minLength={8}
        autoComplete="new-password"
        required
      />
      <SelectField
        icon={Shield}
        label={t("users.role")}
        name="role"
        hint={t("users.roleHint")}
        defaultValue="FIELD_DELEGATE"
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {t(`roles.${role}`)}
          </option>
        ))}
      </SelectField>
      <SelectField
        icon={Warehouse}
        label={t("users.warehouse")}
        name="assignedWarehouseId"
        hint={t("users.warehouseHint")}
        defaultValue=""
      >
        <option value="">{t("users.unassigned")}</option>
        {warehouses.map((warehouse) => (
          <option key={warehouse.id} value={warehouse.id}>
            {warehouse.name}
          </option>
        ))}
      </SelectField>
      <Field
        icon={BadgePercent}
        label={t("users.discount")}
        name="maxDiscountAllowed"
        type="number"
        hint={t("users.discountHint")}
        defaultValue="0"
        min={0}
        max={100}
        step="0.01"
      />
      <div className="sticky-form-actions -mx-4 mt-1 sm:-mx-5">
        <button
          type="submit"
          className="btn btn-important w-full"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          {t("users.save")}
        </button>
      </div>
    </form>
  );
}

function EditProfileForm({
  user,
  warehouses,
  primaryMediaUrl,
  defaultOpenPhotos = false,
  onPrimaryUrlChange,
}: {
  user: UsersDirectoryUser;
  warehouses: UsersDirectoryWarehouse[];
  primaryMediaUrl: string | null;
  defaultOpenPhotos?: boolean;
  onPrimaryUrlChange?: (url: string | null) => void;
}) {
  const t = useTranslations();
  const RoleIcon = ROLE_ICONS[user.role];
  return (
    <div className="space-y-4">
      <EmployeeMediaPanel
        userId={user.id}
        fullName={user.fullName}
        initialPrimaryUrl={primaryMediaUrl}
        canEdit
        defaultOpen={defaultOpenPhotos}
        size="lg"
        placeholderIcon={RoleIcon}
        onPrimaryUrlChange={onPrimaryUrlChange}
      />

      <form action={updateUserAction} className="grid gap-3">
        <input type="hidden" name="id" value={user.id} />
        <Field
          icon={UserRound}
          label={t("users.fullName")}
          name="fullName"
          defaultValue={user.fullName}
          required
        />
        <div className="space-y-1.5 text-start">
          <span className="flex items-center gap-2 text-sm font-medium text-fg">
            <Mail
              className="size-4 text-judi-700 dark:text-judi-300"
              aria-hidden
            />
            {t("auth.email")}
          </span>
          <p className="flex min-h-touch items-center rounded-xl border border-line bg-muted px-3 text-fg">
            {user.email}
          </p>
          <p className="text-xs text-fg-subtle">{t("users.emailLockedHint")}</p>
        </div>
        <Field
          icon={Phone}
          label={t("users.phone")}
          name="phone"
          type="tel"
          defaultValue={user.phone ?? ""}
          hint={t("users.phoneHint")}
        />
        <Field
          icon={KeyRound}
          label={t("users.newPassword")}
          name="password"
          type="password"
          hint={t("users.newPasswordHint")}
          minLength={8}
          autoComplete="new-password"
        />
        <SelectField
          icon={Shield}
          label={t("users.role")}
          name="role"
          hint={t("users.roleHint")}
          defaultValue={user.role}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {t(`roles.${role}`)}
            </option>
          ))}
        </SelectField>
        <SelectField
          icon={Warehouse}
          label={t("users.warehouse")}
          name="assignedWarehouseId"
          hint={t("users.warehouseHint")}
          defaultValue={user.assignedWarehouseId ?? ""}
        >
          <option value="">{t("users.unassigned")}</option>
          {warehouses.map((warehouse) => (
            <option key={warehouse.id} value={warehouse.id}>
              {warehouse.name}
            </option>
          ))}
        </SelectField>
        <Field
          icon={BadgePercent}
          label={t("users.discount")}
          name="maxDiscountAllowed"
          type="number"
          hint={t("users.discountHint")}
          defaultValue={user.maxDiscountAllowed}
          min={0}
          max={100}
          step="0.01"
        />
        <div className="sticky-form-actions -mx-4 mt-1 sm:-mx-5">
          <button
            type="submit"
            className="btn btn-important w-full"
          >
            <Save className="size-4 shrink-0" aria-hidden />
            {t("users.update")}
          </button>
        </div>
      </form>

      <form action={deleteUserAction} className="border-t border-line pt-3">
        <input type="hidden" name="id" value={user.id} />
        <button
          type="submit"
          className="inline-flex min-h-touch w-full items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/40"
        >
          <Trash2 className="size-4 shrink-0" aria-hidden />
          {t("users.delete")}
        </button>
      </form>
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  name,
  type = "text",
  hint,
  required,
  minLength,
  defaultValue,
  autoComplete,
  min,
  max,
  step,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  type?: string;
  hint?: string;
  required?: boolean;
  minLength?: number;
  defaultValue?: string;
  autoComplete?: string;
  min?: number;
  max?: number;
  step?: string;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label className="block space-y-1.5 text-start">
      <span className="flex items-center gap-2 text-sm font-medium text-fg">
        <Icon
          className="size-4 text-judi-700 dark:text-judi-300"
          aria-hidden
        />
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        minLength={minLength}
        defaultValue={defaultValue}
        autoComplete={autoComplete}
        min={min}
        max={max}
        step={step}
        aria-describedby={hintId}
        className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
      />
      {hint ? (
        <span id={hintId} className="block text-xs text-fg-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}

function SelectField({
  icon: Icon,
  label,
  name,
  hint,
  defaultValue,
  children,
}: {
  icon: LucideIcon;
  label: string;
  name: string;
  hint?: string;
  defaultValue?: string;
  children: ReactNode;
}) {
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <label className="block space-y-1.5 text-start">
      <span className="flex items-center gap-2 text-sm font-medium text-fg">
        <Icon
          className="size-4 text-judi-700 dark:text-judi-300"
          aria-hidden
        />
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        aria-describedby={hintId}
        className="min-h-touch w-full rounded-xl border border-line-strong bg-muted px-3 text-start text-fg focus:border-judi-500 focus:bg-surface"
      >
        {children}
      </select>
      {hint ? (
        <span id={hintId} className="block text-xs text-fg-subtle">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
