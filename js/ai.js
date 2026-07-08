// --- AI ---
// Három független fogantyú (mind a difficulty.js-ből):
//   1) célzási hiba   2) reakciókésés   3) előrejelzés (becsapódási pont)
// A pálcika-sebesség a LABDÁHOZ igazodik, nem a szezonhoz — különben a gyors
// labda automatikusan gyors gépet is jelentene.

var ballHistory = [];              // reakciókéséshez: régebbi labda-pozíciók
var BALL_HISTORY_MAX = 24;

function pushBallHistory() {
  ballHistory.push({ x:bx, y:by, vx:bvx, vy:bvy });
  if (ballHistory.length > BALL_HISTORY_MAX) ballHistory.shift();
}

// Amit az AI "lát": a késleltetett labda-állapot
function seenBall(delay) {
  if (ballHistory.length === 0) return { x:bx, y:by, vx:bvx, vy:bvy };
  var i = ballHistory.length - 1 - delay;
  if (i < 0) i = 0;
  return ballHistory[i];
}

// Becsapódási pont a targetX-nél, legfeljebb DIFF.PREDICT_BOUNCES falpattanással.
// Ha a labda elfordul (nem tart arra), a jelenlegi Y-t adja vissza.
function predictY(b, targetX) {
  var x = b.x, y = b.y, vx = b.vx, vy = b.vy;
  if (Math.abs(vx) < 0.001) return y;
  if ((targetX - x) * vx <= 0) return y;   // nem felénk tart

  var top = PLY + BR, bot = PLY + PLH - BR;
  var bounces = 0;
  var guard = 0;
  while (guard++ < 200) {
    var tX = (targetX - x) / vx;                       // idő a célvonalig
    var tWall = Infinity;
    if (vy > 0.001)      tWall = (bot - y) / vy;
    else if (vy < -0.001) tWall = (top - y) / vy;

    if (tX <= tWall || bounces >= DIFF.PREDICT_BOUNCES) {
      return y + vy * tX;                              // szabad út a célig
    }
    // falpattanás
    x += vx * tWall; y += vy * tWall; vy = -vy; bounces++;
  }
  return y;
}

function updateAI() {
  pushBallHistory();

  var spdMult = spd / baseSpd;
  var kSpd = H * DIFF.GOALIE_SPD  * spdMult;
  var mSpd = H * DIFF.STRIKER_SPD * spdMult;

  var delay = Difficulty.reactionDelay(stage);
  var errK  = Difficulty.aimError(stage);
  var pw    = Difficulty.predictWeight(stage);
  var b     = seenBall(delay);

  // --- Gép kapus (jobb keret-él) ---
  var goalieX = PLX + PLW - PW/2;
  var predK = predictY(b, goalieX);
  var tAY = (1-pw)*b.y + pw*predK + (Math.random()-0.5)*PR*errK;
  var dAY = tAY - ay;
  ay += Math.sign(dAY)*Math.min(Math.abs(dAY)*0.08, kSpd);
  ay = Math.max(PLY+PR, Math.min(PLY+PLH-PR, ay));

  // --- Gép csatár (bal térfélen, a játékos kapuja előtt) ---
  if (b.x < PLX + PLW*0.45) {
    var predM = predictY(b, amx);
    var tAmY = (1-pw)*b.y + pw*predM + (Math.random()-0.5)*MR*errK*1.25;
    var dAmY = tAmY - amy;
    amy += Math.sign(dAmY)*Math.min(Math.abs(dAmY)*0.1, mSpd);
  }
  amy = Math.max(PLY+MR, Math.min(PLY+PLH-MR, amy));
}

// --- Power-up labda ---
var pb = null;  // power-up labda {x,y,vx,vy,r}
var pbTimer = 0;

// Aktív hatások: {type, endTime}
// type 1-10:
//  1=saját kapu feleződik  2=ellenfél kapuja duplázódik
//  3=saját kapu tele fal   4=ellenfél kapuja=teljes pálya
//  5=labda feleződik       6=labda duplázódik
//  7=belső játékos 2x méret 8=belső játékos fél méret
//  9=belső játékos kettéválik 10=belső játékos eltűnik
var powerLeft  = null;
var powerRight = null;
var POWER_DURATION = 10000;

