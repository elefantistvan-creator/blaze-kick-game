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

// ------------------------------------------------------------------
// SZUPERÜTÉS (⚡ TAP) — nem ütőhang: robbanás.
// Mély dörrenés (leszálló szinusz) + fémes felharmonikus + rövid zajlökés.
// Azonnal felismerhető, és nem keverhető össze a sima passzal.
// ------------------------------------------------------------------
function soundPowerShot() {
  if (!audioCtx) return;
  try {
    var t = audioCtx.currentTime;

    // 1) Dörrenés: 180 Hz -> 45 Hz gyors lecsúszás
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.18);
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 0.22);

    // 2) Fémes felharmonikus: rövid, éles fűrészfog
    var o2 = audioCtx.createOscillator(), g2 = audioCtx.createGain();
    o2.type = 'sawtooth';
    o2.frequency.setValueAtTime(880, t);
    o2.frequency.exponentialRampToValueAtTime(220, t + 0.09);
    g2.gain.setValueAtTime(0.16, t);
    g2.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
    o2.connect(g2); g2.connect(audioCtx.destination);
    o2.start(t); o2.stop(t + 0.10);

    // 3) Zajlökés: az ütés "húsa"
    noiseBurst(0.06, 0.18, 1800);
  } catch (e) {}
}

// ------------------------------------------------------------------
// BÓNUSZLABDA FELVÉTELE (2P) — varázshang.
// Felfelé futó arpeggio + csillogó felharmonikusok. Nem gól, nem ütés:
// "megszereztél valamit". Rövid, örömteli, nem tolakodó.
// ------------------------------------------------------------------
function soundPickup() {
  if (!audioCtx) return;
  try {
    // Felfelé szaladó csillogás (C6-E6-G6-C7)
    var notes = [1047, 1319, 1568, 2093];
    for (var i = 0; i < notes.length; i++) {
      (function (f, i) {
        setTimeout(function () { playBeep(f, 'triangle', 0.11, 0.22); }, i * 55);
      })(notes[i], i);
    }
    // Fölé egy halk, magas "szikra"
    setTimeout(function () { playBeep(3136, 'sine', 0.22, 0.10); }, 190);
  } catch (e) {}
}

