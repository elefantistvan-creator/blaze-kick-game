// --- Rajzolás ---
function draw() {
  if (typeof updateBonusBanner === 'function') updateBonusBanner();   // 2P: mi az aktív bónusz
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

  // === Dekor-sáv háttér (a kereten kívül, sötét — a kép betöltéséig) ===
  ctx.fillStyle = '#0c0c12';
  ctx.fillRect(0,0,W,H);

  if (pitchImgReady) {
    // === Pályakép: a HOMOGÉN FELÜLETE a játéktérre + a KAPUKRA feszül ===
    // (a kapu a kereten kívülre nyúlik, de még a pálya felületén álljon, ne a lelátón)
    var IW = pitchImg.naturalWidth, IH = pitchImg.naturalHeight;
    var gl = PITCH_GL*IW, gt = PITCH_GT*IH;
    var gw = (PITCH_GR-PITCH_GL)*IW, gh = (PITCH_GB-PITCH_GT)*IH;
    var GD = GOAL_DEPTH || 0;
    var sx = (PLW + 2*GD)/gw;        // vízszintesen a kapuk is beleférnek
    var sy = PLH/gh;                 // függőlegesen a keretig
    var dw = IW*sx, dh = IH*sy;
    var dx = (PLX - GD) - gl*sx, dy = PLY - gt*sy;
    ctx.drawImage(pitchImg, dx, dy, dw, dh);
    if (isNight) {  // esti hangulat: enyhe sötétítés + reflektor a labdára
      ctx.fillStyle='rgba(0,0,10,0.28)'; ctx.fillRect(0,0,W,H);
      var rgrad = ctx.createRadialGradient(bx,by,0,bx,by,PLH*0.4);
      rgrad.addColorStop(0,'rgba(255,255,220,0.16)');
      rgrad.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=rgrad; ctx.fillRect(0,0,W,H);
    }
  } else {
    // === Placeholder pálya (amíg a kép betölt) ===
    ctx.save(); ctx.beginPath(); ctx.rect(PLX, PLY, PLW, PLH); ctx.clip();
    if (isNight) {
      ctx.fillStyle='#0a1a0a'; ctx.fillRect(PLX,PLY,PLW,PLH);
      ctx.fillStyle='rgba(255,255,255,0.03)';
      var sw=PLW/8;
      for(var i=0;i<8;i+=2) ctx.fillRect(PLX+i*sw,PLY,sw,PLH);
    } else {
      ctx.fillStyle='#2e7d32'; ctx.fillRect(PLX,PLY,PLW,PLH);
      ctx.fillStyle='rgba(0,0,0,0.05)';
      var sw2=PLW/8;
      for(var i2=0;i2<8;i2+=2) ctx.fillRect(PLX+i2*sw2,PLY,sw2,PLH);
    }
    ctx.restore();
  }

  // Kapuk fix méret (a kapuméret-bónuszok törölve); csak a fal-kapuvédő (11/12) marad
  var dLGY=GY, dLGH=GH, dRGY=GY, dRGH=GH;
  var leftWalled  = (isPowerActive(powerLeft)  && powerLeft.type===11) ||
                    (isPowerActive(powerRight) && powerRight.type===12);
  var rightWalled = (isPowerActive(powerRight) && powerRight.type===11) ||
                    (isPowerActive(powerLeft)  && powerLeft.type===12);

  var RX = PLX + PLW;              // jobb gólvonal X
  var LW = Math.max(2, WL*LINE_SCALE);          // vonalvastagság (fele)

  // Gólhálók (a gólvonal mögött, kifelé) — ERŐS fehér, NEM halványul
  drawGoalNet(PLX, dLGY, dLGH, -1);
  drawGoalNet(RX,  dRGY, dRGH, +1);

  // --- FELFESTÉS: külön réteg, sarkok felé halványulva, 50%-ban ráúsztatva ---
  buildMarkings(LW, dLGY, dLGH, dRGY, dRGH, leftWalled, rightWalled);
  if (markCanvas) {
    ctx.save();
    ctx.globalAlpha = LINE_ALPHA;
    ctx.drawImage(markCanvas, 0, 0);
    ctx.restore();
  }

  // Kapusok + csatárok (1P: Shop-méret ; 2P: MR + bónusz)
  drawPad(px, py, szGoalieLeft(),  '#4fc3f7', 'p');
  if (!rGoalieGone())  drawPad(ax, ay, szGoalieRight(), '#ef5350', 'a');
  drawPad(mx, my, szStrikerLeft(),  '#29b6f6', 'm');
  if (!rStrikerGone()) drawPad(amx, amy, szStrikerRight(), '#e53935', 'am');

  // Bónuszlabda (2P) — arany gömb
  if (is2P && pb) {
    ctx.save();
    var pg = ctx.createRadialGradient(pb.x-pb.r*0.3, pb.y-pb.r*0.3, pb.r*0.1, pb.x, pb.y, pb.r);
    pg.addColorStop(0, '#fff6c8'); pg.addColorStop(0.5, '#ffd54f'); pg.addColorStop(1, '#ff9800');
    ctx.fillStyle = pg;
    ctx.shadowColor = 'rgba(255,180,40,0.8)'; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(pb.x, pb.y, pb.r, 0, Math.PI*2); ctx.fill();
    ctx.restore();
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
}

// --- Gólháló rajzolás (a gólvonal mögött, kifelé) ---
// lineX = gólvonal X, gy/gh = nyílás teteje/magassága, dir = -1 bal (balra), +1 jobb (jobbra)
function drawGoalNet(lineX, gy, gh, dir) {
  var avail = (dir < 0 ? lineX : (W - lineX)) - 2;
  var want = (BALL_VANISH || BR*2) + BR;   // a háló addig ér, ameddig a labda gurul
  var depth = Math.min(want, avail);
  if (depth <= 0) return;
  var x1 = lineX + dir*depth;
  var xL = Math.min(lineX, x1);
  ctx.save();
  ctx.globalAlpha = GOAL_ALPHA;          // a kapuból 50% áttetszőség levéve
  // háttér (mélység érzet)
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.fillRect(xL, gy, depth, gh);

  // --- HÁLÓ: erős fehér, sűrű keresztfonás ---
  var step = Math.max(4, BR*0.30);          // sűrűbb szemek
  ctx.strokeStyle = 'rgba(255,255,255,0.78)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (var d=0; d<=depth; d+=step) {        // függőleges szálak
    var xx = lineX + dir*d;
    ctx.moveTo(xx, gy); ctx.lineTo(xx, gy+gh);
  }
  for (var yy=gy; yy<=gy+gh; yy+=step) {    // vízszintes szálak
    ctx.moveTo(lineX, yy); ctx.lineTo(x1, yy);
  }
  ctx.stroke();

  // --- KAPUFA: határozott fehér keret (felső, alsó, hátsó él) ---
  var pw = Math.max(2.5, (typeof WL !== 'undefined' ? WL : 5) * 0.75);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = pw;
  ctx.lineCap = 'square';
  ctx.beginPath();
  ctx.moveTo(lineX, gy);        ctx.lineTo(x1, gy);          // felső kapufa
  ctx.moveTo(lineX, gy+gh);     ctx.lineTo(x1, gy+gh);       // alsó kapufa
  ctx.moveTo(x1, gy);           ctx.lineTo(x1, gy+gh);       // hátsó él
  ctx.stroke();
  ctx.restore();
}

