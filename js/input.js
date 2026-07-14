function getTouchSide(clientX) {
  var lRect = lsav.getBoundingClientRect();
  var rRect = rsav.getBoundingClientRect();
  var mRect = document.getElementById('mid').getBoundingClientRect();
  if (clientX <= lRect.right || clientX < mRect.left + mRect.width * 0.45)
    return 'left';
  if (clientX >= rRect.left || clientX > mRect.left + mRect.width * 0.55)
    return 'right';
  return null;
}

function distToPad(padX, padY, halfH) {
  // Legközelebbi pont a téglalaphoz
  var cx = Math.max(padX-PW/2, Math.min(bx, padX+PW/2));
  var cy = Math.max(padY-halfH, Math.min(by, padY+halfH));
  return Math.sqrt((bx-cx)*(bx-cx)+(by-cy)*(by-cy));
}

var powerHitActive = false;
var prePowerHitVX = 0;  // power hit előtti sebesség

// A szuperütés a KÖZELI saját padot üti meg.
// 1P: bármelyik oldalon tapelhetsz (így a szabad ujjaddal, a húzás zavarása nélkül).
// 2P: mindenki a SAJÁT térfelén tapel.
function padNearBall(padX, padY, halfH) {
  return distToPad(padX, padY, halfH) < BR * 2.5;
}

function myPads(side) {
  // visszaadja a tapelő játékos padjait: {x,y,h,dir,tag}
  var out = [];
  if (!is2P) {   // 1P: a játékos kapusa + csatára (mindkettő jobbra üt)
    out.push({ x: px, y: py, h: szGoalieLeft(),  dir: 1, tag: 'p' });
    var sh = szStrikerLeft();
    if (sh > 0) out.push({ x: mx, y: my, h: sh, dir: 1, tag: 'm' });
  } else if (side === 'left') {   // 2P bal fél = 2. játékos
    out.push({ x: px, y: py, h: szGoalieLeft(),  dir: 1, tag: 'p' });
    var sh2 = szStrikerLeft();
    if (sh2 > 0) out.push({ x: mx, y: my, h: sh2, dir: 1, tag: 'm' });
  } else {                        // 2P jobb fél = 1. játékos (balra üt)
    out.push({ x: ax, y: ay, h: szGoalieRight(), dir: -1, tag: 'a' });
    var sh3 = szStrikerRight();
    if (sh3 > 0) out.push({ x: amx, y: amy, h: sh3, dir: -1, tag: 'am' });
  }
  return out;
}

function powerHitAvailable(side) {
  if (!running) return false;
  var pads = myPads(side);
  for (var i = 0; i < pads.length; i++) {
    if (pads[i].h > 0 && padNearBall(pads[i].x, pads[i].y, pads[i].h)) return true;
  }
  return false;
}

// ------------------------------------------------------------
// ⚡ SZUPERÜTÉS TÖLTŐIDŐ
//
// MIÉRT KELL: a gép kapusa a távolság 8%-ával közelít frame-enként —
// ez egy lassuló rááll, kb. 30-40 frame kell neki. A szuperütés 2,5x
// sebességgel indít, tehát 2,5x kevesebb frame marad neki. A SEBESSÉGÉT
// felhúzza a spdMult, de a REAKCIÓGÖRBÉJÉT nem. Ezért egy jól időzített
// tap gyakorlatilag mindig gól — a 90-es stage-en is.
//
// A töltőidő ERŐFORRÁSSÁ teszi azt, ami eddig eszköz volt: dönteni kell,
// mikor használod. A döntés az, amitől játék.
//
// Egy szám. Ha kevés, emeld; ha sok, csökkentsd.
// ------------------------------------------------------------
var POWER_COOLDOWN_MS = 20000;
var powerReadyAt = 0;                      // mikor lesz újra tölve (timestamp)

function powerCharge() {                   // 0..1 — a töltőcsíknak
  if (!running) return 1;
  var left = powerReadyAt - Date.now();
  if (left <= 0) return 1;
  return Math.max(0, 1 - left / POWER_COOLDOWN_MS);
}
function powerCharged() { return Date.now() >= powerReadyAt; }
function resetPowerCooldown() { powerReadyAt = 0; }     // meccs elején tölve indul

