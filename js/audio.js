// --- Hang ---
var audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(freq, type, dur, vol) {
  if (!audioCtx) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol||0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

function soundHit()  { playBeep(280, 'square', 0.07, 0.22); }
function soundWall() { playBeep(160, 'sine', 0.05, 0.12); }
function soundGoal() {
  // Fanfár
  playBeep(523, 'sine', 0.12, 0.4);
  setTimeout(function(){ playBeep(659, 'sine', 0.12, 0.4); }, 100);
  setTimeout(function(){ playBeep(784, 'sine', 0.15, 0.4); }, 200);
  setTimeout(function(){ playBeep(1047,'sine', 0.30, 0.5); }, 320);
  // Közönség zaj - fehér zaj burst
  crowd();
}

function crowd() {
  if (!audioCtx) return;
  try {
    var bufSize = audioCtx.sampleRate * 1.2;
    var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i=0; i<bufSize; i++) data[i] = (Math.random()*2-1) * 0.15;
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    // Sávszűrő: 800-3000Hz = emberi hangra hasonlít
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.1);
    g.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.5);
    g.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 1.2);
    src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + 1.2);
  } catch(e) {}
}


/* ============================================================
   FÁJL-ALAPÚ HANGRENDSZER — előkészített váz (Blaze Kick)
   A hangfájlok az assets/audio/ mappába kerülnek (OGG).
   Amíg nincs fájl, a fenti szintetizált hangok szólnak (fallback).
   ============================================================ */
var Sound = (function () {
  var DIR = 'assets/audio/';
  var enabled = true;      // Settings -> Sound kapcsoló köti majd
  var unlocked = false;    // mobil autoplay: első koppintás oldja fel

  // ---- Fájl-manifeszt (csoportonként több változat is lehet) ----
  var FILES = {
    intro: ['intro.ogg'],
    menu:  ['menuhang2.ogg'],
    // 4 aláfestő-csoport. TESZT: egyelőre mind a Season 1 hangja.
    ambience: {
      1: ['stadionhang.ogg'],
      2: ['stadionhang.ogg'],
      3: ['stadionhang.ogg'],
      4: ['stadionhang.ogg']
    },
    // 4 gólöröm-csoport. TESZT: egyelőre mind ugyanaz.
    goal: {
      1: ['nagytaps2.ogg'],
      2: ['nagytaps2.ogg'],
      3: ['nagytaps2.ogg'],
      4: ['nagytaps2.ogg']
    },
    paddle: { me: ['passz2.ogg'], cpu: ['passz3.ogg'] }
  };

  // Season (1..10) -> csoport (1..4). Szabadon szerkeszthető.
  var SEASON_GROUP = [1, 1, 2, 2, 3, 3, 3, 4, 4, 4];
  function groupForSeason(s) {
    var i = Math.max(0, Math.min(9, (s | 0) - 1));
    return SEASON_GROUP[i] || 1;
  }

  // ---- Aláfestő újraindítás: végigfut -> véletlen szünet -> random másik ----
  var GAP_MIN = 5000, GAP_MAX = 15000;   // ms

  // ---- Hangerők ----
  var VOL = { music: 0.55, ambience: 0.45, goal: 0.8, paddle: 0.7, intro: 0.7 };

  var pools = {};          // egyszerre szólható SFX-ekhez kis pool
  var musicEl = null;      // aktuális zene/aláfestő elem
  var musicKey = null;     // 'menu' | 'intro' | 'match' — hogy ne induljon feleslegesen újra
  var ambTimer = null, ambGroup = 0;

  function has(src) { return true; } // (később: betöltés-ellenőrzés)

  function make(src, vol, loop) {
    var a = new Audio(DIR + src);
    a.preload = 'auto';
    a.volume = vol;
    a.loop = !!loop;
    return a;
  }

  function pick(arr) { return arr && arr.length ? arr[(Math.random() * arr.length) | 0] : null; }

  // Rövid SFX: pool-ból (átfedő lejátszás), fallback a szintire
  function sfx(src, vol, fallback) {
    if (!enabled || !unlocked) { if (fallback) fallback(); return; }
    if (!src) { if (fallback) fallback(); return; }
    try {
      pools[src] = pools[src] || [];
      var free = null;
      for (var i = 0; i < pools[src].length; i++) if (pools[src][i].paused) { free = pools[src][i]; break; }
      if (!free) { free = make(src, vol, false); if (pools[src].length < 4) pools[src].push(free); }
      free.currentTime = 0; free.volume = vol;
      var p = free.play(); if (p && p.catch) p.catch(function(){ if (fallback) fallback(); });
    } catch (e) { if (fallback) fallback(); }
  }

  function stopMusic() {
    if (ambTimer) { clearTimeout(ambTimer); ambTimer = null; }
    ambGroup = 0; musicKey = null;
    if (musicEl) { try { musicEl.pause(); } catch (e) {} musicEl = null; }
  }

  function playMusic(key, src, vol, loop) {
    // ha már ugyanaz szól, ne indítsuk újra (képernyőváltáskor ne akadjon)
    if (musicKey === key && musicEl && !musicEl.paused) return musicEl;
    stopMusic();
    if (!enabled || !unlocked || !src) return null;
    musicKey = key;
    musicEl = make(src, vol, loop);
    var p = musicEl.play(); if (p && p.catch) p.catch(function(){});
    return musicEl;
  }

  // Aláfestő ütemező: lejátszik egyet -> 'ended' -> véletlen szünet -> random másik
  function ambienceLoop(group) {
    if (!enabled || !unlocked) return;
    var src = pick(FILES.ambience[group]);
    if (!src) return;
    musicEl = make(src, VOL.ambience, false);
    musicEl.addEventListener('ended', function () {
      if (ambGroup !== group) return;
      var gap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
      ambTimer = setTimeout(function () { if (ambGroup === group) ambienceLoop(group); }, gap);
    });
    var p = musicEl.play(); if (p && p.catch) p.catch(function(){});
  }

  return {
    // Első felhasználói koppintás oldja fel a hangot (mobil autoplay-tiltás)
    unlock: function () {
      if (unlocked) return;
      unlocked = true;
      try { if (typeof initAudio === 'function') initAudio(); } catch (e) {}
    },
    setEnabled: function (v) { enabled = !!v; if (!enabled) stopMusic(); },
    isEnabled: function () { return enabled; },

    intro:     function () { playMusic('intro', pick(FILES.intro), VOL.intro, false); },
    menu:      function () { playMusic('menu',  pick(FILES.menu),  VOL.music, true); },
    stopMusic: stopMusic,

    // Meccs kezdetén: az adott season aláfestő-csoportja indul
    matchStart: function (season) { stopMusic(); ambGroup = groupForSeason(season); musicKey = 'match'; ambienceLoop(ambGroup); },
    matchStop:  stopMusic,

    // Ütő: who = 'me' | 'cpu'  (fallback: szinti soundHit)
    paddle: function (who) {
      var arr = FILES.paddle[who === 'cpu' ? 'cpu' : 'me'];
      sfx(pick(arr), VOL.paddle, (typeof soundHit === 'function') ? soundHit : null);
    },
    // Gól: a FUTÓ meccs csoportjából (ambGroup), random változat, végigfut
    goal: function () {
      var arr = FILES.goal[ambGroup || 1];
      sfx(pick(arr), VOL.goal, (typeof soundGoal === 'function') ? soundGoal : null);
    }
  };
})();
