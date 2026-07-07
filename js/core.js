function setup() {
  var mid = document.getElementById('mid');
  W = mid.clientWidth;
  H = mid.clientHeight;
  c.width = W; c.height = H;

  WL  = Math.max(4, H * 0.015);
  PW  = WL * 1.4;          // pálcika szélesség
  PR  = H * 0.07;          // kapus fél-magasság
  MR  = H * 0.042;         // mezőnyjátékos fél-magasság (60%)
  GH  = H * 0.36;
  GY  = (H - GH) / 2;
  baseSpd = H * 0.006 * stageMult();
  spd = baseSpd;

  // Játékos pozíciók
  px = WL + PW/2;             py = H/2;
  mx = W * 0.40;              my = H/2;

  // Gép pozíciók
  ax  = W - WL - PW/2;        ay  = H/2;
  amx = W * 0.60;             amy = H/2;

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
  bx=W/2; by=H/2;
  var currentSpd = baseSpd * goalSpeedMult;
  bvx = currentSpd * (dir>0?1:-1);
  bvy = currentSpd * (Math.random()*0.4-0.2);
  BR = H * 0.022;
  spd = currentSpd;
  ballSpin = 0;
  ballSquish = 0;
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