function doPowerHit(side) {
  if (!running) return;
  if (!powerCharged()) return;             // még tölt
  var pads = myPads(side), best = null, bestD = Infinity;
  for (var i = 0; i < pads.length; i++) {
    var p = pads[i];
    if (p.h <= 0) continue;
    var d = distToPad(p.x, p.y, p.h);
    if (d < BR * 2.5 && d < bestD) { bestD = d; best = p; }
  }
  if (!best) return;

  prePowerHitVX = bvx;
  prePowerHitSpeed = Math.sqrt(bvx*bvx + bvy*bvy);
  bvx = Math.abs(bvx) * 2.5 * best.dir;      // a pad oldala szabja az irányt
  powerHitActive = true;

  // BUG VOLT: a tap akkor is elsül, ha a labda ÉRINTI a pálcikát (d < BR*2.5).
  // Ilyenkor a következő frame-ben lefutott a bounceRect(), ami visszaállította
  // az eredeti sebességet, eloltotta a tűzcsóvát és megszólaltatta a sima
  // passz-hangot -> a szuperütés azonnal megsemmisült. Toljuk ki a labdát az
  // ütközési zónából, hogy tényleg elrepüljön.
  var clearX = PW/2 + BR + 1;
  if (Math.abs(bx - best.x) < clearX) bx = best.x + best.dir * clearX;

  powerReadyAt = Date.now() + POWER_COOLDOWN_MS;   // indul a töltés
  Sound.powerShot();          // saját felvétel (a régi 440 Hz-es bip KIVÉVE)
  Haptics.power();            // hármas, erős rezgés — ez a játék legerősebb pillanata
  fireTrailActive = true;
  spawnSparks(bx, by, bvx, bvy);
  triggerShake(8);
  hitEffect = { pad: best.tag, time: Date.now() };
}

// --- Pointer Events alapú vezérlés (touch + egér + touchpad + toll) ---
// Nyitva van-e bármelyik UI réteg? (akkor a pointer a UI-é, nem a játéké)
function uiBlocking() {
  if (typeof Screens !== 'undefined' && Screens.anyOpen()) return true;
  var ids = ['howToOverlay','pauseOverlay'];
  for (var i=0;i<ids.length;i++) {
    var e = document.getElementById(ids[i]);
    if (e && e.style.display && e.style.display !== 'none') return true;
  }
  return false;
}

console.log('%cBlaze Kick build: MODULAR-V43', 'color:#ff6600;font-weight:bold');
document.addEventListener('pointerdown', function(e) {
  // Input mezőnél, gombnál, mp overlay-nél és a leírás panelnél ne akadályozzuk meg az alapértelmezett viselkedést
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || uiBlocking()) return;
  e.preventDefault();
  var side = getTouchSide(e.clientX);
  if (side==='left'  && touchLeft===null)  {
    touchLeft=e.pointerId;  lastLeftY=e.clientY;
    touchStartTimes[e.pointerId] = Date.now();
    touchStartY[e.pointerId] = e.clientY;
    lastLeftVY = 0;
  }
  if (side==='right' && touchRight===null) {
    touchRight=e.pointerId; lastRightY=e.clientY;
    touchStartTimes[e.pointerId] = Date.now();
    touchStartY[e.pointerId] = e.clientY;
    lastRightVY = 0;
  }
});

document.addEventListener('pointermove', function(e) {
  if (e.target.tagName === 'INPUT' || uiBlocking()) return;
  if (e.pointerId===touchLeft && lastLeftY!==null) {
    e.preventDefault();
    var d = (e.clientY - lastLeftY) * dragScale();
    lastLeftVY = e.clientY - lastLeftY;  // csavar sebessége
    if (is2P) {
      // Bal fél = 2. játékos: kapus (py, bal szél) + csatár (my) EGYÜTT
      var lo = MR;
      var sd2 = d * slowP2();
      py = Math.max(PLY+lo, Math.min(PLY+PLH-lo, py + sd2));
      my = Math.max(PLY+lo, Math.min(PLY+PLH-lo, my + sd2));
    } else {
      py += d;
      var _pr = effPR();
      py = Math.max(PLY+_pr, Math.min(PLY+PLH-_pr, py));
    }
    lastLeftY = e.clientY;
  }
  if (e.pointerId===touchRight && lastRightY!==null) {
    e.preventDefault();
    var d = (e.clientY - lastRightY) * dragScale();
    lastRightVY = e.clientY - lastRightY;  // csavar sebessége
    if (is2P) {
      // Jobb fél = 1. játékos: kapus (ay, jobb szél) + csatár (amy) EGYÜTT
      var ro = MR;
      var sd1 = d * slowP1();
      ay  = Math.max(PLY+ro, Math.min(PLY+PLH-ro, ay  + sd1));
      amy = Math.max(PLY+ro, Math.min(PLY+PLH-ro, amy + sd1));
    } else {
      my += d;
      var _mr = effMR();
      my = Math.max(PLY+_mr, Math.min(PLY+PLH-_mr, my));
    }
    lastRightY = e.clientY;
  }
});

