function drawPad(x, y, halfH, col, padKey) {
  var now = Date.now();
  var squish = 0;
  if (hitEffect.pad === padKey) {
    var elapsed = now - hitEffect.time;
    if (elapsed < 200) squish = Math.sin(elapsed / 200 * Math.PI);
  }

  var victOffset = getVictoryOffset(padKey);

  var sw = PW * (1 + squish * 0.7);
  var sh = halfH * 2 * (1 - squish * 0.25);
  var sy = y - sh/2 + victOffset;
  var sx = x - sw/2;

  // Bónusz lángnyelvek - az ütő belső éléről
  var activePower = (padKey==='p'||padKey==='m') ? powerLeft : powerRight;
  var isPlayerPad = (padKey==='p'||padKey==='m');
  var bonusActive = activePower && isPowerActive(activePower);
  var isWarning = bonusActive && (activePower.endTime - Date.now() < 3000);

  // HŐIZZÁS — rajzolt, nem elmosott.
  // Volt: ctx.shadowBlur = heat*20  -> mobilon szoftveres elmosás, minden
  // felmelegedett pálcikánál, minden frame-ben. Ez a lag egyik forrása.
  var heat = padHeat[padKey] || 0;
  if (heat > 0.2) {
    ctx.save();
    var hc = heat > 0.7 ? '#ff4400' : '#ffcc00';
    if (typeof glowRect === 'function') glowRect(sx, sy, sw, sh, hc, heat);
    ctx.globalAlpha = heat * 0.35;
    ctx.fillStyle = hc;
    ctx.fillRect(sx-1, sy-1, sw+2, sh+2);
    ctx.restore();
  }

  if (bonusActive) {
    var now2 = Date.now();
    var flameX = isPlayerPad ? (sx + sw) : sx;  // belső él X
    var flameDir = isPlayerPad ? 1 : -1;         // jobbra vagy balra
    var rem2 = activePower.endTime - now2;
    var intensity = isWarning ? (0.5 + 0.5*Math.sin(now2/100)) : 0.85;

    ctx.save();
    // Több lángnyelv az ütő mentén
    var flameCount = 5;
    for (var fi=0; fi<flameCount; fi++) {
      var fy = sy + (fi/(flameCount-1))*sh;
      var flameH = (8+Math.random()*10) * intensity;
      var flameW = (4+Math.random()*4) * intensity;
      var wobble = Math.sin(now2/80 + fi*1.3) * 3;

      var fg = ctx.createRadialGradient(
        flameX + flameDir*flameW*0.3 + wobble, fy,
        0,
        flameX + flameDir*flameW*0.3 + wobble, fy,
        flameW*2
      );
      fg.addColorStop(0, isPlayerPad ? 'rgba(150,220,255,0.9)' : 'rgba(255,150,150,0.9)');
      fg.addColorStop(0.4, isPlayerPad ? 'rgba(50,150,255,0.7)' : 'rgba(255,80,80,0.7)');
      fg.addColorStop(1, 'rgba(0,0,0,0)');

      ctx.globalAlpha = intensity * 0.9;
      ctx.beginPath();
      ctx.ellipse(
        flameX + flameDir*flameW + wobble,
        fy,
        flameW, flameH*0.4,
        0, 0, Math.PI*2
      );
      ctx.fillStyle = fg;
      ctx.fill();
    }
    ctx.restore();
  }

  // Árnyék
  ctx.fillStyle='rgba(0,0,0,0.28)';
  ctx.fillRect(sx+2, sy+2, sw, sh);

  // ------------------------------------------------------------
  // FREEZE — a befagyasztott pálcika. Csak az ÜTŐN van hatás,
  // a pálya érintetlen marad (a felfestés és a season-kép a játék arca).
  //   1P: a Shop 'freeze' itemje  -> a gép mindkét pálcikája
  //   2P: a 'freezeFoe' bónusz     -> az ellenfél mindkét pálcikája
  // ------------------------------------------------------------
  if (isPadFrozen(padKey)) {
    drawFrozenPad(sx, sy, sw, sh, now);
    if (squish > 0.1) {
      ctx.fillStyle='rgba(255,255,255,' + (squish * 0.4) + ')';
      ctx.fillRect(sx, sy, sw, sh);
    }
    return;                       // se hőizzás, se szikra: jég van
  }

  // Pálcika festése — a viselt SKIN dönti (skins.js).
  // A skin CSAK a kinézetet változtatja: méret, ütközés, sebesség érintetlen.
  //
  // KIZÁRÓLAG A JÁTÉKOSÉ. A gép (és 2P-ben az ellenfél) MINDIG Classic.
  // Egy 500 érmés arany ütő nem jutalom, ha a gép is azt viseli. Ráadásul
  // így magától megkülönböztethető: az ellenfél mindig piros -> minden más TE vagy.
  var mySide = isPlayerPad;                    // 'p','m' = bal = te
  if (typeof paintPad === 'function') {
    paintPad(sx, sy, sw, sh, col, now, mySide ? undefined : 'classic');
  }
  else {                                            // tartalék: a klasszikus
    var pgrad = ctx.createLinearGradient(sx, sy, sx+sw, sy);
    pgrad.addColorStop(0, lightenColor(col, 40));
    pgrad.addColorStop(0.4, col);
    pgrad.addColorStop(1, darkenColor(col, 40));
    ctx.fillStyle = pgrad; ctx.fillRect(sx, sy, sw, sh);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillRect(sx, sy, sw*0.35, sh);
  }

  // Ha squish aktív: villanás
  if (squish > 0.1) {
    ctx.fillStyle='rgba(255,255,255,' + (squish * 0.4) + ')';
    ctx.fillRect(sx, sy, sw, sh);
  }

  // Ha nagyon forró: parázs szikrák
  if (heat > 0.8 && Math.random() > 0.7) {
    spawnSparks(x + (Math.random()-0.5)*sw, y + (Math.random()-0.5)*sh*0.5 + victOffset, 0, -1);
  }
}

