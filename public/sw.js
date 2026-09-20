/* Judi ERP service worker — Web Push + offline shell for installed PWA. */
const SHELL_CACHE = "judi-shell-v1";
const SHELL_URLS = ["/", "/icons/icon-192.png", "/icons/icon-512.png", "/favicon.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      try {
        await cache.addAll(SHELL_URLS);
      } catch {
        /* offline install still ok without shell */
      }
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("judi-shell-") && key !== SHELL_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function pickLocale(text, lang) {
  if (!text || typeof text !== "object") return typeof text === "string" ? text : "Judi";
  if (lang.startsWith("ar")) return text.ar || text.en || "Judi";
  if (lang.startsWith("ckb") || lang.startsWith("ku")) return text.ckb || text.en || "Judi";
  return text.en || "Judi";
}

function toAbsoluteUrl(href) {
  try {
    return new URL(href || "/", self.location.origin).href;
  } catch {
    return self.location.origin + "/";
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: { en: event.data ? event.data.text() : "Judi" } };
  }

  const lang =
    (self.registration && self.navigator && self.navigator.language) ||
    (typeof navigator !== "undefined" && navigator.language) ||
    "en";

  const title = pickLocale(data.title, lang);
  const body = pickLocale(data.body, lang);
  const href = typeof data.href === "string" ? data.href : "/";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: data.icon || "/icons/icon-192.png",
      badge: data.badge || "/icons/icon-192.png",
      data: { href },
      tag: data.kind ? `judi-${data.kind}` : "judi-alert",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = toAbsoluteUrl(
    event.notification.data && typeof event.notification.data.href === "string"
      ? event.notification.data.href
      : "/",
  );

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            try {
              await client.navigate(href);
            } catch {
              /* ignore navigate failures */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(href);
      }
    })(),
  );
});

/** Network-first for navigations; fall back to cached shell when offline. */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          return fresh;
        } catch {
          const cache = await caches.open(SHELL_CACHE);
          const cached = await cache.match("/");
          if (cached) return cached;
          return new Response("Offline", {
            status: 503,
            headers: { "Content-Type": "text/plain; charset=utf-8" },
          });
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/icons/") || url.pathname === "/favicon.svg") {
    event.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const fresh = await fetch(request);
          if (fresh.ok) cache.put(request, fresh.clone());
          return fresh;
        } catch {
          return cached || Response.error();
        }
      }),
    );
  }
});
