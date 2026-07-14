// Blaze Kick Service Worker - v2 (modularizált verzió)
// FONTOS: minden deploy előtt növeld a verziószámot!
var CACHE = 'blazekick-v64';

var ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/ui.css',
  './js/early.js',
  './js/intro.js',
  './js/audio.js',
  './js/haptics.js',
  './js/progress.js',
  './js/difficulty.js',
  './js/skins.js',
  './js/profile.js',
  './js/state.js',
  './js/seasons.js',
  './js/shop.js',
  './js/twoplayer.js',
  './js/effects.js',
  './js/core.js',
  './js/input.js',
  './js/ai.js',
  './js/physics.js',
  './js/render.js',
  './js/effects2.js',
  './js/helpers.js',
  './js/screens.js',
  './js/main.js',
  './assets/intro.mp4',
  './assets/intro-poster.jpg',
  './assets/menu-bg.jpg',
  './assets/btn-ice.png',
  './assets/btn-fire.png',
  './assets/logo.png',
  './assets/coin.svg',
  './assets/pitches/season1.jpg',
  './assets/pitches/season2.jpg',
  './assets/pitches/season3.jpg',
  './assets/pitches/season4.jpg',
  './assets/pitches/season5.jpg',
  './assets/pitches/season6.jpg',
  './assets/pitches/season7.jpg',
  './assets/pitches/season8.jpg',
  './assets/pitches/season9.jpg',
  './assets/pitches/season10.jpg',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',

  // --- Hang: a közönség megérkezik (1. csoport = csend, nincs fájl) ---
  './assets/audio/intro.ogg',
  './assets/audio/menuhang2.ogg',
  './assets/audio/season3gol01.ogg',
  './assets/audio/season3gol02.ogg',
  './assets/audio/season3gol03.ogg',
  './assets/audio/season5alaphang01.ogg',
  './assets/audio/season5gol01.ogg',
  './assets/audio/season5gol02.ogg',
  './assets/audio/season5gol03.ogg',
  './assets/audio/season8alaphang01.ogg',
  './assets/audio/season8alaphang02.ogg',
  './assets/audio/season8alaphang03.ogg',
  './assets/audio/season8gol01.ogg',
  './assets/audio/season8gol02.ogg',
  './assets/audio/season8gol03.ogg',
  './assets/audio/sipszokezdes.ogg',
  './assets/audio/utohangellenfel.ogg',
  './assets/audio/utohangsajat.ogg',
  './assets/audio/utohangszuper.ogg'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) {
      // cache:'reload' -> a böngésző HTTP-gyorsítótárának megkerülése,
      // így mindig FRISS bájtokat teszünk a cache-be, nem a régieket.
      // (Ez volt a beragadt régi kép/gomb oka.)
      return Promise.all(ASSETS.map(function(u) {
        return fetch(new Request(u, { cache: 'reload' }))
          .then(function(resp) {
            if (resp && (resp.ok || resp.type === 'opaque')) { return c.put(u, resp); }
          })
          .catch(function() { /* egy hiányzó asset ne buktassa el a telepítést */ });
      }));
    })
  );
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
        if (resp && resp.status === 200 && e.request.method === 'GET') {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function() { return caches.match(e.request); })
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request).then(function(resp) {
          // Csak teljes (200) GET válaszokat cache-elünk. A videó Range-kérése
          // 206-ot ad vissza, azt a Cache API nem engedi put-olni -> kihagyjuk.
          if (resp && resp.status === 200 && e.request.method === 'GET') {
            var copy = resp.clone();
            caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
          }
          return resp;
        });
      })
    );
  }
});
