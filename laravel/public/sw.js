/* JUDI service worker — background Web Push (Messenger-style when tab is closed). */
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'JUDI', body: '', url: '/settings' };
  try {
    if (event.data) {
      data = Object.assign(data, event.data.json());
    }
  } catch (e) {
    try {
      data.body = event.data ? event.data.text() : '';
    } catch (e2) {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title || 'JUDI', {
      body: data.body || '',
      icon: '/images/judi-logo.jpg?v=2',
      badge: '/images/judi-logo.jpg?v=2',
      data: { url: data.url || '/settings' },
      renotify: true,
      tag: 'judi-push',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/settings';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});
