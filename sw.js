/* Automation247 service worker - makes the site installable and readable offline.
   Update-safe on purpose: the page is always fetched fresh from the network when
   there is a connection (network first), so a new push shows up straight away.
   The saved copy is only used when the network fails. Bump VERSION to clear old caches. */
var VERSION = 'a247-v1';
var CORE = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/favicon.svg', '/apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;                                  /* forms etc. go straight through */
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                    /* fonts, FormSubmit, Zoho: untouched */

  if (req.mode === 'navigate') {
    /* the page: network first, saved copy only when offline */
    e.respondWith(fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put('/', copy); });
      return res;
    }).catch(function () { return caches.match('/'); }));
    return;
  }
  /* icons and other small files: network first too, falling back to the cache */
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () { return caches.match(req); }));
});