// Melyik pálcika van befagyasztva?
//   1P: 'a' (gép kapus) és 'am' (gép csatár)
//   2P: a leképezés más — P1 = a/am (jobb), P2 = p/m (bal)
function isPadFrozen(padKey) {
  if (is2P) {
    if (padKey === 'a' || padKey === 'am') return frozenP1();
    return frozenP2();
  }
  if (typeof cpuFrozen !== 'function') return false;
  return cpuFrozen() && (padKey === 'a' || padKey === 'am');
}

// Jeges pálcika: jégkék test, fehér repedések, dér-halo, csillanó szemcsék.
function drawFrozenPad(sx, sy, sw, sh, now) {
  ctx.save();

  // Dér-halo — rajzolt keret, nem elmosás
  if (typeof glowRect === 'function') glowRect(sx, sy, sw, sh, '#9fe4ff', 1.0);
  ctx.fillStyle = 'rgba(180,232,255,0.22)';
  ctx.fillRect(sx-2, sy-3, sw+4, sh+6);

  // Jégtest
  var ig = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  ig.addColorStop(0,   '#dff4ff');
  ig.addColorStop(0.45,'#9fd9ef');
  ig.addColorStop(1,   '#5aa9c9');
  ctx.fillStyle = ig;
  ctx.fillRect(sx, sy, sw, sh);

  // Repedések (a pálcikán belülre vágva)
  ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 1;
  var lines = 7;
  for (var i = 0; i < lines; i++) {
    var yy = sy + (i + 0.5) * sh / lines;
    ctx.beginPath();
    ctx.moveTo(sx, yy);
    ctx.lineTo(sx + sw*0.55, yy - sh*0.02);
    ctx.lineTo(sx + sw, yy + sh*0.013);
    ctx.stroke();
  }
  ctx.beginPath();                       // hosszanti hasadás
  ctx.moveTo(sx + sw*0.4, sy);
  ctx.lineTo(sx + sw*0.6, sy + sh);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(sx+2, sy, 2.5, sh);       // fénysáv
  ctx.restore();

  // Peremjég
  ctx.strokeStyle = '#e8f8ff';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(sx, sy, sw, sh);

  // Csillanó szemcsék a széleken
  ctx.save();
  ctx.fillStyle = '#dff4ff';
  var t = now / 200;
  for (var k = 0; k < 5; k++) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(t + k * 1.3);
    ctx.beginPath();
    ctx.arc(sx + (k % 2 ? sw + 4 : -4), sy + 8 + k * (sh - 16) / 4, 1.6, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

function lightenColor(hex, amt) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgb('+Math.min(255,r+amt)+','+Math.min(255,g+amt)+','+Math.min(255,b+amt)+')';
}
function darkenColor(hex, amt) {
  var r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
  return 'rgb('+Math.max(0,r-amt)+','+Math.max(0,g-amt)+','+Math.max(0,b-amt)+')';
}

function drawBall(x,y,r) {
  var speed = Math.sqrt(bvx*bvx+bvy*bvy);
  var speedRatio = speed / (baseSpd * goalSpeedMult * 1.5);

  // Motion blur - gyors mozgásnál elnyújtott árnyék
  if (speedRatio > 0.5) {
    var blurLen = Math.min(speedRatio * r * 1.5, r * 2);
    var blurX = x - (bvx/speed) * blurLen;
    var blurY = y - (bvy/speed) * blurLen;
    var blurGrad = ctx.createLinearGradient(blurX, blurY, x, y);
    blurGrad.addColorStop(0, 'rgba(180,180,180,0)');
    blurGrad.addColorStop(1, 'rgba(200,200,200,0.25)');
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      (x+blurX)/2, (y+blurY)/2,
      r * 0.9, r * 0.5 + blurLen * 0.3,
      Math.atan2(bvy, bvx),
      0, Math.PI*2
    );
    ctx.fillStyle = blurGrad;
    ctx.fill();
    ctx.restore();
  }

  // Squish deformáció - origóban skálázva
  var sq = ballSquish * 0.55;
  var scaleX = 1 + sq;
  var scaleY = 1 - sq * 0.7;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ballSquishDir);
  ctx.scale(scaleX, scaleY);

  // Árnyék
  ctx.globalAlpha = 0.35;
  ctx.beginPath();
  ctx.ellipse(r*0.2, r*0.25, r*0.9, r*0.45, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fill();
  ctx.globalAlpha = 1;

  // Gömb + minta — a viselt LABDA-SKIN dönti (skins.js).
  // Már eltolt/forgatott rendszerben vagyunk: a labda közepe = (0,0).
  if (typeof paintBall === 'function') {
    paintBall(r, ballAngle, (typeof performance !== 'undefined') ? performance.now() : Date.now());
  } else {
    var grad = ctx.createRadialGradient(-r*0.35, -r*0.35, r*0.05, 0, 0, r);
    grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.3, '#e8e8e8');
    grad.addColorStop(0.7, '#c0c0c0'); grad.addColorStop(1, '#888888');
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
    ctx.fillStyle = grad; ctx.fill();
  }

  // Highlight
  var hgrad = ctx.createRadialGradient(-r*0.38, -r*0.38, 0, -r*0.2, -r*0.2, r*0.55);
  hgrad.addColorStop(0, 'rgba(255,255,255,0.75)');
  hgrad.addColorStop(0.5, 'rgba(255,255,255,0.15)');
  hgrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fillStyle = hgrad; ctx.fill();

  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.strokeStyle='rgba(80,80,80,0.5)'; ctx.lineWidth=1; ctx.stroke();

  ctx.restore();
}

function drawPentagon(cx,cy,r) {
  ctx.beginPath();
  for(var i=0;i<5;i++) {
    var a=(i*72-90)*Math.PI/180;
    var ppx=cx+Math.cos(a)*r, ppy=cy+Math.sin(a)*r;
    if(i===0) ctx.moveTo(ppx,ppy); else ctx.lineTo(ppx,ppy);
  }
  ctx.closePath(); ctx.fillStyle='#222'; ctx.fill();
}
