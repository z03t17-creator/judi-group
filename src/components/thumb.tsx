import type { LucideIcon } from "lucide-react";
import { Boxes, Package, Store, UserRound, Warehouse } from "lucide-react";

/** Shared thumbnail sizes used across directories, cards, and detail heroes. */
export type ThumbSize = "xs" | "sm" | "md" | "lg";

/** Entity family — drives shape (circle vs rounded) and default placeholder icon. */
export type ThumbKind = "person" | "product" | "store" | "warehouse" | "stock";

const SIZE_CLASS: Record<ThumbSize, string> = {
  xs: "thumb-xs",
  sm: "thumb-sm",
  md: "thumb-md",
  lg: "thumb-lg",
};

const ICON_CLASS: Record<ThumbSize, string> = {
  xs: "size-3.5",
  sm: "size-5",
  md: "size-7",
  lg: "size-10",
};

const SHAPE_CLASS: Record<ThumbKind, string> = {
  person: "rounded-full",
  product: "rounded-xl",
  store: "rounded-xl",
  warehouse: "rounded-xl",
  stock: "rounded-xl",
};

const DEFAULT_ICON: Record<ThumbKind, LucideIcon> = {
  person: UserRound,
  product: Package,
  store: Store,
  warehouse: Warehouse,
  stock: Boxes,
};

type ThumbProps = {
  src?: string | null;
  alt?: string;
  size?: ThumbSize;
  kind?: ThumbKind;
  /** Override placeholder icon (e.g. role or warehouse-type icon). */
  icon?: LucideIcon;
  className?: string;
  /** Hide on small screens — for compact table columns (`xs`). */
  desktopOnly?: boolean;
};

/**
 * Shared entity thumbnail. Prefer `primaryMedia.url` from MediaGallery / MediaAsset.
 * People = circle; products / stores / stock = rounded-xl.
 */
export function Thumb({
  src,
  alt = "",
  size = "sm",
  kind = "product",
  icon,
  className = "",
  desktopOnly = false,
}: ThumbProps) {
  const Icon = icon ?? DEFAULT_ICON[kind];
  const visibility = desktopOnly ? "hidden lg:inline-flex" : "inline-flex";
  const shell = `${visibility} thumb ${SIZE_CLASS[size]} ${SHAPE_CLASS[kind]} ${className}`;

  if (src) {
    return (
      <span className={shell}>
        {/* eslint-disable-next-line @next/next/no-img-element -- media URLs are local uploads, not a fixed remote host */}
        <img src={src} alt={alt} className="size-full object-cover" />
      </span>
    );
  }

  return (
    <span className={`${shell} thumb-placeholder`} aria-hidden={alt ? undefined : true}>
      <Icon className={ICON_CLASS[size]} aria-hidden />
      {alt ? <span className="sr-only">{alt}</span> : null}
    </span>
  );
}

type EntityAvatarProps = Omit<ThumbProps, "kind"> & {
  kind?: ThumbKind;
};

/** Portrait-first alias; defaults to `person` (circle). */
export function EntityAvatar({ kind = "person", size = "sm", ...props }: EntityAvatarProps) {
  return <Thumb kind={kind} size={size} {...props} />;
}
