// ======================================================
// sw.js - Service Worker
// فريق شمال واسط
// ======================================================

const CACHE_NAME = 'shamal-wasit-v20';

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/feeds.js',
  './images/logo.png',
  './images/hero.jpg',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});

self.addEventListener('push', event => {
  let data = { title: 'فريق شمال واسط', body: 'لديك إشعار جديد' };
  try {
    data = event.data ? event.data.json() : data;
  } catch (e) {}

  event.waitUntil(
    self.registration.showNotification(data.title || 'فريق شمال واسط', {
      body: data.body || '',
      icon: 'images/icon-192.png',
      badge: 'images/icon-192.png',
      dir: 'rtl',
      lang: 'ar'
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      return clients.openWindow('./index.html');
    })
  );
});
