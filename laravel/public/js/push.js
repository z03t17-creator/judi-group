(() => {
  const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const csrf = () => document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
  const statusEl = () => document.querySelector('[data-push-status]');
  const ASKED_KEY = 'judi_push_asked_v2';

  function setStatus(text, tone) {
    const el = statusEl();
    if (!el) return;
    el.textContent = text || '';
    el.dataset.tone = tone || '';
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  async function ensureServiceWorker() {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return reg;
  }

  async function saveSubscription(sub) {
    const raw = sub.toJSON();
    const res = await fetch('/api/push/subscribe', {
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
    if (!res.ok) {
      const err = await res.text();
      throw new Error(err || ('subscribe HTTP ' + res.status));
    }
  }

  async function subscribe(reg) {
    const keyRes = await fetch('/api/push/vapid-public-key', {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    const keyData = await keyRes.json();
    if (!keyData.enabled || !keyData.publicKey) {
      throw new Error('push-disabled');
    }

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey),
      });
    }

    await saveSubscription(sub);
    return sub;
  }

  async function enablePush({ interactive } = {}) {
    if (!canPush) {
      setStatus(document.documentElement.getAttribute('data-label-push-unsupported') || 'Push not supported on this browser.', 'err');
      return false;
    }

    try {
      const reg = await ensureServiceWorker();

      if (Notification.permission === 'denied') {
        setStatus(document.documentElement.getAttribute('data-label-push-blocked') || 'Notifications blocked in browser settings.', 'err');
        return false;
      }

      if (Notification.permission === 'default') {
        // Mobile Chrome only shows the prompt reliably from a user tap.
        const perm = await Notification.requestPermission();
        try { localStorage.setItem(ASKED_KEY, '1'); } catch (e) {}
        if (perm !== 'granted') {
          setStatus(document.documentElement.getAttribute('data-label-push-denied') || 'Permission not granted.', 'err');
          return false;
        }
      }

      await subscribe(reg);
      setStatus(document.documentElement.getAttribute('data-label-push-on') || 'Closed-app alerts are on for this device.', 'ok');
      return true;
    } catch (e) {
      const msg = (e && e.message) ? String(e.message) : 'error';
      if (msg === 'push-disabled') {
        setStatus(document.documentElement.getAttribute('data-label-push-disabled') || 'Server push is not configured.', 'err');
      } else {
        setStatus((document.documentElement.getAttribute('data-label-push-failed') || 'Could not enable alerts.') + ' ' + msg, 'err');
      }
      if (interactive) console.warn('judi push', e);
      return false;
    }
  }

  window.judiEnablePush = function () {
    return enablePush({ interactive: true });
  };

  async function boot() {
    if (!canPush) return;
    try {
      await ensureServiceWorker();
    } catch (e) {}

    // Quiet auto-subscribe only when already allowed (no prompt on every login).
    if (Notification.permission === 'granted') {
      await enablePush({ interactive: false });
      return;
    }

    if (Notification.permission === 'default') {
      setStatus(document.documentElement.getAttribute('data-label-push-hint') || 'Tap Enable alerts so you get notified when the app is closed.', 'muted');
    }
  }

  document.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-push-enable]');
    if (!btn) return;
    event.preventDefault();
    btn.disabled = true;
    enablePush({ interactive: true }).finally(() => {
      btn.disabled = false;
    });
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
