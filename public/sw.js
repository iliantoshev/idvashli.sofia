// Service worker: показва известията. Не кешира нищо, за да виждаш винаги последната версия.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Идваш ли?', {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    lang: 'bg',
    data: { url: d.url || '/app.html' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || '/app.html', self.location.origin);
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if (new URL(c.url).pathname === url.pathname && 'focus' in c) return c.focus();
    }
    return self.clients.openWindow(url.href);
  }));
});
