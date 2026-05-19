// Mr.Pill-Tracker™ Service Worker — Push Notifications

self.addEventListener('push', event => {
  let data = { title: '💊 Pill Reminder', body: 'Time to take your medicines!', slot: '' };
  try { data = event.data.json(); } catch {}

  const options = {
    body: data.body,
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💊</text></svg>',
    badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💊</text></svg>',
    vibrate: [200, 100, 200, 100, 200],
    tag: 'pill-reminder-' + (data.slot || 'general'),
    renotify: true,
    requireInteraction: true,
    data: { url: self.registration.scope }
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(clients.claim()));
