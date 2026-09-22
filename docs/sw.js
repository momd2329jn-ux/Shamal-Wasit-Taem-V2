// ======================================================
// sw.js - Service Worker
// فريق شمال واسط
// ======================================================

const CACHE_NAME = 'shamal-wasit-v22';

const APP_SHELL = [
  './',
  './index.html',
  './category.html',
  './admin.html',
  './articles.html',
  './events.html',
  './health.html',
  './environment.html',
  './news.html',
  './inquiry.html',
  './contact.html',
  './login.html',
  './register.html',
  './member.html',
  './privacy.html',

  './manifest.json',

  './css/style.css',

  './js/app.js',
  './js/admin.js',
  './js/category.js',
  './js/dashboard.js',
  './js/feeds.js',
  './js/firebase-config.js',
  './js/inquiry.js',
  './js/login.js',
  './js/member.js',
  './js/notifications.js',
  './js/permissions.js',
  './js/register.js',
  './js/site-categories-admin.js',
  './js/site-categories.js',
  './js/site-icons.js',

  './images/logo.png',
  './images/hero.jpg',
  './images/icon-192.png',
  './images/icon-512.png'
];


// ======================================================
// INSTALL
// ======================================================

self.addEventListener('install', function (event) {

  event.waitUntil(

    caches.open(CACHE_NAME)
      .then(function (cache) {

        return cache.addAll(APP_SHELL);

      })
      .then(function () {

        return self.skipWaiting();

      })

  );

});


// ======================================================
// ACTIVATE
// ======================================================

self.addEventListener('activate', function (event) {

  event.waitUntil(

    caches.keys()
      .then(function (keys) {

        return Promise.all(

          keys
            .filter(function (key) {

              return key !== CACHE_NAME;

            })
            .map(function (key) {

              return caches.delete(key);

            })

        );

      })
      .then(function () {

        return self.clients.claim();

      })

  );

});


// ======================================================
// FETCH
// ======================================================

self.addEventListener('fetch', function (event) {

  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(

    fetch(event.request)
      .then(function (response) {

        /*
         * نحفظ نسخة حديثة من الملفات المحلية.
         */

        if (
          response &&
          response.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {

          const copy = response.clone();

          caches.open(CACHE_NAME)
            .then(function (cache) {

              cache.put(event.request, copy)
                .catch(function () {});

            });

        }

        return response;

      })
      .catch(function () {

        /*
         * إذا ماكو إنترنت، نستخدم النسخة المخزنة.
         */

        return caches.match(event.request);

      })

  );

});


// ======================================================
// PUSH NOTIFICATIONS
// ======================================================

self.addEventListener('push', function (event) {

  let data = {
    title: 'فريق شمال واسط',
    body: 'لديك إشعار جديد'
  };

  try {

    data = event.data
      ? event.data.json()
      : data;

  } catch (e) {}


  event.waitUntil(

    self.registration.showNotification(

      data.title || 'فريق شمال واسط',

      {
        body: data.body || '',
        icon: 'images/icon-192.png',
        badge: 'images/icon-192.png',
        dir: 'rtl',
        lang: 'ar'
      }

    )

  );

});


// ======================================================
// NOTIFICATION CLICK
// ======================================================

self.addEventListener(
  'notificationclick',
  function (event) {

    event.notification.close();

    event.waitUntil(

      clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      })

      .then(function (list) {

        for (const client of list) {

          if ('focus' in client) {
            return client.focus();
          }

        }

        return clients.openWindow('./index.html');

      })

    );

  }
);
