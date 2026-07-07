function setup() {
  var mid = document.getElementById('mid');
  W = mid.clientWidth;
  H = mid.clientHeight;
  c.width = W; c.height = H;

  // --- Keret-margók (dekor-sáv) — vizuálisan hangolható, később tier-enként ---
  MARGIN_X = 0.10;
  MARGIN_Y = 0.08;
  PLX = W * MARGIN_X; PLW = W - 2*PLX;
  PLY = H * MARGIN_Y; PLH = H - 2*PLY;

  // --- Tárgyméretek: a TELJES magassághoz (H) viszonyítva = EREDETI méret ---
  // (nem skálázódnak a kisebb pályával, csak a határok húzódnak be)
  WL  = Math.max(4, H * 0.015);
  PW  = WL * 1.4;          // pálcika szélesség
  PR  = H * 0.07;          // kapus fél-magasság
  MR  = H * 0.042;         // mezőnyjátékos fél-magasság
  GH  = H * 0.36;          // kapunyílás
  GY  = PLY + (PLH - GH) / 2;   // kapu a pálya közepére igazítva
  baseSpd = H * 0.006 * stageMult();
  spd = baseSpd;

  // Labda eltűnési mélység a gólvonal mögött (a dekor-sávba gurulva) — hangolható
  BALL_VANISH = PLX * 0.6;

  // --- Játékos pozíciók: a CSATÁR a túloldalra cserélve (ellenfél kapuja elé) ---
  px = PLX + PW/2;           py = PLY + PLH/2;   // kapus (bal keret-él)
  mx = PLX + PLW*0.62;       my = PLY + PLH/2;   // csatár (jobb térfél, GÉP kapuja előtt)

  // --- Gép pozíciók: a gép csatára a JÁTÉKOS kapuja elé ---
  ax  = PLX + PLW - PW/2;    ay  = PLY + PLH/2;  // gép kapus (jobb keret-él)
  amx = PLX + PLW*0.38;      amy = PLY + PLH/2;  // gép csatár (bal térfél, JÁTÉKOS kapuja előtt)

  resetBall(1);
}

var isNight = true;
var ballAngle = 0;
var ballSpin = 0;      // forgási sebesség (csavar)
var ballSquish = 0;    // deformáció 0-1
var ballSquishDir = 0; // deformáció iránya (szög)
var countdown = 0;
var countdownStart = 0;
var goalSpeedMult = 1.0;
var lastGoalDir = 1;   // ki kapott gólt - ő kapja a bedobást

// --- Stage rendszer: minden meccs végén nő, labda + gép erősebb lesz ---
var stage = parseInt(localStorage.getItem('bk_stage'), 10) || 1;
function stageMult() { return 1 + (stage - 1) * 0.025; } // Stage1=1.0, Stage2=1.025, Stage3=1.05, ...

function updateBallRotation() {
  ballSpin *= 0.96;
  ballAngle += ballSpin * 0.3 + (bvx > 0 ? 1 : -1) * 0.015;
  ballSquish *= 0.82;
}

function resetBall(dir) {
  bx=PLX+PLW/2; by=PLY+PLH/2;
  var currentSpd = baseSpd * goalSpeedMult;
  bvx = currentSpd * (dir>0?1:-1);
  bvy = currentSpd * (Math.random()*0.4-0.2);
  BR = H * 0.022;
  spd = currentSpd;
  ballSpin = 0;
  ballSquish = 0;
  ballVisible = true;
  goalScored = null;
}

// --- Multi-touch ---
var rsav = document.getElementById('rsav');
var lsav = document.getElementById('lsav');

// Koppintás detektálás
var touchStartTimes = {};
var touchStartY = {};
var TAP_MAX_MS = 180;    // max 180ms = tap
var TAP_MAX_MOVE = 8;    // max 8px mozgás = tap
var POWER_HIT_DIST = 5;  // 5px közelség az ütőhöz

// Csavar - utolsó mozgás sebessége
var lastLeftVY = 0;
var lastRightVY = 0;

