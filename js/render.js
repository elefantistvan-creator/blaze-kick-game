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

  // === Dekor-sáv háttér (a kereten kívül, sötét) ===
  ctx.fillStyle = '#0c0c12';
  ctx.fillRect(0,0,W,H);

  // === Pálya (behúzott téglalap) — a fűre vágva ===
  ctx.save();
  ctx.beginPath();
  ctx.rect(PLX, PLY, PLW, PLH);
  ctx.clip();
  if (isNight) {
    ctx.fillStyle='#0a1a0a'; ctx.fillRect(PLX,PLY,PLW,PLH);
    ctx.fillStyle='rgba(255,255,255,0.03)';
    var sw=PLW/8;
    for(var i=0;i<8;i+=2) ctx.fillRect(PLX+i*sw,PLY,sw,PLH);
    var corners=[[PLX,PLY],[PLX+PLW,PLY],[PLX,PLY+PLH],[PLX+PLW,PLY+PLH]];
    for(var ci=0;ci<corners.length;ci++){
      var cg=ctx.createRadialGradient(corners[ci][0],corners[ci][1],0,corners[ci][0],corners[ci][1],PLH*0.55);
      cg.addColorStop(0,'rgba(220,255,180,0.32)');
      cg.addColorStop(0.3,'rgba(180,255,150,0.12)');
      cg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=cg; ctx.fillRect(PLX,PLY,PLW,PLH);
    }
    var rgrad = ctx.createRadialGradient(bx,by,0,bx,by,PLH*0.4);
    rgrad.addColorStop(0,'rgba(255,255,220,0.22)');
    rgrad.addColorStop(0.5,'rgba(255,255,180,0.06)');
    rgrad.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rgrad; ctx.fillRect(PLX,PLY,PLW,PLH);
  } else {
    ctx.fillStyle='#2e7d32'; ctx.fillRect(PLX,PLY,PLW,PLH);
    ctx.fillStyle='rgba(0,0,0,0.05)';
    var sw2=PLW/8;
    for(var i2=0;i2<8;i2+=2) ctx.fillRect(PLX+i2*sw2,PLY,sw2,PLH);
  }
  ctx.restore();

  // Power állapotok kiszámítása a rajzoláshoz - szinkronban a fizikával
  var dLGY=GY, dLGH=GH, dRGY=GY, dRGH=GH;
  if (isPowerActive(powerLeft)) {
    if (powerLeft.type===1) { dRGY=GY+GH/4; dRGH=GH/2; }
    if (powerLeft.type===2) { dRGY=GY-GH/2; dRGH=GH*2; }
    if (powerLeft.type===3) { dRGY=PLY; dRGH=PLH; }
    if (powerLeft.type===4) { dLGY=PLY; dLGH=PLH; }
  }
  if (isPowerActive(powerRight)) {
    if (powerRight.type===1) { dLGY=GY+GH/4; dLGH=GH/2; }
    if (powerRight.type===2) { dLGY=GY-GH/2; dLGH=GH*2; }
    if (powerRight.type===3) { dLGY=PLY; dLGH=PLH; }
    if (powerRight.type===4) { dRGY=PLY; dRGH=PLH; }
  }
  var leftWalled  = (isPowerActive(powerLeft)  && powerLeft.type===11) ||
                    (isPowerActive(powerRight) && powerRight.type===12);
  var rightWalled = (isPowerActive(powerRight) && powerRight.type===11) ||
                    (isPowerActive(powerLeft)  && powerLeft.type===12);

  var RX = PLX + PLW;  // jobb gólvonal X

  // Gólhálók (a gólvonal mögött, kifelé) — ide gurul be és tűnik el a labda
  drawGoalNet(PLX, dLGY, dLGH, -1);
  drawGoalNet(RX,  dRGY, dRGH, +1);

  // Keret felső/alsó éle
  ctx.fillStyle='white';
  ctx.fillRect(PLX, PLY, PLW, WL);
  ctx.fillRect(PLX, PLY+PLH-WL, PLW, WL);

  // Bal oldali keret-él (kapuréssel)
  if (leftWalled) {
    ctx.fillStyle='white'; ctx.fillRect(PLX, PLY, WL, PLH);
  } else {
    ctx.fillStyle='white';
    ctx.fillRect(PLX, PLY, WL, dLGY-PLY);
    ctx.fillRect(PLX, dLGY+dLGH, WL, (PLY+PLH)-(dLGY+dLGH));
    if (dLGH !== PLH && dLGH !== GH) { ctx.fillStyle='rgba(79,195,247,0.2)'; ctx.fillRect(PLX,dLGY,WL,dLGH); }
  }

  // Jobb oldali keret-él (kapuréssel)
  if (rightWalled) {
    ctx.fillStyle='white'; ctx.fillRect(RX-WL, PLY, WL, PLH);
  } else {
    ctx.fillStyle='white';
    ctx.fillRect(RX-WL, PLY, WL, dRGY-PLY);
    ctx.fillRect(RX-WL, dRGY+dRGH, WL, (PLY+PLH)-(dRGY+dRGH));
    if (dRGH !== PLH && dRGH !== GH) { ctx.fillStyle='rgba(239,83,80,0.2)'; ctx.fillRect(RX-WL,dRGY,WL,dRGH); }
  }

  // Kapu-terület színezés
  ctx.fillStyle='rgba(79,195,247,0.18)';  ctx.fillRect(PLX,dLGY,WL*3,dLGH);
  ctx.fillStyle='rgba(239,83,80,0.18)';   ctx.fillRect(RX-WL*3,dRGY,WL*3,dRGH);

  // Középvonal
  var CXm = PLX + PLW/2;
  ctx.save(); ctx.beginPath(); ctx.setLineDash([8,8]);
  ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=2;
  ctx.moveTo(CXm,PLY); ctx.lineTo(CXm,PLY+PLH); ctx.stroke(); ctx.restore();

  // Középkör
  ctx.save(); ctx.beginPath();
  ctx.strokeStyle='rgba(255,255,255,0.3)'; ctx.lineWidth=2;
  ctx.arc(CXm,PLY+PLH/2,PLH*0.135,0,Math.PI*2); ctx.stroke();
  ctx.restore();

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

  // Labda árnyék + lángoló effekt + labda — csak ha látható (a hálóban eltűnik)
  if (ballVisible) {
    drawBallShadow();
    drawFireBall();
    drawBall(bx,by,BR);
  }

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
    ctx.fillText(getPowerName(powerLeft.type)+' '+rem+'s', PLX+WL*2+4, PLY+WL*2);
  }
  if (isPowerActive(powerRight)) {
    var rem2 = Math.ceil((powerRight.endTime-Date.now())/1000);
    ctx.fillStyle='rgba(255,100,100,0.9)';
    ctx.font='bold '+Math.floor(H*0.038)+'px Arial';
    ctx.textAlign='right'; ctx.textBaseline='top';
    ctx.fillText(getPowerName(powerRight.type)+' '+rem2+'s', PLX+PLW-WL*2-4, PLY+WL*2);
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

// --- Gólháló rajzolás (a gólvonal mögött, kifelé) ---
// lineX = gólvonal X, gy/gh = nyílás teteje/magassága, dir = -1 bal (balra), +1 jobb (jobbra)
function drawGoalNet(lineX, gy, gh, dir) {
  var avail = (dir < 0 ? lineX : (W - lineX)) - 2;
  var want = (BALL_VANISH || BR*2) + BR;   // a háló addig ér, ameddig a labda gurul
  var depth = Math.min(want, avail);
  if (depth <= 0) return;
  var x1 = lineX + dir*depth;
  ctx.save();
  // háttér (mélység érzet)
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(Math.min(lineX,x1), gy, depth, gh);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  var step = Math.max(6, BR*0.55);
  // függőleges szálak
  for (var d=0; d<=depth; d+=step) {
    var xx = lineX + dir*d;
    ctx.beginPath(); ctx.moveTo(xx, gy); ctx.lineTo(xx, gy+gh); ctx.stroke();
  }
  // vízszintes szálak
  for (var yy=gy; yy<=gy+gh; yy+=step) {
    ctx.beginPath(); ctx.moveTo(lineX, yy); ctx.lineTo(x1, yy); ctx.stroke();
  }
  ctx.restore();
}

// --- Lángoló labda (power hit) ---
var fireTrailActive = false;
var fireTrail = [];   // [{x,y,age,r}] - tűzcsóva
var burnMarks = [];   // [{x,y,age}] - égett fű

