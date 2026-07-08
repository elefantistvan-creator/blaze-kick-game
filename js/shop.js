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
  // olcsó
  { id:'powerTap',     price:15,  tier:'cheap',  icon:'💥', name:'Power shot',
    desc:'Your tap shots go through their keeper.' },
  { id:'slowCpu',      price:15,  tier:'cheap',  icon:'🐢', name:'Slow opponent',
    desc:'CPU paddles move at half speed.' },
  { id:'bigStriker',   price:15,  tier:'cheap',  icon:'📏', name:'Big striker',
    desc:'Your striker is 50% larger.' },
  // közepes
  { id:'bigGoalie',    price:40,  tier:'mid',    icon:'🧤', name:'Big keeper',
    desc:'Your keeper is 50% larger.' },
  { id:'noCpuGoalie',  price:40,  tier:'mid',    icon:'🚫', name:'Remove their keeper',
    desc:'Their keeper leaves the pitch.' },
  { id:'noCpuStriker', price:40,  tier:'mid',    icon:'🚷', name:'Remove their striker',
    desc:'Their striker leaves the pitch.' },
  // drága
  { id:'autoStriker',  price:120, tier:'pro',    icon:'🎯', name:'Auto striker',
    desc:'Your striker plays itself — and aims.' },
  { id:'autoGoalie',   price:120, tier:'pro',    icon:'🛡️', name:'Auto keeper',
    desc:'Your keeper plays itself — flawlessly.' }
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
  var DURATION_MS     = 30000;   // 30 mp plafon, de gólig él

  var active = {};        // id -> lejárati időbélyeg
  var used   = 0;         // meccsenkénti aktiválások

  function reset() { active = {}; used = 0; }

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

  // Gólnál minden hatás megszűnik (bármelyik oldal szerezte)
  function onGoal() { active = {}; }

  function canActivate(id) {
    if (bkMode !== 'stage') return false;
    if (used >= MAX_ACTIVATIONS) return false;
    if (isActive(id)) return false;
    return Progress.invCount(id) > 0;
  }

  function activate(id) {
    if (!canActivate(id)) return false;
    Progress.useInv(id);
    active[id] = Date.now() + DURATION_MS;
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
function cpuSlowFactor()  { return Shop.isActive('slowCpu') ? 0.5 : 1.0; }

// Auto csatár célzása: az ellenfél kapusától MESSZE, a kapunyíláson belülre.
// Visszaadja a kívánt kimeneti szöget (radián), vagy null-t, ha nincs aktív auto.
function autoStrikerAim() {
  if (!Shop.isActive('autoStriker')) return null;
  var goalX = PLX + PLW;
  var topY = GY + BR*1.5, botY = GY + GH - BR*1.5;
  var targetY;
  if (cpuGoalieGone()) targetY = GY + GH/2;
  else targetY = (ay < GY + GH/2) ? botY : topY;   // a kapus túloldalára
  var ang = Math.atan2(targetY - my, Math.max(1, goalX - mx));
  var maxA = MAX_BOUNCE_ANGLE_DEG * Math.PI / 180;
  if (ang >  maxA) ang =  maxA;
  if (ang < -maxA) ang = -maxA;
  return ang;
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
