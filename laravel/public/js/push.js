(() => {
  const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (!canPush) return;

  const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function subscribe() {
    const keyRes = await fetch('/api/push/vapid-public-key', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    const keyData = await keyRes.json();
    if (!keyData.enabled || !keyData.publicKey) return;

    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    const raw = sub.toJSON();
    await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf(),
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({
        endpoint: raw.endpoint,
        keys: raw.keys,
        contentEncoding: (PushManager.supportedContentEncodings && PushManager.supportedContentEncodings[0]) || 'aesgcm',
      }),
    });
  }

  async function boot() {
    try {
      if (Notification.permission === 'default') {
        await Notification.requestPermission();
      }
      if (Notification.permission !== 'granted') return;
      await subscribe();
    } catch (e) {
      // Push is optional — in-app toasts still work.
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
