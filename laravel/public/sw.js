/* JUDI service worker — installable PWA + Web Push with Accept/Reject actions. */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});

function openOrFocus(url) {
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
    for (const client of clientList) {
      if ('focus' in client) {
        if ('navigate' in client) {
          client.navigate(url);
        }
        return client.focus();
      }
    }
    if (self.clients.openWindow) {
      return self.clients.openWindow(url);
    }
  });
}

function showLocal(title, body) {
  return self.registration.showNotification(title || 'JUDI', {
    body: body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'judi-push-result',
  });
}

self.addEventListener('push', (event) => {
  let data = {
    title: 'JUDI',
    body: '',
    url: '/settings#settings-devices-pending',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    image: '/icon-512.png',
  };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch (e) {
    try {
      data.body = event.data ? event.data.text() : '';
    } catch (e2) {}
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/icon-192.png',
    badge: data.badge || '/icon-192.png',
    image: data.image || '/icon-512.png',
    data: {
      url: data.url || '/settings#settings-devices-pending',
      approveUrl: data.approveUrl || null,
      rejectUrl: data.rejectUrl || null,
      requestId: data.requestId || null,
    },
    tag: data.tag || 'judi-push',
    renotify: true,
    requireInteraction: !!(data.approveUrl && data.rejectUrl),
  };

  if (Array.isArray(data.actions) && data.actions.length) {
    options.actions = data.actions.map((a) => ({
      action: a.action,
      title: a.title,
    }));
  }

  event.waitUntil(self.registration.showNotification(data.title || 'JUDI', options));
});

self.addEventListener('notificationclick', (event) => {
  const data = (event.notification && event.notification.data) || {};
  const action = event.action || '';
  event.notification.close();

  if (action === 'approve' || action === 'reject') {
    const target = action === 'approve' ? data.approveUrl : data.rejectUrl;
    if (!target) {
      event.waitUntil(openOrFocus(data.url || '/settings#settings-devices-pending'));
      return;
    }

    event.waitUntil(
      fetch(target, {
        method: 'GET',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-Judi-Push': '1',
        },
        redirect: 'follow',
      })
        .then(async (res) => {
          let payload = {};
          try {
            payload = await res.json();
          } catch (e) {}
          if (res.ok && payload.ok) {
            await showLocal(payload.title || 'JUDI', payload.message || '');
            return;
          }
          if (res.status === 401 || res.status === 403 || res.status === 419) {
            return openOrFocus(target);
          }
          await showLocal(
            payload.title || 'JUDI',
            payload.message || ('HTTP ' + res.status)
          );
          return openOrFocus(data.url || '/settings#settings-devices-pending');
        })
        .catch(() => openOrFocus(target))
    );
    return;
  }

  const url = data.url || '/settings';
  event.waitUntil(openOrFocus(url));
});
