// ======================================================
// sw.js - Service Worker
// فريق شمال واسط
// ======================================================

const CACHE_NAME = 'shamal-wasit-v21';

const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/feeds.js',
  './js/site-icons.js',
  './images/logo.png',
  './images/hero.jpg',
  './manifest.json'
];

self.addEventListener(
  'install',
  function (event) {

    event.waitUntil(

      caches
        .open(CACHE_NAME)

        .then(function (cache) {

          return cache.addAll(
            APP_SHELL
          );

        })

        .then(function () {

          return self.skipWaiting();

        })

    );

  }
);


self.addEventListener(
  'activate',
  function (event) {

    event.waitUntil(

      caches
        .keys()

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

  }
);


self.addEventListener(
  'fetch',
  function (event) {

    if (
      event.request.method !== 'GET'
    ) {
      return;
    }


    event.respondWith(

      caches
        .match(event.request)

        .then(function (cached) {

          return cached ||

            fetch(event.request)

              .then(function (response) {

                const copy =
                  response.clone();

                caches
                  .open(CACHE_NAME)
                  .then(function (cache) {

                    cache
                      .put(
                        event.request,
                        copy
                      )
                      .catch(function () {});

                  });

                return response;

              })

              .catch(function () {

                return cached;

              });

        })

    );

  }
);


self.addEventListener(
  'push',
  function (event) {

    let data = {
      title: 'فريق شمال واسط',
      body: 'لديك إشعار جديد'
    };


    try {

      data =
        event.data
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

  }
);


self.addEventListener(
  'notificationclick',
  function (event) {

    event.notification.close();

    event.waitUntil(

      clients
        .matchAll({
          type: 'window',
          includeUncontrolled: true
        })

        .then(function (list) {

          for (const client of list) {

            if ('focus' in client) {
              return client.focus();
            }

          }

          return clients.openWindow(
            './index.html'
          );

        })

    );

  }
);