// --- Lángoló labda (power hit) ---
var fireTrailActive = false;
var fireTrail = [];   // [{x,y,age,r}] - tűzcsóva
var burnMarks = [];   // [{x,y,age}] - égett fű


/* ============================================================
   FELFESTÉS — külön rétegen, gyorsítótárazva.
   - keret, középvonal, középkör
   - KAPUTERÜLET (16-os) + kis kapuelőtér (5-ös) + 11-ES PONT + büntetőív
   - a sarkok felé LINEÁRISAN halványul (középen 100% -> sarkokban CORNER_FADE)
   A kész réteget a draw() LINE_ALPHA-val (50%) úsztatja a pályára.
   ============================================================ */
function buildMarkings(LW, dLGY, dLGH, dRGY, dRGH, leftWalled, rightWalled) {
  var key = [W,H,PLX,PLY,PLW,PLH,LW,dLGY,dLGH,dRGY,dRGH,leftWalled,rightWalled].join('|');
  if (markKey === key && markCanvas) return;      // változatlan -> marad a gyorsítótár
  markKey = key;

  if (!markCanvas) { markCanvas = document.createElement('canvas'); markCtx = markCanvas.getContext('2d'); }
  if (markCanvas.width !== W || markCanvas.height !== H) { markCanvas.width = W; markCanvas.height = H; }
  var m = markCtx;
  m.clearRect(0,0,W,H);
  m.strokeStyle = '#ffffff';
  m.fillStyle   = '#ffffff';

  var RX  = PLX + PLW;
  var CXm = PLX + PLW/2, CYm = PLY + PLH/2;
  var tw  = Math.max(1, LW*0.6);       // vékonyabb vonalak (kör, ív, dobozok)

  // --- Keret: felső/alsó él (TELJES erő — ez a játékkeret) ---
  m.globalAlpha = 1;
  m.fillRect(PLX, PLY, PLW, LW);
  m.fillRect(PLX, PLY+PLH-LW, PLW, LW);

  // --- Oldalsó élek (kapuréssel, ha nincs fal-bónusz) — szintén a keret ---
  if (leftWalled) { m.fillRect(PLX, PLY, LW, PLH); }
  else {
    m.fillRect(PLX, PLY, LW, dLGY-PLY);
    m.fillRect(PLX, dLGY+dLGH, LW, (PLY+PLH)-(dLGY+dLGH));
  }
  if (rightWalled) { m.fillRect(RX-LW, PLY, LW, PLH); }
  else {
    m.fillRect(RX-LW, PLY, LW, dRGY-PLY);
    m.fillRect(RX-LW, dRGY+dRGH, LW, (PLY+PLH)-(dRGY+dRGH));
  }

  // --- Innen a TÖBBI felfestés: halványabb (a kerethez képest MARK_ALPHA) ---
  m.globalAlpha = MARK_ALPHA;

  // --- Középvonal (szaggatott) + középkör ---
  m.save();
  m.setLineDash([8,8]); m.lineWidth = tw;
  m.beginPath(); m.moveTo(CXm,PLY); m.lineTo(CXm,PLY+PLH); m.stroke();
  m.restore();
  m.lineWidth = tw;
  m.beginPath(); m.arc(CXm, CYm, PLH*0.135, 0, Math.PI*2); m.stroke();
  m.beginPath(); m.arc(CXm, CYm, Math.max(2, LW*0.9), 0, Math.PI*2); m.fill();  // kezdőpont

  // --- KAPUTERÜLET (16-os), kapuelőtér (5-ös), 11-es pont, büntetőív ---
  var PBW = PLW * 0.155;        // 16-os mélysége
  var PBH = PLH * 0.60;         // 16-os magassága
  var GBW = PLW * 0.055;        // 5-ös mélysége
  var GBH = PLH * 0.30;         // 5-ös magassága
  var SPOT = PLW * 0.105;       // 11-es pont távolsága a gólvonaltól
  var ARC  = PLH * 0.135;       // büntetőív sugara

  function box(x0, w, h) {   // téglalap a pálya közepére igazítva, függőlegesen
    m.strokeRect(x0, CYm - h/2, w, h);
  }
  m.lineWidth = tw;
  // bal oldal
  box(PLX, PBW, PBH);                                  // 16-os
  box(PLX, GBW, GBH);                                  // 5-ös
  m.beginPath(); m.arc(PLX+SPOT, CYm, Math.max(2, LW*0.8), 0, Math.PI*2); m.fill();   // 11-es pont
  // büntetőív: CSAK a 16-oson KÍVÜL látszik (a dobozon belüli része le van vágva)
  m.save();
  m.beginPath(); m.rect(PLX+PBW, PLY, PLW, PLH); m.clip();
  m.beginPath(); m.arc(PLX+SPOT, CYm, ARC, -Math.PI/2, Math.PI/2); m.stroke();
  m.restore();
  // jobb oldal (tükrözve)
  box(RX-PBW, PBW, PBH);
  box(RX-GBW, GBW, GBH);
  m.beginPath(); m.arc(RX-SPOT, CYm, Math.max(2, LW*0.8), 0, Math.PI*2); m.fill();
  m.save();
  m.beginPath(); m.rect(PLX, PLY, (RX-PBW)-PLX, PLH); m.clip();
  m.beginPath(); m.arc(RX-SPOT, CYm, ARC, Math.PI/2, Math.PI*1.5); m.stroke();
  m.restore();

  // --- CSATÁR-SÁVOK: a két csatár fix pályája (szaggatott, függőleges) ---
  m.save();
  m.setLineDash([6, 7]);
  m.lineWidth = Math.max(1, tw*0.85);
  m.beginPath();
  m.moveTo(PLX + PLW*0.27, PLY); m.lineTo(PLX + PLW*0.27, PLY+PLH);   // gép csatárja
  m.moveTo(PLX + PLW*0.73, PLY); m.lineTo(PLX + PLW*0.73, PLY+PLH);   // a te csatárod
  m.stroke();
  m.restore();

  // --- SAROK-HALVÁNYÍTÁS: középen teljes, a sarkok felé lineárisan CORNER_FADE-ig ---
  m.globalAlpha = 1;                                          // a maszk teljes erővel dolgozzon
  var maxR = Math.sqrt((PLW/2)*(PLW/2) + (PLH/2)*(PLH/2));   // középpont -> sarok
  var g = m.createRadialGradient(CXm, CYm, 0, CXm, CYm, maxR);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,' + CORNER_FADE + ')');
  m.save();
  m.globalCompositeOperation = 'destination-in';   // a meglévő felfestést maszkolja
  m.fillStyle = g;
  m.fillRect(0, 0, W, H);
  m.restore();
}
