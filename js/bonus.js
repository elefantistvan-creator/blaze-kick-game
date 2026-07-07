function schedulePowerBall() {
  pbTimer = Date.now() + 10000 + Math.random() * 8000;
}

function spawnPowerBall() {
  powerBallSpawnTime = Date.now();
  var spd2 = Math.abs(bvx);
  var dirX = bvx > 0 ? 1 : -1;
  var dirY = Math.random() > 0.5 ? -1 : 1;
  var ySpd = spd2 * (0.5 + Math.random() * 0.5);
  pb = {
    x: PLX+PLW/2, y: PLY+PLH/3 + Math.random()*PLH/3,
    vx: spd2 * dirX,
    vy: ySpd * dirY,
    r: BR * 0.85
  };
}

var powerGlowSide = null;  // 'left' vagy 'right' - melyik oldal ütői izzanak

function activatePower(type, forPlayer) {
  var p = { type: type, endTime: Date.now() + POWER_DURATION };
  if (forPlayer) { powerLeft = p; powerGlowSide = 'left'; }
  else           { powerRight = p; powerGlowSide = 'right'; }
  playBeep(880, 'sine', 0.3, 0.3);
}

function getPowerName(type) {
  if (type===5)  return '🐢 Slower ball';
  if (type===6)  return '⚡ Faster ball for them';
  if (type===11) return '🧱 Own goal walled off';
  if (type===12) return '🧱 Opponent goal walled off';
  if (type===7)  return '💪 Big field player';
  if (type===8)  return '👶 Small field player for them';
  if (type===9)  return '👥 Double field player';
  if (type===10) return '👻 Field player vanishes';
  return '';
}

function updatePowerBall() {
  if (!pb) return;
  pb.x += pb.vx; pb.y += pb.vy;

  if (pb.y - pb.r < PLY)      { pb.y = PLY+pb.r;      pb.vy = Math.abs(pb.vy); }
  if (pb.y + pb.r > PLY+PLH)  { pb.y = PLY+PLH-pb.r;  pb.vy = -Math.abs(pb.vy); }

  if (pb.x < PLX-pb.r*2 || pb.x > PLX+PLW+pb.r*2) {
    pb = null; schedulePowerBall(); return;
  }

  var hitP = hitRect(px-PW/2,py-PR,PW,PR*2,pb.x,pb.y,pb.r) ||
             hitRect(mx-PW/2,my-MR,PW,MR*2,pb.x,pb.y,pb.r);
  var hitA = hitRect(ax-PW/2,ay-PR,PW,PR*2,pb.x,pb.y,pb.r) ||
             hitRect(amx-PW/2,amy-MR,PW,MR*2,pb.x,pb.y,pb.r);

  if (hitP || hitA) {
    // Párok: 5(labda seb.), 7(belső méret), 9(belső dupla/eltűnik), 11(falazott kapu)
    // A kapuméret-párok (1,3) törölve
    var pairs = [5,7,9,11];
    var pairIdx = Math.floor(Math.random()*pairs.length);
    var pair = pairs[pairIdx];
    var favorable = Math.random() > 0.5;
    var type = favorable ? pair : (pair === 11 ? 12 : pair+1);

    if (hitP) {
      // játékos kapta - kedvező: játékosnak, nehezítő: gépnek
      if (favorable) activatePower(type, true);   // powerLeft = játékos
      else           activatePower(type, false);  // powerRight = gép
      spawnConfetti('right');
    } else {
      // gép kapta - kedvező: gépnek, nehezítő: játékosnak
      if (favorable) activatePower(type, false);  // powerRight = gép
      else           activatePower(type, true);   // powerLeft = játékos
      spawnConfetti('left');
    }
    pb = null; schedulePowerBall();
  }
}

function drawPowerBall() {
  if (!pb) return;
  var pulse = 0.7 + 0.3*Math.sin(Date.now()/120); // pulzálás
  var r = pb.r * pulse;

  // Ragyogás
  var grd = ctx.createRadialGradient(pb.x,pb.y,r*0.1,pb.x,pb.y,r*2);
  grd.addColorStop(0,'rgba(255,220,0,0.6)');
  grd.addColorStop(1,'rgba(255,100,0,0)');
  ctx.beginPath(); ctx.arc(pb.x,pb.y,r*2,0,Math.PI*2);
  ctx.fillStyle=grd; ctx.fill();

  // Mag
  ctx.beginPath(); ctx.arc(pb.x,pb.y,r,0,Math.PI*2);
  ctx.fillStyle='#FFD700'; ctx.fill();
  ctx.beginPath(); ctx.arc(pb.x,pb.y,r*0.5,0,Math.PI*2);
  ctx.fillStyle='#FFF176'; ctx.fill();
  ctx.beginPath(); ctx.arc(pb.x,pb.y,r,0,Math.PI*2);
  ctx.strokeStyle='#FF8F00'; ctx.lineWidth=2; ctx.stroke();

  // Csillag jel a közepén
  ctx.fillStyle='#FF6F00';
  ctx.font='bold '+Math.floor(r*1.2)+'px Arial';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('★', pb.x, pb.y);
}

// Előny alkalmazása a rajzolásban/fizikában
function isPowerActive(p) {
  return p && Date.now() < p.endTime;
}

function drawPowerIndicator() {
  // beépítve a draw() függvénybe
}
