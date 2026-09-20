"use client";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

/** Push / SW need a secure context (HTTPS or localhost). */
export function isSecurePushContext() {
  return typeof window !== "undefined" && window.isSecureContext;
}

export function notificationsSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

export async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("unsupported");
  }
  if (!window.isSecureContext) {
    throw new Error("insecure_context");
  }
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
    updateViaCache: "none",
  });
  await navigator.serviceWorker.ready;
  // Ask the waiting worker to activate promptly after deploys.
  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
  }
  return registration;
}

export async function enablePushNotifications(): Promise<"granted" | "denied" | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";

  const permission =
    Notification.permission === "granted"
      ? "granted"
      : await Notification.requestPermission();

  if (permission !== "granted") return permission === "denied" ? "denied" : "denied";

  const registration = await ensureServiceWorker();
  const vapidRes = await fetch("/api/push/vapid", { cache: "no-store" });
  if (!vapidRes.ok) throw new Error("vapid_failed");
  const vapid = (await vapidRes.json()) as { publicKey?: string };
  if (!vapid.publicKey) throw new Error("vapid_failed");

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapid.publicKey),
    });
  }

  const raw = subscription.toJSON();
  if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys?.auth) {
    throw new Error("subscribe_failed");
  }

  const saveRes = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      endpoint: raw.endpoint,
      keys: { p256dh: raw.keys.p256dh, auth: raw.keys.auth },
    }),
  });
  if (!saveRes.ok) throw new Error("subscribe_failed");

  return "granted";
}

export async function syncPushIfGranted() {
  if (!notificationsSupported()) return;
  if (Notification.permission !== "granted") return;
  try {
    await enablePushNotifications();
  } catch {
    /* best-effort re-subscribe after login / PWA open */
  }
}
