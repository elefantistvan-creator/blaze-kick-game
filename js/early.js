// Blaze Kick - korai inicializálás
// A manifest.json és sw.js mostantól VALÓDI fájlok a repóban (nem inline blob),
// mert a Play Store-os TWA csomag (com.blazestudio.blazekick) ezekre épül.

// Landscape zárolás (ahol a böngésző engedi)
if (screen.orientation && screen.orientation.lock) {
  screen.orientation.lock('landscape').catch(function(){});
}

// Service Worker regisztráció - a repóban lévő sw.js fájlt használja
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function(err) {
      console.warn('SW regisztráció sikertelen:', err);
    });
  });
}