// Rövid szűrt zajlökés (ütés-textúrához)
function noiseBurst(dur, vol, cutoff) {
  if (!audioCtx) return;
  try {
    var t = audioCtx.currentTime;
    var n = Math.floor(audioCtx.sampleRate * dur);
    var buf = audioCtx.createBuffer(1, n, audioCtx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    var s = audioCtx.createBufferSource(); s.buffer = buf;
    var f = audioCtx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = cutoff || 1200;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(audioCtx.destination);
    s.start(t);
  } catch (e) {}
}

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

    // ------------------------------------------------------------------
    // A KÖZÖNSÉG MEGÉRKEZIK — a hang ugyanazt az ívet járja, mint a kép.
    //   1. csoport (S1-2):   senki. Se aláfestő, se gólöröm. Csak a labda.
    //   2. csoport (S3-4):   a falu. Nincs állandó zaj — de gólnál felkiáltanak.
    //   3. csoport (S5-7):   a város. Állandó zaj, és megjelenik a sípszó.
    //   4. csoport (S8-10):  a tömeg.
    // Az üres lista SZÁNDÉKOS: a csend is döntés.
    // ------------------------------------------------------------------
    ambience: {
      1: [],                                   // nincs közönség
      2: [],                                   // falu: csend a gólok között
      3: ['season5alaphang01.ogg'],
      4: ['season8alaphang01.ogg', 'season8alaphang02.ogg', 'season8alaphang03.ogg']
    },
    goal: {
      1: [],                                   // gólnál sem szól semmi
      2: ['season3gol01.ogg', 'season3gol02.ogg', 'season3gol03.ogg'],
      3: ['season5gol01.ogg',  'season5gol02.ogg',  'season5gol03.ogg'],
      4: ['season8gol01.ogg',  'season8gol02.ogg',  'season8gol03.ogg']
    },
    // Bírói sípszó a visszaszámlálás "3"-ánál. Season 5-től (3. és 4. csoport).
    whistle: {
      1: [], 2: [],
      3: ['sipszokezdes.ogg'],
      4: ['sipszokezdes.ogg']
    },
    paddle: { me: ['utohangsajat.ogg'], cpu: ['utohangellenfel.ogg'] }
  };

  // Season (1..10) -> hangcsoport (1..4). A season-tábla (js/seasons.js) az igazságforrás:
  //   Season 1-2 -> 1,  3-4 -> 2,  5-7 -> 3,  8-10 -> 4
  function groupForSeason(s) {
    if (typeof seasonSoundGroup === 'function') return seasonSoundGroup(s);
    return 1;
  }

  // ---- Aláfestő újraindítás: végigfut -> véletlen szünet -> random másik ----
  var GAP_MIN = 5000, GAP_MAX = 15000;   // ms

  // ---- Hangerők ----
  var VOL = { music: 0.55, ambience: 0.45, goal: 0.8, paddle: 0.5, intro: 0.7, whistle: 0.75 };
  //                                                          ^^^ 0.7 -> 0.5: az ütők hangosabbak voltak a többinél

  var pools = {};          // egyszerre szólható SFX-ekhez kis pool
  var musicEl = null;      // menü/intró zene
  var musicKey = null;     // 'menu' | 'intro' — hogy ne induljon feleslegesen újra
  var ambEl = null;        // meccs-aláfestő (külön, újrahasznált elem)
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
    // BUG VOLT: némítva is meghívta a szintetizált tartalékot -> a "hang ki"
    // beállítás mellett is szóltak az ütők. A némítás mostantól TELJES.
    if (!enabled) return;
    if (!unlocked) { if (fallback) fallback(); return; }
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

  function stopMusic() {          // csak a menü/intró zene
    musicKey = null;
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

  // ---- Meccs-aláfestő: KÜLÖN, újrahasznált elem (nem keveredik a menü-zenével) ----
  // Egyszer indul a meccs indításakor (gesztusból), majd 'ended' -> véletlen szünet -> újra.
  function ambStop() {
    ambGroup = 0;
    if (ambTimer) { clearTimeout(ambTimer); ambTimer = null; }
    if (ambEl) { try { ambEl.pause(); } catch (e) {} }
  }
  function ambPlay() {
    if (!enabled || !unlocked || !ambGroup) return;
    var src = pick(FILES.ambience[ambGroup]);
    if (!src) return;
    ambEl.src = DIR + src;
    ambEl.loop = false;
    ambEl.volume = VOL.ambience;
    try { ambEl.currentTime = 0; } catch (e) {}
    var p = ambEl.play(); if (p && p.catch) p.catch(function(){});
  }
  function ambNext() {   // az 'ended' hívja: véletlen szünet után újra
    if (!ambGroup) return;
    var gap = GAP_MIN + Math.random() * (GAP_MAX - GAP_MIN);
    ambTimer = setTimeout(function () { if (ambGroup) ambPlay(); }, gap);
  }
  function ambStart(group) {
    ambStop();
    ambGroup = group;
    if (!ambEl) { ambEl = new Audio(); ambEl.addEventListener('ended', ambNext); }
    ambPlay();
  }

  return {
    // Első felhasználói koppintás oldja fel a hangot (mobil autoplay-tiltás)
    unlock: function () {
      if (unlocked) return;
      unlocked = true;
      try { if (typeof initAudio === 'function') initAudio(); } catch (e) {}
    },
    setEnabled: function (v) { enabled = !!v; if (!enabled) { stopMusic(); ambStop(); } },
    isEnabled: function () { return enabled; },

    intro:     function () { playMusic('intro', pick(FILES.intro), VOL.intro, false); },
    menu:      function () { playMusic('menu',  pick(FILES.menu),  VOL.music, true); },
    stopMusic: stopMusic,

    // Meccs kezdetén: leáll a menü-zene, indul az adott season aláfestő-csoportja
    matchStart: function (season) { stopMusic(); ambStart(groupForSeason(season)); },
    matchStop:  ambStop,

    // Ütő: who = 'me' | 'cpu'  (fallback: szinti soundHit)
    paddle: function (who) {
      var arr = FILES.paddle[who === 'cpu' ? 'cpu' : 'me'];
      sfx(pick(arr), VOL.paddle, (typeof soundHit === 'function') ? soundHit : null);
    },
    // Gól: a FUTÓ meccs csoportjából (ambGroup), random változat, végigfut.
    // ÜRES LISTA = SZÁNDÉKOS CSEND (1. csoport). Ilyenkor a szintetizált
    // tartalék sem szólalhat meg — különben pont a csend veszne el.
    goal: function () {
      var arr = FILES.goal[ambGroup || 1];
      if (!arr || !arr.length) return;
      sfx(pick(arr), VOL.goal, null);
    },
    // 2P bónuszlabda felvétele: NEM gól, NEM ütés — saját varázshang (szintetizált).
    // Független a season-csoporttól: a csendes pályákon is nyugtázni kell a felvételt.
    pickup: function () {
      if (!enabled || !unlocked) return;
      if (typeof soundPickup === 'function') soundPickup();
    },

    // Szuperütés (⚡ TAP): saját robbanáshang, nem a passz-hang.
    powerShot: function () {
      if (!enabled || !unlocked) return;
      if (typeof soundPowerShot === 'function') soundPowerShot();
    },
    // Bírói sípszó a visszaszámlálás "3"-ánál. Csak ott szól, ahol van hozzá fájl
    // (a manifest szerint a 3. és 4. csoportban -> Season 6-tól).
    whistle: function () {
      var arr = FILES.whistle[ambGroup || 1];
      if (!arr || !arr.length) return;      // alsó seasonökben nincs síp — csendben marad
      sfx(pick(arr), VOL.whistle, null);
    }
  };
})();
