// ============================================================
// SHOP — vásárolható power-upok + érme-gazdaság
// A régi véletlen bónusz-labda MEGSZŰNT (lásd a fájl alján a régi
// power-rendszer inert csonkjait — a kód többi része még hivatkozik rájuk).
//
// Szabályok:
//   - Egy bónusz a KÖVETKEZŐ GÓLIG él, legfeljebb 30 másodpercig
//   - Meccsenként legfeljebb 3 aktiválás
//   - Az érme Stage módban jár; gyors meccsben nincs se érme, se bónusz
// ============================================================

var SHOP_ITEMS = [
  // --------------------------------------------------------
  // ÁRAZÁSI ELV:  ár = hány meccs munkája.  (Átlag bevétel: ~49 érme/meccs)
  //   15      = 1/3 meccs  -> egy ESÉLY (nem gól)
  //   25-45   = ~1 meccs   -> egy GÓL
  //   120     = ~2,5 meccs -> egy MEGNYERT MECCS (tier:'pro' -> teljes meccsre szól)
  // Skill-kedvezmény: amihez időzítés kell, olcsóbb (Freeze 35 < Remove keeper 45).
  // Támadás > védekezés: a gól előrevisz, a védés csak megakadályoz.
  // --------------------------------------------------------

  // --- Esély (15) -------------------------------------------------
  { id:'heavyBall',    price:15,  tier:'cheap',  icon:'🧊', name:'Heavy ball',
    desc:'The ball moves 25% slower.' },
  { id:'bigStriker',   price:15,  tier:'cheap',  icon:'📏', name:'Big striker',
    desc:'Your striker is 50% larger.' },

  // --- Védekezés (25-30) ------------------------------------------
  { id:'bigGoalie',    price:25,  tier:'mid',    icon:'🧤', name:'Big keeper',
    desc:'Your keeper is 50% larger.' },
  { id:'noCpuStriker', price:30,  tier:'mid',    icon:'🚷', name:'Remove their striker',
    desc:'Their striker leaves the pitch.' },

  // --- Gól (35-45) ------------------------------------------------
  { id:'freeze',       price:35,  tier:'mid',    icon:'❄️', name:'Freeze',
    desc:'Their paddles freeze solid for 3 seconds. Time it well.',
    dur:3000 },                                    // FIX idő, nem gólig
  { id:'slowCpu',      price:40,  tier:'mid',    icon:'🐢', name:'Slow opponent',
    desc:'Their paddles move at half speed.' },
  { id:'noCpuGoalie',  price:45,  tier:'mid',    icon:'🚫', name:'Remove their keeper',
    desc:'Their keeper leaves the pitch.' },

  // --- Meccs (120) — a beragadt játékos kiútja ---------------------
  { id:'autoStriker',  price:120, tier:'pro',    icon:'🎯', name:'Auto striker',
    desc:'Your striker aims itself — and their keeper cannot stop it. Whole match.' },
  { id:'autoGoalie',   price:120, tier:'pro',    icon:'🛡️', name:'Auto keeper',
    desc:'Your keeper plays itself — flawlessly. Whole match.' },

  // --- Gazdaság (20) — NEM aktiválható, nem foglal a 3-as keretből --
  { id:'doubleCoins',  price:20,  tier:'econ',   icon:'💰', name:'Double coins',
    desc:'Your next WIN pays double. Kept if you lose.' }
];

// Csomagok: 1x teljes ár, 3x -10%, 5x -16%
var SHOP_PACKS = [
  { qty:1, discount:0.00 },
  { qty:3, discount:0.10 },
  { qty:5, discount:0.16 }
];

function packPrice(price, pack) {
  return Math.round(price * pack.qty * (1 - pack.discount));
}
function shopItem(id) {
  for (var i=0;i<SHOP_ITEMS.length;i++) if (SHOP_ITEMS[i].id === id) return SHOP_ITEMS[i];
  return null;
}

// ---------- Érme-gazdaság ----------
var ECON = {
  WIN_BASE:        10,
  PER_STAR:         5,
  SEASON_STEP:    0.10,   // +10% szezononként
  FIRST_CLEAR:     20,    // egyszeri, az első teljesítésért
  REPEAT_FACTOR:  0.5,    // ismételt győzelem fele annyit ér
  LOSS:             2,
  WELCOME:         50     // egyszeri nyitóajándék az első Shop-látogatáskor
};

