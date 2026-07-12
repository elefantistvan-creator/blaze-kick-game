function hitRect(rx,ry,rw,rh,cx,cy,cr) {
  var nx=Math.max(rx,Math.min(cx,rx+rw));
  var ny=Math.max(ry,Math.min(cy,ry+rh));
  var dx=cx-nx, dy=cy-ny;
  return dx*dx+dy*dy < cr*cr;
}

function bounceRect(padX, padY, isLeft, velY, isPad, aimAng) {
  // 1) SEBESSÉG-NAGYSÁG: megmarad. (Tap-ütés után az eredeti sebesség áll vissza.)
  var speed;
  if (powerHitActive) {
    speed = prePowerHitSpeed > 0 ? prePowerHitSpeed : Math.abs(prePowerHitVX);
    powerHitActive = false;
    fireTrailActive = false;
  } else {
    speed = Math.sqrt(bvx*bvx + bvy*bvy);
  }
  if (speed < 0.01) speed = spd;

  // 2) Irány + pozíció-korrekció (ne ragadjon bele az ütőbe)
  var dirX;
  if (isLeft) { dirX = 1;  bx = padX + PW/2 + BR + 1; }
  else        { dirX = -1; bx = padX - PW/2 - BR - 1; }

  // 3) Az ütő húzása a SZÖGET módosítja (nem a sebességet)
  //    Auto csatárnál a célzott szög felülírja.
  var ang;
  if (typeof aimAng === 'number') {
    ang = aimAng;
  } else {
    var refVX = Math.abs(bvx) > 0.01 ? Math.abs(bvx) : speed;
    ang = Math.atan2(bvy + velY * PADDLE_DRAG, refVX);
  }

  // 4) Szög-korlát: nincs fel-le pattogás
  var maxA = MAX_BOUNCE_ANGLE_DEG * Math.PI / 180;
  if (ang >  maxA) ang =  maxA;
  if (ang < -maxA) ang = -maxA;

  // 5) Új sebességvektor — a nagyság VÁLTOZATLAN, csak az irány más
  bvx = dirX * speed * Math.cos(ang);
  bvy =        speed * Math.sin(ang);

  // Spin (csak vizuális forgás)
  ballSpin += velY * 0.06;
  // Squish deformáció
  ballSquish = 1.0;
  ballSquishDir = Math.atan2(bvy, bvx);
  var mag = Math.min(Math.abs(bvx)/baseSpd * 2, 6);
  triggerShake(mag);
  spawnSparks(bx, by, bvx, bvy);
  if (Math.abs(bvx) > baseSpd * 1.5) spawnShockWave(bx, by);
}

// --- GÓÓL szöveg animáció ---
var goalTextAnim = null; // {text, startTime, x}

function triggerGoalText(side) {
  goalTextAnim = {
    text: 'GOOOAL!',
    startTime: Date.now(),
    x: side === 'right' ? W*0.25 : W*0.75
  };
}

function drawGoalText() {
  if (!goalTextAnim) return;
  var elapsed = Date.now() - goalTextAnim.startTime;
  var duration = 2000;
  if (elapsed > duration) { goalTextAnim = null; return; }
  var progress = elapsed / duration;
  // Felnő majd elhalványul
  var scale = progress < 0.3 ? progress/0.3 : 1.0;
  var alpha = progress < 0.6 ? 1.0 : 1.0 - (progress-0.6)/0.4;
  var wobble = Math.sin(elapsed/80) * 3;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(goalTextAnim.x + wobble, H/2);
  ctx.scale(scale, scale);
  ctx.font = 'bold ' + Math.floor(H*0.12) + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  // Árnyék
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillText(goalTextAnim.text, 3, 3);
  // Szöveg - arany
  ctx.fillStyle = '#ffd700';
  ctx.strokeStyle = '#ff6600';
  ctx.lineWidth = 4;
  ctx.strokeText(goalTextAnim.text, 0, 0);
  ctx.fillText(goalTextAnim.text, 0, 0);
  ctx.restore();
}

