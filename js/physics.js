function hitRect(rx,ry,rw,rh,cx,cy,cr) {
  var nx=Math.max(rx,Math.min(cx,rx+rw));
  var ny=Math.max(ry,Math.min(cy,ry+rh));
  var dx=cx-nx, dy=cy-ny;
  return dx*dx+dy*dy < cr*cr;
}

function bounceRect(padX, padY, isLeft, velY, isPad) {
  if (powerHitActive) {
    bvx = isLeft ? Math.abs(prePowerHitVX) : -Math.abs(prePowerHitVX);
    powerHitActive = false;
    fireTrailActive = false;
  }
  if (isLeft) {
    bvx = Math.abs(bvx);
    bx  = padX + PW/2 + BR + 1;
  } else {
    bvx = -Math.abs(bvx);
    bx  = padX - PW/2 - BR - 1;
  }
  // Ütő húzás erősítve
  bvy += velY * 0.75;
  var maxVY = Math.abs(bvx)*1.4;
  if (bvy> maxVY) bvy= maxVY;
  if (bvy<-maxVY) bvy=-maxVY;
  // Spin az ütő mozgásából
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
      if (goalScored==='left'  && bx <= PLX - BALL_VANISH)      ballVisible = false;
      if (goalScored==='right' && bx >= PLX + PLW + BALL_VANISH) ballVisible = false;
    }
    return;
  }
  if (Date.now()-goalTime < 1200) return;

  // 3 perc után gyorsulás - pontszámtól független
  if (gameStartTime > 0) {
    var elapsed = (Date.now() - gameStartTime) / 1000;
    if (elapsed > 180) {
      var extraSecs = Math.floor(elapsed - 180);
      var extraMult = 1 + extraSecs * 0.01;
      var targetSpd = baseSpd * goalSpeedMult * extraMult;
      if (Math.abs(bvx) < targetSpd) {
        bvx *= 1.0005;
        bvy *= 1.0005;
      }
    }
  }

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
      sc2++; s2El.textContent=sc2; goalTime=Date.now(); goalScored='left';
      goalSpeedMult = Math.min(goalSpeedMult + 0.05, 3.0);
      powerHitActive = false; fireTrailActive = false; fireTrail = []; burnMarks = [];
      soundGoal(); spawnConfetti('left'); triggerGoalEffect('right');
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
      sc1++; s1El.textContent=sc1; goalTime=Date.now(); goalScored='right';
      goalSpeedMult = Math.min(goalSpeedMult + 0.05, 3.0);
      powerHitActive = false; fireTrailActive = false; fireTrail = []; burnMarks = [];
      soundGoal(); spawnConfetti('right'); triggerGoalEffect('left');
      triggerGoalFlash(); triggerScoreAnim('left'); triggerShake(10);
      triggerGateFlash('right'); triggerVictoryJump('left'); checkDramatic();
      if (sc1>=7) { endGame(true); return; }
      setTimeout(function(){ resetBall(1); }, 1100); return;  // jobb kapott gólt, jobb indít
    } else { bx=PLX+PLW-BR; bvx=-Math.abs(bvx); soundWall(); spawnDust(PLX+PLW, by, -1); ballSquish=0.8; ballSquishDir=0; }
  }

  // Kapusok ütközés
  if (hitRect(px-PW/2, py-PR, PW, PR*2, bx,by,BR)) {
    bounceRect(px, py, true, padVY, true);
    // Csavar - bal kapus
    var spin = lastLeftVY * 0.3;
    bvy += spin;
    soundHit(); hitEffect={pad:'p', time:Date.now()}; addPadHeat('p');
  }
  if (hitRect(ax-PW/2, ay-PR, PW, PR*2, bx,by,BR)) {
    bounceRect(ax, ay, false, aiVY, true);
    soundHit(); hitEffect={pad:'a', time:Date.now()}; addPadHeat('a');
  }

  // Mezőnyjátékosok méret logika
  // Kedvező: 7=saját belső nagy, 9=saját belső dupla
  // Nehezítő: 8=ellenfél belső kicsi, 10=ellenfél belső eltűnik
  var playerMidBig    = isPowerActive(powerLeft)  && powerLeft.type===7;   // játékos kedvező
  var playerMidDouble = isPowerActive(powerLeft)  && powerLeft.type===9;   // játékos kedvező
  var playerMidHalf   = isPowerActive(powerRight) && powerRight.type===8;  // gép nehezítő → játékos szenved
  var playerMidGone   = isPowerActive(powerRight) && powerRight.type===10; // gép nehezítő → játékos eltűnik

  var aiMidBig        = isPowerActive(powerRight) && powerRight.type===7;  // gép kedvező
  var aiMidDouble     = isPowerActive(powerRight) && powerRight.type===9;  // gép kedvező
  var aiMidHalf       = isPowerActive(powerLeft)  && powerLeft.type===8;   // játékos nehezítő → gép szenved
  var aiMidGone       = isPowerActive(powerLeft)  && powerLeft.type===10;  // játékos nehezítő → gép eltűnik

  var effPlayerMR = playerMidGone ? 0 : (playerMidBig ? MR*2 : (playerMidHalf ? MR*0.5 : MR));
  var effAiMR     = aiMidGone     ? 0 : (aiMidBig     ? MR*2 : (aiMidHalf     ? MR*0.5 : MR));

  if (!playerMidGone) {
    if (playerMidDouble) {
      var gap = PR;
      var m1y = my - gap - effPlayerMR;
      var m2y = my + gap + effPlayerMR;
      if (hitRect(mx-PW/2, m1y-effPlayerMR, PW, effPlayerMR*2, bx,by,BR)) { bounceRect(mx, m1y, true, midVY, false); soundHit(); hitEffect={pad:'m', time:Date.now()}; addPadHeat('m'); }
      if (hitRect(mx-PW/2, m2y-effPlayerMR, PW, effPlayerMR*2, bx,by,BR)) { bounceRect(mx, m2y, true, midVY, false); soundHit(); hitEffect={pad:'m', time:Date.now()}; addPadHeat('m'); }
    } else if (effPlayerMR > 0) {
      if (hitRect(mx-PW/2, my-effPlayerMR, PW, effPlayerMR*2, bx,by,BR)) {
        bounceRect(mx, my, true, midVY, false);
        var spin2 = lastRightVY * 0.3;
        bvy += spin2;
        soundHit(); hitEffect={pad:'m', time:Date.now()};
      }
    }
  }
  if (!aiMidGone) {
    if (aiMidDouble) {
      var gap2 = PR;
      var a1y = amy - gap2 - effAiMR;
      var a2y = amy + gap2 + effAiMR;
      if (hitRect(amx-PW/2, a1y-effAiMR, PW, effAiMR*2, bx,by,BR)) { bounceRect(amx, a1y, false, aiMidVY, false); soundHit(); hitEffect={pad:'am', time:Date.now()}; }
      if (hitRect(amx-PW/2, a2y-effAiMR, PW, effAiMR*2, bx,by,BR)) { bounceRect(amx, a2y, false, aiMidVY, false); soundHit(); hitEffect={pad:'am', time:Date.now()}; }
    } else if (effAiMR > 0) {
      if (hitRect(amx-PW/2, amy-effAiMR, PW, effAiMR*2, bx,by,BR)) { bounceRect(amx, amy, false, aiMidVY, false); soundHit(); hitEffect={pad:'am', time:Date.now()}; }
    }
  }
}

