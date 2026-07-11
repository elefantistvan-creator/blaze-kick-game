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
  var cover = document.getElementById('fadeCover');
  if (vid) { try { vid.pause(); } catch(e) {} }

  // 1) gyors elsötétedés feketére (az intró VÉGIG átlátszatlan marad,
  //    a fekete réteg úszik rá -> a pálya-canvas sosem bukkan elő)
  if (cover) cover.style.opacity = '1';

  // 2) a teljesen fekete pillanatban: intró el, menü be (a csere fekete alatt)
  setTimeout(function() {
    if (intro) intro.style.display = 'none';
    if (typeof Screens !== 'undefined') Screens.show('menu');
    // 3) a fekete visszahalványul -> a menü tűnik elő
    if (cover) cover.style.opacity = '0';
  }, 300);
}
