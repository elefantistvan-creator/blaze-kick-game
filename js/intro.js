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

  var shown = false;
  function showButton() {
    if (shown) return;
    shown = true;
    intro.classList.add('ready');       // az egész intro kattinthatóvá válik
    var hint = document.getElementById('playHint');
    if (hint) hint.classList.add('ready');
  }

  if (!vid) { showButton(); return; }

  vid.addEventListener('ended', showButton);
  vid.addEventListener('error', showButton);
  // Biztonsági háló: lassú hálózaton se ragadjon be az intro
  setTimeout(showButton, 5200);
  // Ha a lejátszás a végéhez közelít, már mutassuk a gombot (ended elmaradhat)
  vid.addEventListener('timeupdate', function() {
    if (vid.duration && vid.currentTime >= vid.duration - 0.15) showButton();
  });

  // Bárhova koppintva belépünk — a videót nem kötelező végignézni.
  intro.addEventListener('pointerup', function() { startIntroExit(); });

  if (typeof vid.play !== 'function') { showButton(); return; }
  var p = vid.play();
  if (p && p.catch) p.catch(showButton);   // autoplay tiltva -> gomb azonnal
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
