"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
} from "react";
import { useLinkStatus } from "next/link";
import { Link, usePathname, useRouter } from "@/i18n/navigation";

type InstantLinkProps = ComponentProps<typeof Link> & {
  /** Pulse overlay while this link's navigation is in flight. */
  pendingPulse?: boolean;
};

type AppHref = ComponentProps<typeof Link>["href"];

function hrefPath(href: AppHref) {
  if (typeof href === "string") return href;
  if (href && typeof href === "object" && "pathname" in href && typeof href.pathname === "string") {
    return href.pathname;
  }
  return "";
}

function prefetchRoute(
  router: ReturnType<typeof useRouter>,
  href: AppHref,
) {
  router.prefetch(href as Parameters<typeof router.prefetch>[0]);
}

let navPending = false;
const navListeners = new Set<() => void>();

function setNavPending(next: boolean) {
  if (navPending === next) return;
  navPending = next;
  navListeners.forEach((listener) => listener());
}

export function markNavigating() {
  setNavPending(true);
}

export function isNavPending() {
  return navPending;
}

function shouldLeaveToBrowser(event: MouseEvent<HTMLAnchorElement>) {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey
  );
}

/** Instant tap feedback + hover/press prefetch. Do not viewport-prefetch every nav item. */
export function InstantLink({
  href,
  onPointerEnter,
  onPointerDown,
  onFocus,
  onClick,
  pendingPulse = false,
  children,
  className,
  ...rest
}: InstantLinkProps) {
  const router = useRouter();
  const primed = useRef(false);

  const prime = useCallback(() => {
    if (primed.current) return;
    primed.current = true;
    try {
      prefetchRoute(router, href);
    } catch {
      primed.current = false;
    }
  }, [href, router]);

  return (
    <Link
      {...rest}
      href={href}
      prefetch={false}
      className={pendingPulse ? `relative ${className ?? ""}` : className}
      onPointerEnter={(event) => {
        prime();
        onPointerEnter?.(event);
      }}
      onPointerDown={(event) => {
        prime();
        onPointerDown?.(event);
      }}
      onFocus={(event) => {
        prime();
        onFocus?.(event);
      }}
      onClick={(event) => {
        if (!shouldLeaveToBrowser(event)) markNavigating();
        onClick?.(event);
      }}
    >
      {pendingPulse ? <NavPendingPulse /> : null}
      {children}
    </Link>
  );
}

function NavPendingPulse() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      className="pointer-events-none absolute inset-0 animate-pulse rounded-[inherit] bg-white/15"
      aria-hidden
    />
  );
}

/** Sequential idle prefetch so the first real tap is already compiled and cached. */
export function RouteWarmup({
  hrefs,
}: {
  hrefs: ComponentProps<typeof Link>["href"][];
}) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let cancelled = false;
    let index = 0;
    let timer = 0;

    const tick = () => {
      if (cancelled) return;
      if (document.visibilityState !== "visible" || isNavPending()) {
        timer = window.setTimeout(tick, 800);
        return;
      }
      while (index < hrefs.length) {
        const href = hrefs[index++];
        if (hrefPath(href) === pathname) continue;
        try {
          prefetchRoute(router, href);
        } catch {
          /* ignore */
        }
        timer = window.setTimeout(tick, 900);
        return;
      }
    };

    const start = () => {
      timer = window.setTimeout(tick, 2500);
    };

    if (typeof window.requestIdleCallback === "function") {
      const idle = window.requestIdleCallback(start, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(idle);
        window.clearTimeout(timer);
      };
    }

    start();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [hrefs, pathname, router]);

  return null;
}

/** 3px bar the instant a nav tap happens — does not wait for the server. */
export function NavigationProgress() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);

  useEffect(() => {
    const sync = () => setActive(navPending);
    navListeners.add(sync);
    return () => {
      navListeners.delete(sync);
    };
  }, []);

  useEffect(() => {
    setNavPending(false);
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setNavPending(false), 8000);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  return (
    <div className="nav-progress" role="progressbar" aria-hidden />
  );
}
