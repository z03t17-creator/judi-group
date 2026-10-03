(() => {
  const feedUrl = document.body?.dataset?.notifFeed;
  if (!feedUrl) return;

  const inboxUrl = document.body?.dataset?.notifInbox || '/notifications';
  const devicesUrl = '/devices';
  const SEEN_KEY = 'judi_notif_seen_v2';
  const LAST_KEY = 'judi_notif_last_id_v2';
  const PERM_KEY = 'judi_notif_perm_asked';

  let lastId = Number(localStorage.getItem(LAST_KEY) || 0) || 0;
  let lastPendingDevices = null;
  let primed = false;
  const seenIds = new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]'));
  const countEl = document.querySelector('[data-notif-count]');
  const host = () => document.querySelector('[data-notif-toast-host]');
  const queue = [];
  let showing = false;

  const copy = {
    deviceTitle: document.documentElement.getAttribute('data-label-notif-device') || 'New device waiting',
    deviceBody: document.documentElement.getAttribute('data-label-notif-device-body') || 'Open Settings to approve this device.',
  };

  function persistSeen() {
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify([...seenIds].slice(-120)));
    } catch (e) {}
  }

  function showBrowser(title, body, tag) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body: body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: tag || ('judi-' + String(title || '').slice(0, 40)),
        renotify: false,
      });
      setTimeout(() => { try { n.close(); } catch (e) {} }, 8000);
    } catch (e) {}
  }

  /** Ask once per browser install — never on every login/page load. */
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
    queue.push(item);
    if (!showing) drainQueue();
  }

  function drainQueue() {
    const root = host();
    if (!root || queue.length === 0) {
      showing = false;
      return;
    }
    showing = true;
    const item = queue.shift();
    const isDevice = item.type === 'device_login' || item.kind === 'pending_device';
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'notif-toast' + (isDevice ? ' notif-toast--device' : '');
    el.setAttribute('data-notif-toast', '');
    el.innerHTML =
      '<span class="notif-toast__bar" aria-hidden="true"></span>'
      + '<span class="notif-toast__icon" aria-hidden="true">'
      + (isDevice
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>')
      + '</span>'
      + '<span class="notif-toast__body">'
      + '<strong class="notif-toast__title"></strong>'
      + '<span class="notif-toast__text"></span>'
      + '</span>'
      + '<span class="notif-toast__close" aria-hidden="true">×</span>';

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
        showing = false;
        drainQueue();
      }, 280);
    };

    el.addEventListener('click', (event) => {
      if (event.target.closest('.notif-toast__close')) {
        dismiss();
        return;
      }
      dismiss();
      window.location.href = item.href || (isDevice ? devicesUrl : inboxUrl);
    });

    root.appendChild(el);
    requestAnimationFrame(() => el.classList.add('is-in'));
    setTimeout(dismiss, isDevice ? 12000 : 6000);
  }

  function toastNew(list) {
    list
      .filter((n) => n.unread)
      .filter((n) => n.type !== 'user_signed_in')
      .reverse()
      .forEach((n) => {
        enqueueToast(n);
        showBrowser(n.title, n.body, 'judi-n-' + String(n.id));
      });
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
        // First load: mark current feed as seen — do not replay old toasts on login.
        list.forEach((n) => {
          if (n.id != null) seenIds.add(String(n.id));
        });
        persistSeen();
        if (pending > 0) {
          const pendingKey = 'pending-devices-' + pending;
          if (!seenIds.has(pendingKey)) {
            enqueueToast({
              id: pendingKey,
              kind: 'pending_device',
              type: 'device_login',
              title: copy.deviceTitle,
              body: copy.deviceBody,
              href: devicesUrl,
            });
            showBrowser(copy.deviceTitle, copy.deviceBody, pendingKey);
          }
        }
      } else {
        toastNew(list);
        if (lastPendingDevices !== null && pending > lastPendingDevices) {
          const pendingKey = 'pending-devices-' + pending + '-' + Date.now();
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
    setInterval(poll, 8000);
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
