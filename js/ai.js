// --- AI ---
function updateAI() {
  var spdMult = spd / baseSpd;
  var kSpd = H * 0.005 * spdMult * stageMult();
  var mSpd = H * 0.006 * spdMult * stageMult();

  // Gép kapus
  var tAY = by + (Math.random()-0.5)*PR*0.4;
  var dAY = tAY - ay;
  ay += Math.sign(dAY)*Math.min(Math.abs(dAY)*0.08, kSpd);
  ay = Math.max(WL+PR, Math.min(H-WL-PR, ay));

  // Gép mezőnyjátékos
  var tAmY = by + (Math.random()-0.5)*MR*0.5;
  if (bx > W*0.55) {
    var dAmY = tAmY - amy;
    amy += Math.sign(dAmY)*Math.min(Math.abs(dAmY)*0.1, mSpd);
  }
  amy = Math.max(WL+MR, Math.min(H-WL-MR, amy));
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

