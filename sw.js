// Blaze Kick Service Worker - v2 (modularizált verzió)
// FONTOS: minden deploy előtt növeld a verziószámot!
var CACHE = 'blazekick-v6';

var ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './js/early.js',
  './js/intro.js',
  './js/multiplayer.js',
  './js/audio.js',
  './js/state.js',
  './js/effects.js',
  './js/core.js',
  './js/input.js',
  './js/ai.js',
  './js/bonus.js',
  './js/physics.js',
  './js/render.js',
  './js/effects2.js',
  './js/helpers.js',
  './js/main.js',
  './assets/logo.png',
  './assets/play.png',
  './assets/pitch1.jpg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', function(e) {
  e.waitUntil(caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});

// Régi cache verziók törlése aktiváláskor
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; })
        .map(function(k) { return caches.delete(k); }));
    }).then(function() { return clients.claim(); })
  );
});

// index.html: network-first (friss verzió elsőbbsége), minden más: cache-first
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  var isIndex = e.request.mode === 'navigate' || url.pathname.endsWith('/index.html');
  if (isIndex) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        var copy = resp.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        return resp;
      }).catch(function() { return caches.match(e.request); })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(resp) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          return resp;
        });
      })
    );
  }
});
