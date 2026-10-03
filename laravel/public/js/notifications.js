(() => {
  const feedUrl = document.body?.dataset?.notifFeed;
  if (!feedUrl) return;

  const inboxUrl = document.body?.dataset?.notifInbox || '/notifications';
  const devicesUrl = '/devices';
  const SEEN_KEY = 'judi_notif_seen_v3';
  const LAST_KEY = 'judi_notif_last_id_v3';
  const PERM_KEY = 'judi_notif_perm_asked';

  let lastId = Number(localStorage.getItem(LAST_KEY) || 0) || 0;
  let lastPendingDevices = null;
  let primed = false;
  let toastBusy = false;
  const seenIds = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  const countEl = document.querySelector('[data-notif-count]');
  const host = () => document.querySelector('[data-notif-toast-host]');
  const queue = [];

  const copy = {
    deviceTitle: document.documentElement.getAttribute('data-label-notif-device') || 'New device waiting',
    deviceBody: document.documentElement.getAttribute('data-label-notif-device-body') || 'Open Settings to approve this device.',
  };

  function persistSeen() {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seenIds].slice(-120)));
    } catch (e) {}
  }

  function pageVisible() {
    return document.visibilityState === 'visible';
  }

  function showBrowser(title, body, tag) {
    // Avoid double noise: system notification only when the tab is hidden.
    if (pageVisible()) return;
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body: body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || ('judi-' + String(title || '').slice(0, 40)),
        renotify: false,
        silent: true,
      });
      setTimeout(() => { try { n.close(); } catch (e) {} }, 5000);
    } catch (e) {}
  }

  async function ensurePermissionOnce() {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'default') return;
    if (localStorage.getItem(PERM_KEY) === '1') return;
    try {
      localStorage.setItem(PERM_KEY, '1');
      await Notification.requestPermission();
    } catch (e) {}
  }

  function enqueueToast(item) {
    const key = item.id != null ? String(item.id) : null;
    if (key && seenIds.has(key)) return;
    if (key) {
      seenIds.add(key);
      persistSeen();
    }
    // Keep only the latest toast waiting — no flapping queue.
    queue.length = 0;
    queue.push(item);
    if (!toastBusy) drainQueue();
  }

  function drainQueue() {
    const root = host();
    if (!root || queue.length === 0) {
      toastBusy = false;
      return;
    }
    toastBusy = true;
    root.querySelectorAll('[data-notif-toast]').forEach((node) => node.remove());

    const item = queue.shift();
    const isDevice = item.type === 'device_login' || item.kind === 'pending_device';
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'notif-toast' + (isDevice ? ' notif-toast--device' : '');
    el.setAttribute('data-notif-toast', '');
    el.innerHTML =
      '<span class="notif-toast__icon" aria-hidden="true">'
      + (isDevice
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>')
      + '</span>'
      + '<span class="notif-toast__body">'
      + '<strong class="notif-toast__title"></strong>'
      + '<span class="notif-toast__text"></span>'
      + '</span>';

    el.querySelector('.notif-toast__title').textContent = item.title || '';
    el.querySelector('.notif-toast__text').textContent = item.body || '';

    let closed = false;
    const dismiss = () => {
      if (closed) return;
      closed = true;
      el.classList.remove('is-in');
      el.classList.add('is-out');
      setTimeout(() => {
        el.remove();
        toastBusy = false;
        drainQueue();
      }, 180);
    };

    el.addEventListener('click', () => {
      dismiss();
      window.location.href = item.href || (isDevice ? devicesUrl : inboxUrl);
    });

    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(dismiss, isDevice ? 7000 : 4000);
  }

  function toastNew(list) {
    const fresh = list
      .filter((n) => n.unread)
      .filter((n) => n.type !== 'user_signed_in')
      .filter((n) => n.id == null || !seenIds.has(String(n.id)));

    if (fresh.length === 0) return;

    const newest = fresh[fresh.length - 1];
    enqueueToast(newest);
    showBrowser(newest.title, newest.body, 'judi-n-' + String(newest.id));
  }

  async function poll() {
    try {
      const url = lastId > 0
        ? `${feedUrl}${feedUrl.includes('?') ? '&' : '?'}after_id=${encodeURIComponent(String(lastId))}`
        : feedUrl;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'same-origin' });
      if (!res.ok) return;
      const data = await res.json();

      if (countEl) {
        const n = (data.unread || 0) + (data.pending_devices || 0);
        countEl.textContent = n > 99 ? '99+' : String(n);
        countEl.classList.toggle('is-on', n > 0);
      }

      const pending = Number(data.pending_devices || 0);
      const list = Array.isArray(data.notifications) ? data.notifications : [];

      if (!primed) {
        primed = true;
        list.forEach((n) => {
          if (n.id != null) seenIds.add(String(n.id));
        });
        if (pending > 0) {
          seenIds.add('pending-devices-' + pending);
        }
        persistSeen();
      } else {
        toastNew(list);
        if (lastPendingDevices !== null && pending > lastPendingDevices) {
          const pendingKey = 'pending-devices-' + pending;
          enqueueToast({
            id: pendingKey,
            kind: 'pending_device',
            type: 'device_login',
            title: copy.deviceTitle,
            body: copy.deviceBody,
            href: devicesUrl,
          });
          showBrowser(copy.deviceTitle, copy.deviceBody, 'judi-pending');
        }
      }

      lastPendingDevices = pending;
      const maxId = Number(data.max_id || 0);
      if (maxId > lastId) {
        lastId = maxId;
        try { localStorage.setItem(LAST_KEY, String(lastId)); } catch (e) {}
      }
    } catch (e) {}
  }

  function start() {
    ensurePermissionOnce();
    poll();
    setInterval(poll, 12000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') poll();
  });
})();