function releasePointer(e, withTap) {
  if (withTap) {
    // Koppintás detektálás
    var elapsed = Date.now() - (touchStartTimes[e.pointerId] || 0);
    var moved = Math.abs(e.clientY - (touchStartY[e.pointerId] || e.clientY));
    if (elapsed < TAP_MAX_MS && moved < TAP_MAX_MOVE) {
      // Tap volt - erős ütés ha labda közel
      if (e.pointerId === touchLeft)  doPowerHit('left');
      if (e.pointerId === touchRight) doPowerHit('right');
    }
  }
  if (e.pointerId===touchLeft)  { touchLeft=null;  lastLeftY=null;  lastLeftVY=0; }
  if (e.pointerId===touchRight) { touchRight=null; lastRightY=null; lastRightVY=0; }
  delete touchStartTimes[e.pointerId];
  delete touchStartY[e.pointerId];
}

document.addEventListener('pointerup', function(e) {
  releasePointer(e, true);
});

// Megszakadt pointer (pl. rendszer elveszi a fókuszt) - ütő elengedése tap nélkül
document.addEventListener('pointercancel', function(e) {
  releasePointer(e, false);
});

/* --- Tap-jelzés: megmutatja, HOL kell koppintani a szuperütéshez ---
   1P: a SZABAD oldalon (amit épp nem húzol) -> a húzás nem zavarodik meg.
   2P: mindenki a saját térfelén. */
// ------------------------------------------------------------
// CSÚSZKA-ÉRZÉKENYSÉG (Settings, 1-5, alap = 3)
// Az ujjmozgást skálázza, NEM a pálcika sebességkorlátját.
// Szűk tartomány (±30%): elég, hogy megérezd, kevés ahhoz,
// hogy elrontsa a nehézségi balanszot (az AI sebessége fix).
// ------------------------------------------------------------
var DRAG_BASE  = 1.5;                                 // az eredeti szorzó
var SENS_STEPS = [0.7, 0.85, 1.0, 1.15, 1.3];         // 1..5
var sensLevel  = 3;
try {
  var _sv = parseInt(localStorage.getItem('bk_sens'), 10);
  if (_sv >= 1 && _sv <= 5) sensLevel = _sv;
} catch (e) {}

function dragScale()      { return DRAG_BASE * SENS_STEPS[sensLevel - 1]; }
function getSensLevel()   { return sensLevel; }
function setSensLevel(v) {
  sensLevel = Math.max(1, Math.min(5, v | 0));
  try { localStorage.setItem('bk_sens', String(sensLevel)); } catch (e) {}
}

var _hintL = null, _hintR = null, _barL = null, _barR = null;
function updateTapHints() {
  if (_hintL === null) {
    _hintL = document.getElementById('tapHintL');
    _hintR = document.getElementById('tapHintR');
  }
  if (!_hintL || !_hintR) return;

  // Meccsen kívül teljesen eltűnik; meccs közben MINDIG ott van
  // (szürkén, ha nem lehet tapelni — így tudod, hogy létezik).
  var inMatch = running && !uiBlocking();
  _hintL.classList.toggle('hidden', !inMatch);
  _hintR.classList.toggle('hidden', !inMatch);

  var showL = false, showR = false;
  var charged = powerCharged();
  if (inMatch && charged) {                 // csak feltöltve ajánljuk
    if (!is2P) {
      if (powerHitAvailable()) {
        if (touchLeft !== null)       showR = true;
        else if (touchRight !== null) showL = true;
        else { showL = true; showR = true; }
      }
    } else {
      showL = powerHitAvailable('left');
      showR = powerHitAvailable('right');
    }
  }
  _hintL.classList.toggle('on', showL);
  _hintR.classList.toggle('on', showR);

  // TÖLTŐCSÍK: sárgán telik, teljesnél izzik. A ⚡ csak akkor gyullad
  // narancsra, ha teljes ÉS a labda közel van.
  var ch = powerCharge();
  _hintL.classList.toggle('charged', charged);
  _hintR.classList.toggle('charged', charged);
  if (_barL === null) {
    _barL = document.getElementById('tapBarL');
    _barR = document.getElementById('tapBarR');
  }
  var pct = (ch * 100).toFixed(0) + '%';
  if (_barL && _barL.style.width !== pct) _barL.style.width = pct;
  if (_barR && _barR.style.width !== pct) _barR.style.width = pct;
}

