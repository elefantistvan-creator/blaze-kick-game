var c = document.getElementById('c');
var ctx = c.getContext('2d');
var s1El = document.getElementById('s1');
var s2El = document.getElementById('s2');

// --- INTRO ANIMÁCIÓ ---

// ============================================================
// INTRO — videó (assets/intro.mp4), némán, automatikusan indul.
// A PLAY gomb a videó végén (vagy koppintásra) jelenik meg.
// ============================================================
(function() {
  var intro = document.getElementById('intro');
  var vid   = document.getElementById('introVideo');
  if (!intro) return;

  var done = false;
  function enterMenu() {
    if (done) return;
    done = true;
    startIntroExit();          // a videó végén (vagy koppintásra) egyből a menübe
  }

  if (!vid) { enterMenu(); return; }

  vid.addEventListener('ended', enterMenu);
  vid.addEventListener('error', enterMenu);
  setTimeout(enterMenu, 6000);                    // biztonsági háló
  vid.addEventListener('timeupdate', function() { // a vége elmaradhat -> figyeljük
    if (vid.duration && vid.currentTime >= vid.duration - 0.1) enterMenu();
  });

  // Koppintás bárhol = azonnali belépés (nem kötelező végignézni)
  intro.addEventListener('pointerup', enterMenu);

  if (typeof vid.play !== 'function') { enterMenu(); return; }
  var p = vid.play();
  if (p && p.catch) p.catch(enterMenu);   // autoplay tiltva -> egyből a menübe
})();

function startIntroExit() {
  var intro = document.getElementById('intro');
  var vid   = document.getElementById('introVideo');
  if (vid) { try { vid.pause(); } catch(e) {} }
  intro.style.transition = 'opacity 0.5s';
  intro.style.opacity = '0';
  setTimeout(function(){
    intro.style.display = 'none';
    if (typeof Screens !== 'undefined') Screens.show('menu');
  }, 500);
}