function updateBall() {
  if (!running) return;
  // Gól után: a labda tovább gurul a hálóba, majd a beállított mélységnél eltűnik
  if (goalScored) {
    if (ballVisible) {
      bx += bvx; by += bvy;
      // A labda a KAPUNYÍLÁSON BELÜL marad: éles szögből érkezve se csússzon
      // a kapufán túlra. A kapufáról tompítva visszapattan (hálóba érkezés).
      var gTop = GY + BR, gBot = GY + GH - BR;
      if (by < gTop) { by = gTop; bvy =  Math.abs(bvy) * 0.45; }
      if (by > gBot) { by = gBot; bvy = -Math.abs(bvy) * 0.45; }
      if (goalScored==='left'  && bx <= PLX - BALL_VANISH)      ballVisible = false;
      if (goalScored==='right' && bx >= PLX + PLW + BALL_VANISH) ballVisible = false;
    }
    return;
  }
  if (Date.now()-goalTime < 1200) return;

  // (A játszmán belüli gyorsulás törölve — a labda sebessége állandó marad.
  //  A pályánkénti alapsebességet a stageMult() adja, a setup()-ban.)

  // Power-up timer check
  if (pb===null && Date.now() > pbTimer) spawnPowerBall();
  updatePowerBall();

  // Sebességek
  padVY  = py  - prevPY;  prevPY  = py;
  midVY  = my  - prevMY;  prevMY  = my;
  aiVY   = ay  - prevAY;  prevAY  = ay;
  aiMidVY= amy - prevAmY; prevAmY = amy;

  // Power 5/6: labda sebesség vizuális módosítás (csak mozgásra hat, bvx/bvy érintetlen)
  var spdScale = 1.0;
  if (isPowerActive(powerLeft)  && powerLeft.type===5)  spdScale = 0.5;
  if (isPowerActive(powerLeft)  && powerLeft.type===6)  spdScale = 2.0;
  if (isPowerActive(powerRight) && powerRight.type===5) spdScale = 0.5;
  if (isPowerActive(powerRight) && powerRight.type===6) spdScale = 2.0;

  bx += bvx * spdScale;
  by += bvy * spdScale;

  // Kapu méretek (fizika) — fix méret; a kapuméret-bónuszok (type 1-4) törölve
  var leftGY = GY, leftGH = GH;   // bal (játékos) kapu
  var rightGY = GY, rightGH = GH; // jobb (gép) kapu

  // Falak fel/le - a keret felső/alsó éle (PLY, PLY+PLH)
  if (by-BR < PLY)     { by=PLY+BR;     bvy=Math.abs(bvy);  soundWall(); spawnDust(bx, PLY, 0);     ballSquish=0.8; ballSquishDir=Math.PI/2; }
  if (by+BR > PLY+PLH) { by=PLY+PLH-BR; bvy=-Math.abs(bvy); soundWall(); spawnDust(bx, PLY+PLH, 0); ballSquish=0.8; ballSquishDir=Math.PI/2; }

  // Kapufa ütközés - kapu belső sarkainál visszapattan
  var lBlocked = (isPowerActive(powerLeft)  && powerLeft.type===11) ||
                 (isPowerActive(powerRight) && powerRight.type===12);
  var rBlocked = (isPowerActive(powerRight) && powerRight.type===11) ||
                 (isPowerActive(powerLeft)  && powerLeft.type===12);

  function checkPost(postX, postY, isLeft) {
    var dx = bx - postX;
    var dy = by - postY;
    var dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < BR && dist > 0) {
      // Visszapattan a sarok normálisa mentén
      var nx = dx/dist, ny = dy/dist;
      // Pozíció korrekció
      bx = postX + nx * BR;
      by = postY + ny * BR;
      // Sebesség tükrözés a sarok normálisára
      var dot = bvx*nx + bvy*ny;
      bvx = bvx - 2*dot*nx;
      bvy = bvy - 2*dot*ny;
      triggerShake(3);
      soundWall();
      spawnDust(postX, postY, isLeft ? 1 : -1);
    }
  }

  if (!lBlocked) {
    checkPost(PLX, leftGY, true);           // bal felső kapufa
    checkPost(PLX, leftGY+leftGH, true);    // bal alsó kapufa
  }
  if (!rBlocked) {
    checkPost(PLX+PLW, rightGY, false);         // jobb felső kapufa
    checkPost(PLX+PLW, rightGY+rightGH, false); // jobb alsó kapufa
  }

  // Bal gólvonal (a keret belső széle, PLX)
  if (bx-BR < PLX) {
    var leftBlocked = (isPowerActive(powerLeft)  && powerLeft.type===11) ||
                      (isPowerActive(powerRight) && powerRight.type===12);
    // GÓL csak ha a labda TELJESEN a nyíláson belül van (különben kapufa/fal)
    if (!leftBlocked && by-BR >= leftGY && by+BR <= leftGY+leftGH) {
      sc2++; s2El.textContent=sc2; goalTime=Date.now(); goalScored='left'; Shop.onGoal(); if(is2P) onGoal2P();
      powerHitActive = false; fireTrailActive = false; fireTrail = []; burnMarks = [];
      Sound.goal(); spawnConfetti('left'); triggerGoalEffect('right');
      triggerGoalFlash(); triggerScoreAnim('right'); triggerShake(10);
      triggerGateFlash('left'); triggerVictoryJump('right'); checkDramatic();
      if (sc2>=7) { endGame(false); return; }
      setTimeout(function(){ resetBall(-1); }, 1100); return;  // bal kapott gólt, bal indít
    } else { bx=PLX+BR; bvx=Math.abs(bvx); soundWall(); spawnDust(PLX, by, 1); ballSquish=0.8; ballSquishDir=0; }
  }

  // Jobb gólvonal (a keret belső széle, PLX+PLW)
  if (bx+BR > PLX+PLW) {
    var rightBlocked = (isPowerActive(powerRight) && powerRight.type===11) ||
                       (isPowerActive(powerLeft)  && powerLeft.type===12);
    if (!rightBlocked && by-BR >= rightGY && by+BR <= rightGY+rightGH) {
      sc1++; s1El.textContent=sc1; goalTime=Date.now(); goalScored='right'; Shop.onGoal(); if(is2P) onGoal2P();
      powerHitActive = false; fireTrailActive = false; fireTrail = []; burnMarks = [];
      Sound.goal(); spawnConfetti('right'); triggerGoalEffect('left');
      triggerGoalFlash(); triggerScoreAnim('left'); triggerShake(10);
      triggerGateFlash('right'); triggerVictoryJump('left'); checkDramatic();
      if (sc1>=7) { endGame(true); return; }
      setTimeout(function(){ resetBall(1); }, 1100); return;  // jobb kapott gólt, jobb indít
    } else { bx=PLX+PLW-BR; bvx=-Math.abs(bvx); soundWall(); spawnDust(PLX+PLW, by, -1); ballSquish=0.8; ballSquishDir=0; }
  }

  // Kapusok ütközés (1P: effPR/PR ; 2P: MR + bónusz)
  var szGL = szGoalieLeft();
  if (hitRect(px-PW/2, py-szGL, PW, szGL*2, bx,by,BR)) {
    bounceRect(px, py, true, padVY, true);
    Sound.paddle('me'); hitEffect={pad:'p', time:Date.now()}; addPadHeat('p'); rallyBoost();
  }
  var szGR = szGoalieRight();
  var tapThrough = Shop.isActive('powerTap') && powerHitActive;
  if (!rGoalieGone() && !tapThrough &&
      hitRect(ax-PW/2, ay-szGR, PW, szGR*2, bx,by,BR)) {
    bounceRect(ax, ay, false, aiVY, true);
    Sound.paddle('cpu'); hitEffect={pad:'a', time:Date.now()}; addPadHeat('a'); rallyBoost();
  }

  // Csatárok
  var effPlayerMR = szStrikerLeft();
  var effAiMR     = rStrikerGone() ? 0 : szStrikerRight();

  if (effPlayerMR > 0 && hitRect(mx-PW/2, my-effPlayerMR, PW, effPlayerMR*2, bx,by,BR)) {
    bounceRect(mx, my, true, midVY, false, is2P ? undefined : autoStrikerAim());
    Sound.paddle('me'); hitEffect={pad:'m', time:Date.now()}; addPadHeat('m'); rallyBoost();
  }
  if (effAiMR > 0 && hitRect(amx-PW/2, amy-effAiMR, PW, effAiMR*2, bx,by,BR)) {
    bounceRect(amx, amy, false, aiMidVY, false);
    Sound.paddle('cpu'); hitEffect={pad:'am', time:Date.now()}; rallyBoost();
  }
}