function coinsForMatch(won, stage, stars, firstClear) {
  if (!won) return ECON.LOSS;
  var base = ECON.WIN_BASE + ECON.PER_STAR * stars;
  var mult = 1 + ECON.SEASON_STEP * (seasonOf(stage) - 1);
  var total = base * mult;
  if (firstClear) total += ECON.FIRST_CLEAR;
  else            total *= ECON.REPEAT_FACTOR;
  return Math.round(total);
}

// ---------- Shop állapot ----------
var Shop = (function() {
  var MAX_ACTIVATIONS = 3;
  var DURATION_MS     = 30000;   // alap: 30 mp plafon, de gólig él

  var active = {};        // id -> lejárati időbélyeg
  var used   = 0;         // meccsenkénti aktiválások

  function reset() { active = {}; used = 0; }

  // Meddig él egy hatás?
  //   dur megadva (Freeze)   -> pontosan annyi ideig
  //   tier 'pro'             -> A TELJES MECCSRE (2,5 meccs munkája = 1 megnyert meccs)
  //   egyébként              -> a következő gólig, max 30 mp
  function durationOf(it) {
    if (!it) return DURATION_MS;
    if (it.dur) return it.dur;
    if (it.tier === 'pro') return Infinity;
    return DURATION_MS;
  }

  function isActive(id) {
    var until = active[id];
    if (!until) return false;
    if (Date.now() > until) { delete active[id]; return false; }
    return true;
  }

  function anyActive() {
    for (var k in active) if (isActive(k)) return true;
    return false;
  }

  function timeLeft(id) {
    if (!isActive(id)) return 0;
    return Math.max(0, Math.ceil((active[id] - Date.now())/1000));
  }

  // Gólnál minden hatás megszűnik — KIVÉVE a pro tier (az a teljes meccsre szól).
  function onGoal() {
    for (var id in active) {
      var it = shopItem(id);
      if (it && it.tier === 'pro') continue;
      delete active[id];
    }
  }

  function canActivate(id) {
    if (bkMode !== 'stage') return false;
    var it = shopItem(id);
    if (!it || it.tier === 'econ') return false;   // a Double coins nem meccs közbeni bónusz
    if (used >= MAX_ACTIVATIONS) return false;
    if (isActive(id)) return false;
    return Progress.invCount(id) > 0;
  }

  function activate(id) {
    if (!canActivate(id)) return false;
    var it = shopItem(id);
    Progress.useInv(id);
    active[id] = Date.now() + durationOf(it);
    used++;
    return true;
  }

  function buy(id, qty) {
    var it = shopItem(id);
    if (!it) return false;
    var pack = null;
    for (var i=0;i<SHOP_PACKS.length;i++) if (SHOP_PACKS[i].qty === qty) pack = SHOP_PACKS[i];
    if (!pack) return false;
    var cost = packPrice(it.price, pack);
    if (Progress.coins() < cost) return false;
    Progress.addCoins(-cost);
    Progress.addInv(id, qty);
    return true;
  }

  return {
    reset: reset, isActive: isActive, anyActive: anyActive, timeLeft: timeLeft,
    onGoal: onGoal, activate: activate, canActivate: canActivate, buy: buy,
    used: function(){ return used; },
    maxActivations: MAX_ACTIVATIONS,
    duration: DURATION_MS
  };
})();

// ---------- Hatás-segédek (a fizika / rajz / AI innen kérdez) ----------
function effPR()  { return Shop.isActive('bigGoalie')  ? PR * 1.5 : PR; }   // játékos kapus
function effMR()  { return Shop.isActive('bigStriker') ? MR * 1.5 : MR; }   // játékos csatár
function cpuGoalieGone()  { return Shop.isActive('noCpuGoalie'); }
function cpuStrikerGone() { return Shop.isActive('noCpuStriker'); }
// Freeze = teljes megállás (0), Slow opponent = fél sebesség.
// A Freeze erősebb, ezért 3 mp-ig él, míg a Slow a következő gólig.
function cpuSlowFactor()  {
  if (Shop.isActive('freeze')) return 0;
  return Shop.isActive('slowCpu') ? 0.5 : 1.0;
}
function cpuFrozen()      { return Shop.isActive('freeze'); }          // rajzoláshoz
function ballSlowFactor() { return Shop.isActive('heavyBall') ? 0.75 : 1.0; }

