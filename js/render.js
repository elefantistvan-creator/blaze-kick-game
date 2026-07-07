// --- Rajzolás ---
function draw() {
  // Screen shake
  ctx.save();
  var shakeAge = Date.now() - shakeTime;
  if (shakeMag > 0 && shakeAge < 300) {
    var decay = 1 - shakeAge/300;
    var sx = (Math.random()-0.5) * shakeMag * decay;
    var sy = (Math.random()-0.5) * shakeMag * decay;
    ctx.translate(sx, sy);
  }

  ctx.setTransform ? null : null;
  ctx.clearRect(-20, -20, W+40, H+40);

  // Feszültség háttér
  drawTension();

  // Pálya háttér
  if (isNight) {
    ctx.fillStyle='#0a1a0a'; ctx.fillRect(0,0,W,H);
    // Sötét csíkok
    ctx.fillStyle='rgba(255,255,255,0.03)';
    var sw=W/8;
    for(var i=0;i<8;i+=2) ctx.fillRect(i*sw,0,sw,H);
    // Sarok reflektorok - intenzívebb
    var corners=[[0,0],[W,0],[0,H],[W,H]];
    for(var ci=0;ci<corners.length;ci++){
      var cg=ctx.createRadialGradient(corners[ci][0],corners[ci][1],0,corners[ci][0],corners[ci][1],H*0.55);
      cg.addColorStop(0,'rgba(220,255,180,0.32)');
      cg.addColorStop(0.3,'rgba(180,255,150,0.12)');
      cg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=cg; ctx.fillRect(0,0,W,H);
    }
    // Reflektor fény a labdára
    var rgrad = ctx.createRadialGradient(bx,by,0,bx,by,H*0.4);
    rgrad.addColorStop(0,'rgba(255,255,220,0.22)');
    rgrad.addColorStop(0.5,'rgba(255,255,180,0.06)');
    rgrad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rgrad; ctx.fillRect(0,0,W,H);
  } else {
    ctx.fillStyle='#2e7d32'; ctx.fillRect(0,0,W,H);
    // Csíkos fű
    ctx.fillStyle='rgba(0,0,0,0.05)';
    var sw=W/8;
    for(var i=0;i<8;i+=2) ctx.fillRect(i*sw,0,sw,H);
  }

  // Power állapotok kiszámítása a rajzoláshoz - szinkronban a fizikával
  var dLGY=GY, dLGH=GH, dRGY=GY, dRGH=GH;
  if (isPowerActive(powerLeft)) {
    if (powerLeft.type===1) { dRGY=GY+GH/4; dRGH=GH/2; }
    if (powerLeft.type===2) { dRGY=GY-GH/2; dRGH=GH*2; }
    if (powerLeft.type===3) { dRGY=0; dRGH=H; }
    if (powerLeft.type===4) { dLGY=0; dLGH=H; }
  }
  if (isPowerActive(powerRight)) {
    if (powerRight.type===1) { dLGY=GY+GH/4; dLGH=GH/2; }
    if (powerRight.type===2) { dLGY=GY-GH/2; dLGH=GH*2; }
    if (powerRight.type===3) { dLGY=0; dLGH=H; }
    if (powerRight.type===4) { dRGY=0; dRGH=H; }
  }
  var leftWalled  = (isPowerActive(powerLeft)  && powerLeft.type===11) ||
                    (isPowerActive(powerRight) && powerRight.type===12);
  var rightWalled = (isPowerActive(powerRight) && powerRight.type===11) ||
                    (isPowerActive(powerLeft)  && powerLeft.type===12);

  // Felső és alsó falak - mindig fehér, type3 sem érinti
  ctx.fillStyle='white';
  ctx.fillRect(0,0,W,WL);
  ctx.fillRect(0,H-WL,W,WL);

  // Bal oldali fal
  if (leftWalled) {
    // Kapu tele fal - egyszerűen fehér mint a többi fal
    ctx.fillStyle='white';
    ctx.fillRect(0,0,WL,H);
  } else {
    ctx.fillStyle='white';
    ctx.fillRect(0,0,WL,dLGY);
    ctx.fillRect(0,dLGY+dLGH,WL,H-dLGY-dLGH);
    // Type 3: az oldalsó kapufal eltűnik (zöld = átmehet) - felső/alsó érintetlen
    if (dLGH === H) {
      // Teljes oldalsó fal eltűnt - ne rajzoljunk semmit a kapu helyére
    } else if (dLGH !== GH) {
      // Kapu méret változás - halvány jelzés
      ctx.fillStyle='rgba(79,195,247,0.2)';
      ctx.fillRect(0,dLGY,WL,dLGH);
    }
  }

  // Jobb oldali fal
  if (rightWalled) {
    ctx.fillStyle='white';
    ctx.fillRect(W-WL,0,WL,H);
  } else {
    ctx.fillStyle='white';
    ctx.fillRect(W-WL,0,WL,dRGY);
    ctx.fillRect(W-WL,dRGY+dRGH,WL,H-dRGY-dRGH);
    if (dRGH === H) {
      // Teljes oldalsó fal eltűnt
    } else if (dRGH !== GH) {
      ctx.fillStyle='rgba(239,83,80,0.2)';
      ctx.fillRect(W-WL,dRGY,WL,dRGH);
    }
  }

  // Kapu területek színezése
  ctx.fillStyle='rgba(79,195,247,0.18)';  ctx.fillRect(0,dLGY,WL*3,dLGH);
  ctx.fillStyle='rgba(239,83,80,0.18)';   ctx.fillRect(W-WL*3,dRGY,WL*3,dRGH);

  // Középvonal
  ctx.save(); ctx.beginPath(); ctx.setLineDash([8,8]);
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2;
  ctx.moveTo(W/2,WL); ctx.lineTo(W/2,H-WL); ctx.stroke(); ctx.restore();

  // Középkör - fix, nem pulzál
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
  ctx.arc(W/2,H/2,H*0.13,0,Math.PI*2); ctx.stroke();
  ctx.restore();

  // 40% és 60% vonalak
  ctx.save(); ctx.beginPath(); ctx.setLineDash([4,6]);
  ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=1;
  ctx.moveTo(W*0.40,WL); ctx.lineTo(W*0.40,H-WL);
  ctx.moveTo(W*0.60,WL); ctx.lineTo(W*0.60,H-WL);
  ctx.stroke(); ctx.restore();

  // Kapusok
  drawPad(px, py, PR, '#4fc3f7', 'p');
  drawPad(ax, ay, PR, '#ef5350', 'a');

  // Mezőnyjátékosok - szinkronban a fizikával
  var dPlayerMidBig    = isPowerActive(powerLeft)  && powerLeft.type===7;
  var dPlayerMidDouble = isPowerActive(powerLeft)  && powerLeft.type===9;
  var dPlayerMidHalf   = isPowerActive(powerRight) && powerRight.type===8;
  var dPlayerMidGone   = isPowerActive(powerRight) && powerRight.type===10;
  var dAiMidBig        = isPowerActive(powerRight) && powerRight.type===7;
  var dAiMidDouble     = isPowerActive(powerRight) && powerRight.type===9;
  var dAiMidHalf       = isPowerActive(powerLeft)  && powerLeft.type===8;
  var dAiMidGone       = isPowerActive(powerLeft)  && powerLeft.type===10;

  var effPMR = dPlayerMidGone ? 0 : (dPlayerMidBig ? MR*2 : (dPlayerMidHalf ? MR*0.5 : MR));
  var effAMR = dAiMidGone     ? 0 : (dAiMidBig     ? MR*2 : (dAiMidHalf     ? MR*0.5 : MR));

  if (!dPlayerMidGone) {
    if (dPlayerMidDouble) {
      var gap = PR;
      drawPad(mx, my - gap - effPMR, effPMR, '#29b6f6', 'm');
      drawPad(mx, my + gap + effPMR, effPMR, '#29b6f6', 'm');
    } else {
      drawPad(mx, my, effPMR, '#29b6f6', 'm');
    }
  }
  if (!dAiMidGone) {
    if (dAiMidDouble) {
      var gap2 = PR;
      drawPad(amx, amy - gap2 - effAMR, effAMR, '#e53935', 'am');
      drawPad(amx, amy + gap2 + effAMR, effAMR, '#e53935', 'am');
    } else {
      drawPad(amx, amy, effAMR, '#e53935', 'am');
    }
  }

  // Motion trail
  if (running) { updateTrail(); coolPads(); }
  drawTrail();

  // Porfelhő
  updateDust(); drawDust();

  // Shock wave
  updateShockWaves(); drawShockWaves();

  // Tűz effekt frissítés
  if (running) updateFireTrail();
  drawFireTrail();

  // Labda árnyék
  drawBallShadow();

  // Lángoló labda effekt
  drawFireBall();

  // Labda
  drawBall(bx,by,BR);

  // Szikrák
  updateSparks();
  drawSparks();

  // Kapu flash
  drawGateFlash();

  // Bónusz megjelenés
  drawPowerBallSpawn();

  // Power-up labda
  drawPowerBall();

  // Aktív előny jelzés a pályán
  if (isPowerActive(powerLeft)) {
    var rem = Math.ceil((powerLeft.endTime-Date.now())/1000);
    ctx.fillStyle='rgba(255,215,0,0.9)';
    ctx.font='bold '+Math.floor(H*0.038)+'px Arial';
    ctx.textAlign='left'; ctx.textBaseline='top';
    ctx.fillText(getPowerName(powerLeft.type)+' '+rem+'s', WL*2+4, WL*2);
  }
  if (isPowerActive(powerRight)) {
    var rem2 = Math.ceil((powerRight.endTime-Date.now())/1000);
    ctx.fillStyle='rgba(255,100,100,0.9)';
    ctx.font='bold '+Math.floor(H*0.038)+'px Arial';
    ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillText(getPowerName(powerRight.type)+' '+rem2+'s', W-WL*2-4, WL*2);
  }

  // Konfetti (üres) + gól effektek
  updateConfetti(); drawConfetti();
  updateGoalEffects(); drawGoalEffects();

  // Gól flash
  drawGoalFlash();

  // Score animáció
  updateScoreAnim();

  // Gól felirat
  if (Date.now()-goalTime<1000 && goalTime>0) {
    ctx.fillStyle='rgba(255,255,255,0.9)';
    ctx.font='bold '+Math.floor(H*0.09)+'px Arial';
    ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText('⚽ GOAL!', W/2, H/2);
  }

  // Visszaszámlálás 3-2-1
  if (countdown > 0) {
    var elapsed = Date.now() - countdownStart;
    var progress = Math.min(elapsed / 1000, 1); // 0→1 egy másodperc alatt
    // Méret: kis számtól nagy felé, aztán eltűnik (scale 0.3→2.5)
    var scale = 0.3 + progress * 2.2;
    var alpha = 1 - progress * 0.85;
    var fontSize = Math.floor(H * 0.28 * scale);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold ' + fontSize + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Árnyék
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(countdown, W/2 + 4, H/2 + 4);
    // Szám színe: 3=zöld, 2=sárga, 1=piros
    var cdColors = ['','#ff5252','#ffeb3b','#69f0ae'];
    ctx.fillStyle = cdColors[countdown] || '#fff';
    ctx.fillText(countdown, W/2, H/2);
    ctx.restore();
  }

  // Screen shake ctx.restore
  ctx.restore();

  // Multiplayer state küldés (host)
  if (mpMode && mpRole === 'host' && mpConnected) mpSendState();
}

// --- Lángoló labda (power hit) ---
var fireTrailActive = false;
var fireTrail = [];   // [{x,y,age,r}] - tűzcsóva
var burnMarks = [];   // [{x,y,age}] - égett fű

