var CACHE = 'blazekick-v1';
self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(['./', './index.html']); }));
  self.skipWaiting();
});
self.addEventListener('activate', function(e) {
  e.waitUntil(clients.claim());
});
self.addEventListener('fetch', function(e) {
  e.respondWith(caches.match(e.request).then(function(r) {
    return r || fetch(e.request);
  }));
});