// ------------------------------------------------------------------
// AUTO CSATÁR (120 érme, pro tier) — a "megállíthatatlan lövés".
//
// MIÉRT NEM ELÉG A CÉLZÁS:
//   A gép kapusa a labda repülési ideje alatt a kapunyílás KÉTSZERESÉT
//   is befutja (408 px vs 216 px), és a késői stage-eken nulla hibával
//   jelzi előre a becsapódást. Bármelyik sarkot eléri. Ráadásul a
//   sebessége a labdáéval EGYÜTT skálázódik (spdMult), így a rally-
//   gyorsítás sem segít. Geometriával megverhetetlen.
//   -> Két hibátlan rendszer fixpontot talált: örök vízszintes passzolgatás.
//
// A MEGOLDÁS: a lövés ÁTMEGY a kapuson. Ez az autoGoalie tükörképe —
//   az "nem kaphatsz gólt", ez "nem állíthatnak meg". A gép CSATÁRA
//   viszont még blokkolhat középen, tehát nem instant gól.
// ------------------------------------------------------------------
var autoShotActive = false;      // a labdát épp az auto-csatár lőtte el?

// A kívánt kimeneti szög (radián), vagy null, ha nincs aktív auto-csatár.
// A szöget a labda VALÓS becsapódási pontjából (by) számoljuk, nem a
// pálcika közepéből (my) — az volt a régi kód másik hibája.
function autoStrikerAim() {
  if (!Shop.isActive('autoStriker')) return null;

  var goalX = PLX + PLW;
  var topY  = GY + BR*2, botY = GY + GH - BR*2;
  var midY  = GY + GH/2;

  var targetY;
  if (cpuGoalieGone()) {
    targetY = midY;                                    // nincs kapus: középre
  } else {
    targetY = (ay < midY) ? botY : topY;               // a kapus TÚLOLDALÁRA
    // ...de kerüljük ki a gép CSATÁRÁT is: ha az útban áll, a másik sarok
    var dist = Math.abs(goalX - bx) > 1 ? (amx - bx) / (goalX - bx) : 0;
    var atStriker = by + (targetY - by) * Math.max(0, Math.min(1, dist));
    if (Math.abs(atStriker - amy) < effAMR()) {
      targetY = (targetY === botY) ? topY : botY;
    }
  }

  var ang  = Math.atan2(targetY - by, Math.max(1, goalX - bx));
  var maxA = MAX_BOUNCE_ANGLE_DEG * Math.PI / 180;

  // FIXPONT-GARANCIA: a lövés SOHA nem lehet vízszintes.
  // Vízszintes labdánál két hibátlan rendszer örökre passzolgatna
  // (ez volt az eredeti hiba). Minimum 4 fok, a kapussal ellentétes irányba.
  var minA = 4 * Math.PI / 180;
  if (Math.abs(ang) < minA) {
    var away = (ay < GY + GH/2) ? 1 : -1;      // a kapustól elfelé
    ang = away * minA;
  }

  if (ang >  maxA) ang =  maxA;
  if (ang < -maxA) ang = -maxA;
  return ang;
}

// A gép csatárának fél-magassága (a kikerüléshez). A valós méretet használjuk,
// ha elérhető — a 2P-s méretezés nem érinti (ott nincs auto-csatár).
function effAMR() {
  if (typeof szStrikerRight === 'function') return szStrikerRight() * 1.15;
  return (typeof MR === 'number') ? MR * 1.15 : 20;
}

// ============================================================
// A RÉGI véletlen bónusz-labda rendszer — INERT csonkok.
// (A kód más pontjai még hivatkoznak rájuk; sosem aktiválódnak.)
// ============================================================
var pb = null;
var powerLeft = null, powerRight = null;
var powerGlowSide = null;
var POWER_DURATION = 0;
function isPowerActive(p)   { return false; }
function schedulePowerBall() {}
function spawnPowerBall()    {}
function updatePowerBall()   {}
function drawPowerBall()     {}
function drawPowerIndicator(){}
function activatePower()     {}
function getPowerName()      { return ''; }
