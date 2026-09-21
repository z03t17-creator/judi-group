(() => {
  const feedUrl = document.body?.dataset?.notifFeed;
  if (!feedUrl) return;

  const inboxUrl = document.body?.dataset?.notifInbox || '/settings#settings-inbox';
  const devicesUrl = (document.body?.dataset?.notifInbox || '/settings').replace(/#.*$/, '') + '#settings-devices-pending';
  let lastId = Number(sessionStorage.getItem('judi_notif_last_id') || 0) || 0;
  let lastPendingDevices = null;
  let primed = false;
  const seenIds = new Set(JSON.parse(sessionStorage.getItem('judi_notif_seen') || '[]'));
  const countEl = document.querySelector('[data-notif-count]');
  const host = () => document.querySelector('[data-notif-toast-host]');
  const queue = [];
  let showing = false;

  const copy = {
    deviceTitle: document.documentElement.getAttribute('data-label-notif-device') || 'New device login',
    deviceBody: document.documentElement.getAttribute('data-label-notif-device-body') || 'Open Settings to approve this device.',
  };

  function persistSeen() {
    try {
      sessionStorage.setItem('judi_notif_seen', JSON.stringify([...seenIds].slice(-80)));
    } catch (e) {}
  }

  function showBrowser(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
      const n = new Notification(title, {
        body: body || '',
        icon: '/images/judi-logo.jpg?v=2',
        badge: '/images/judi-logo.jpg?v=2',
        tag: 'judi-app-' + String(title || '').slice(0, 40),
        renotify: true,
      });
      setTimeout(() => { try { n.close(); } catch (e) {} }, 10000);
    } catch (e) {}
  }

  async function ensurePermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch (e) {}
    }
  }

  function enqueueToast(item) {
    if (item.id && seenIds.has(String(item.id))) return;
    if (item.id) {
      seenIds.add(String(item.id));
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
    const isDevice = item.type === 'device_login' || item.type === 'user_signed_in' || item.kind === 'pending_device';
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
    setTimeout(dismiss, isDevice ? 14000 : 6000);
  }

  function isRecent(iso, minutes) {
    if (!iso) return false;
    const t = Date.parse(iso);
    if (Number.isNaN(t)) return false;
    return t >= Date.now() - minutes * 60 * 1000;
  }

  function toastNotifications(list, { deviceOnlyRecent = false } = {}) {
    list
      .filter((n) => n.unread)
      .filter((n) => {
        if (!deviceOnlyRecent) return true;
        if (n.type === 'device_login') return isRecent(n.created_at, 30);
        return false;
      })
      .reverse()
      .forEach((n) => {
        enqueueToast(n);
        showBrowser(n.title, n.body);
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
        // First poll after load: surface recent device logins (refresh used to miss these).
        toastNotifications(list, { deviceOnlyRecent: true });
        if (pending > 0 && !list.some((n) => n.type === 'device_login' && n.unread && isRecent(n.created_at, 30))) {
          enqueueToast({
            id: 'pending-devices-prime-' + pending,
            kind: 'pending_device',
            type: 'device_login',
            title: copy.deviceTitle,
            body: copy.deviceBody,
            href: devicesUrl,
          });
          showBrowser(copy.deviceTitle, copy.deviceBody);
        }
      } else {
        toastNotifications(list);
        if (lastPendingDevices !== null && pending > lastPendingDevices) {
          enqueueToast({
            id: 'pending-devices-' + pending + '-' + Date.now(),
            kind: 'pending_device',
            type: 'device_login',
            title: copy.deviceTitle,
            body: copy.deviceBody,
            href: devicesUrl,
          });
          showBrowser(copy.deviceTitle, copy.deviceBody);
        }
      }

      lastPendingDevices = pending;
      const maxId = Number(data.max_id || 0);
      if (maxId > lastId) {
        lastId = maxId;
        try { sessionStorage.setItem('judi_notif_last_id', String(lastId)); } catch (e) {}
      }
    } catch (e) {}
  }

  function start() {
    ensurePermission();
    poll();
    setInterval(poll, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') poll();
  });

  document.addEventListener('click', (event) => {
    if (event.target.closest('[data-notif-bell]')) {
      ensurePermission();
    }
  });
})();
