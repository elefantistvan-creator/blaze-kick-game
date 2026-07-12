/* ============================================================
   SEASON-TÁBLA — a 10 season arculata egy helyen.

   pitch : a pályakép (assets/pitches/)
   frame : hol van a JÁTÉKFELÜLET a képen belül, arányosan
           [GL, GR, GT, GB] = bal, jobb, felső, alsó él (0..1)
           A játéktér geometriája FIX — ehhez igazítjuk a képet.
           Ha egy pálya elcsúszva jelenik meg, CSAK ezt a 4 számot kell állítani.
   sound : hangcsoport (1..4) — aláfestő, gólöröm, sípszó
           1 = utcai/poros (kevés néző)   2 = amatőr/városi
           3 = komolyabb pálya (sípszó!)  4 = aréna, teltház (sípszó!)

   A season-ív (István): 1-2 elhanyagolt stadion + újjáépítés,
   3 = a pofon (falu), 4-7 = visszakapaszkodás, 8-10 = beteljesülés.
   ============================================================ */
var SEASONS = [
  { pitch: 'season1.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 1 },  // elhanyagolt stadion
  { pitch: 'season2.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 1 },  // újjáépítve, fából
  { pitch: 'season3.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 2 },  // falu — a pofon
  { pitch: 'season4.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 2 },  // már nem falu
  { pitch: 'season5.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 2 },  // város, romos
  { pitch: 'season6.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 3 },  // jobb városi (sípszó!)
  { pitch: 'season7.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 3 },  // jó kis edzőpálya
  { pitch: 'season8.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 4 },  // sportcsarnok
  { pitch: 'season9.jpg',  frame: [0.126, 0.876, 0.123, 0.869], sound: 4 },  // aréna
  { pitch: 'season10.jpg', frame: [0.126, 0.876, 0.123, 0.869], sound: 4 }   // beteljesülés
];

var PITCH_DIR = 'assets/pitches/';

function seasonData(s) {
  var i = Math.max(0, Math.min(SEASONS.length - 1, (s | 0) - 1));
  return SEASONS[i];
}

function seasonPitchSrc(s) { return PITCH_DIR + seasonData(s).pitch; }
function seasonSoundGroup(s) { return seasonData(s).sound; }

/* A meccs pályaképének betöltése + a keret-igazítás beállítása.
   A PITCH_G* értékeket a render.js használja (a képet a fix játéktérre feszíti). */
function loadSeasonPitch(s) {
  var d = seasonData(s);
  PITCH_GL = d.frame[0];
  PITCH_GR = d.frame[1];
  PITCH_GT = d.frame[2];
  PITCH_GB = d.frame[3];
  var src = PITCH_DIR + d.pitch;
  if (pitchImg.getAttribute('data-src') === src) return;   // már ez van betöltve
  pitchImgReady = false;
  pitchImg.setAttribute('data-src', src);
  pitchImg.src = src;
}
