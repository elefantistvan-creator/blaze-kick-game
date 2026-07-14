function updateFireTrail() {
  if (!fireTrailActive) {
    // Fokozatosan elhal
    for (var i=fireTrail.length-1; i>=0; i--) {
      fireTrail[i].age -= 0.04;
      if (fireTrail[i].age <= 0) fireTrail.splice(i,1);
    }
    for (var j=burnMarks.length-1; j>=0; j--) {
      burnMarks[j].age -= 0.016;  // ~1mp alatt tűnik el
      if (burnMarks[j].age <= 0) burnMarks.splice(j,1);
    }
    return;
  }

  // Tűzcsóva részecskék
  for (var k=0; k<3; k++) {
    fireTrail.push({
      x: bx + (Math.random()-0.5)*BR*0.5,
      y: by + (Math.random()-0.5)*BR*0.5,
      vx: -bvx*0.1 + (Math.random()-0.5)*1.5,
      vy: (Math.random()-0.5)*2,
      age: 1.0,
      r: BR*(0.4+Math.random()*0.5)
    });
  }

  // Égett fű nyom
  if (Math.random() > 0.4) {
    burnMarks.push({
      x: bx + (Math.random()-0.5)*BR*1.5,
      y: by + BR*0.6,
      age: 1.0,
      r: BR*(0.3+Math.random()*0.4)
    });
  }

  // Frissítés
  for (var i=fireTrail.length-1; i>=0; i--) {
    fireTrail[i].x += fireTrail[i].vx;
    fireTrail[i].y += fireTrail[i].vy - 0.5;  // felfelé száll
    fireTrail[i].age -= 0.06;
    if (fireTrail[i].age <= 0) fireTrail.splice(i,1);
  }
  for (var j=burnMarks.length-1; j>=0; j--) {
    burnMarks[j].age -= 0.016;
    if (burnMarks[j].age <= 0) burnMarks.splice(j,1);
  }
}

function drawFireTrail() {
  // Égett fű
  for (var j=0; j<burnMarks.length; j++) {
    var b = burnMarks[j];
    ctx.save();
    ctx.globalAlpha = b.age * 0.6;
    ctx.beginPath();
    ctx.ellipse(b.x, b.y, b.r*1.5, b.r*0.5, 0, 0, Math.PI*2);
    ctx.fillStyle = '#1a0a00';
    ctx.fill();
    ctx.restore();
  }

  // Tűzcsóva
  for (var i=0; i<fireTrail.length; i++) {
    var f = fireTrail[i];
    ctx.save();
    ctx.globalAlpha = f.age * 0.85;
    var fg = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.r);
    fg.addColorStop(0, 'rgba(255,255,180,1)');
    fg.addColorStop(0.3, 'rgba(255,140,0,0.9)');
    fg.addColorStop(0.7, 'rgba(255,40,0,0.5)');
    fg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI*2);
    ctx.fillStyle = fg;
    ctx.fill();
    ctx.restore();
  }
}

function drawFireBall() {
  if (!fireTrailActive && fireTrail.length === 0) return;
  // Lángoló labda - sárgás/narancsos glow
  var intensity = fireTrailActive ? 1.0 : (fireTrail.length / 15);
  ctx.save();
  // Volt: ctx.shadowBlur = BR*3*intensity -> szoftveres elmosás minden frame-ben.
  // Helyette egy kifelé halványuló radiális gradiens: ugyanaz a korona, GPU-n.
  var halo = ctx.createRadialGradient(bx, by, BR*0.9, bx, by, BR*2.6);
  halo.addColorStop(0, 'rgba(255,140,20,' + (0.5*intensity).toFixed(2) + ')');
  halo.addColorStop(1, 'rgba(255,60,0,0)');
  ctx.beginPath(); ctx.arc(bx, by, BR*2.6, 0, Math.PI*2);
  ctx.fillStyle = halo; ctx.fill();
  ctx.globalAlpha = intensity;
  ctx.beginPath();
  ctx.arc(bx, by, BR*1.1, 0, Math.PI*2);
  var fg2 = ctx.createRadialGradient(bx-BR*0.3, by-BR*0.3, 0, bx, by, BR*1.1);
  fg2.addColorStop(0, 'rgba(255,255,200,0.9)');
  fg2.addColorStop(0.4, 'rgba(255,140,0,0.7)');
  fg2.addColorStop(1, 'rgba(255,40,0,0)');
  ctx.fillStyle = fg2;
  ctx.fill();
  ctx.restore();
}
var goalBalls = [];  // [{x,y,vx,vy,angle,settled}]

function spawnGoalBall(x, y, vx, vy, side) {
  // A labda a kapu mögötti zónába indul (canvas szélső sávjába)
  var startVX = side === 'left' ? -Math.abs(vx) * 0.9 : Math.abs(vx) * 0.9;
  goalBalls.push({
    x: x, y: y,
    vx: startVX,
    vy: vy * 0.7,
    angle: ballAngle,
    settled: false,
    side: side
  });
}

function updateGoalBalls() {
  // Sáv szélessége a canvas szélén (kb 70px-nek felel meg a canvas-on belül)
  var zoneW = Math.max(WL * 5, BR * 3);

  for (var i = 0; i < goalBalls.length; i++) {
    var b = goalBalls[i];
    if (b.settled) continue;

    b.vy += 0.45;       // gravitáció
    b.vx *= 0.98;
    b.x += b.vx;
    b.y += b.vy;
    b.angle += b.vx * 0.05 + b.vy * 0.02;

    // Bal zóna: 0..zoneW között pattog
    if (b.side === 'left') {
      if (b.x - BR < 0)      { b.x = BR;       b.vx =  Math.abs(b.vx) * 0.55; }
      if (b.x + BR > zoneW)  { b.x = zoneW-BR; b.vx = -Math.abs(b.vx) * 0.55; }
    }
    // Jobb zóna: W-zoneW..W között pattog
    if (b.side === 'right') {
      if (b.x + BR > W)        { b.x = W-BR;       b.vx = -Math.abs(b.vx) * 0.55; }
      if (b.x - BR < W-zoneW)  { b.x = W-zoneW+BR; b.vx =  Math.abs(b.vx) * 0.55; }
    }

    // Alján megáll - labdák egymáson is pihennek
    var floorY = H - BR;
    // Más labdák tetején is megállhat
    for (var j = 0; j < goalBalls.length; j++) {
      if (i === j || !goalBalls[j].settled) continue;
      var other = goalBalls[j];
      var dx = b.x - other.x;
      var dy = b.y - other.y;
      var dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < BR*2.1 && b.y < other.y) {
        floorY = Math.min(floorY, other.y - BR*2);
      }
    }

    if (b.y + BR >= floorY) {
      b.y = floorY - BR;
      b.vy *= -0.25;
      b.vx *= 0.6;
      if (Math.abs(b.vy) < 0.8 && Math.abs(b.vx) < 0.3) {
        b.vx = 0; b.vy = 0; b.settled = true;
      }
    }
  }
}

function drawGoalBalls() {
  for (var i = 0; i < goalBalls.length; i++) {
    var b = goalBalls[i];
    ctx.save();
    // Árnyék
    ctx.beginPath(); ctx.arc(b.x+2, b.y+2, BR, 0, Math.PI*2);
    ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.fill();
    // Labda
    ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI*2);
    ctx.fillStyle='white'; ctx.fill();
    // Forgó minta
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);
    ctx.translate(-b.x, -b.y);
    drawPentagon(b.x, b.y, BR*0.38);
    var angles=[0,72,144,216,288];
    for (var j=0; j<5; j++) {
      var rad=(angles[j]-90)*Math.PI/180;
      drawPentagon(b.x+Math.cos(rad)*BR*0.65, b.y+Math.sin(rad)*BR*0.65, BR*0.28);
    }
    // Keret
    ctx.beginPath(); ctx.arc(b.x, b.y, BR, 0, Math.PI*2);
    ctx.strokeStyle='#aaa'; ctx.lineWidth=1; ctx.stroke();
    ctx.restore();
  }
}

// Domborodás: melyik pálcika "nyomódott be" és mikor
var hitEffect = { pad: null, time: 0 }; // pad: 'p','m','a','am'

// --- Izzó ütő ---
var padHeat = {p:0, m:0, a:0, am:0};  // 0-1, hő szint
var padHitTimes = {p:[], m:[], a:[], am:[]};
function addPadHeat(padKey) {
  var now = Date.now();
  padHitTimes[padKey].push(now);
  // Csak az utolsó 2 másodperc ütéseit számoljuk
  padHitTimes[padKey] = padHitTimes[padKey].filter(function(t){ return now-t < 2000; });
  padHeat[padKey] = Math.min(padHitTimes[padKey].length / 5.0, 1.0);
}
function coolPads() {
  var keys = ['p','m','a','am'];
  for (var i=0; i<keys.length; i++) {
    padHeat[keys[i]] = Math.max(0, padHeat[keys[i]] - 0.008);
  }
}

// --- Porfelhő (fal ütésnél) ---
var dustClouds = [];
function spawnDust(x, y, vx) {
  for (var i=0; i<8; i++) {
    dustClouds.push({
      x: x, y: y + (Math.random()-0.5)*BR*2,
      vx: vx*0.3 + (Math.random()-0.5)*1.5,
      vy: (Math.random()-0.5)*1.5,
      r: BR*0.3 + Math.random()*BR*0.4,
      life: 1.0
    });
  }
}
function updateDust() {
  for (var i=dustClouds.length-1; i>=0; i--) {
    var d = dustClouds[i];
    d.x += d.vx; d.y += d.vy;
    d.r += 0.3;
    d.life -= 0.045;
    if (d.life <= 0) dustClouds.splice(i,1);
  }
}
function drawDust() {
  for (var i=0; i<dustClouds.length; i++) {
    var d = dustClouds[i];
    ctx.save();
    ctx.globalAlpha = d.life * 0.35;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(200,200,200,0.8)';
    ctx.fill();
    ctx.restore();
  }
}

// --- Shock wave (nagy sebesség) ---
var shockWaves = [];
function spawnShockWave(x, y) {
  shockWaves.push({ x:x, y:y, r:BR, life:1.0 });
}
function updateShockWaves() {
  for (var i=shockWaves.length-1; i>=0; i--) {
    shockWaves[i].r += 4;
    shockWaves[i].life -= 0.08;
    if (shockWaves[i].life <= 0) shockWaves.splice(i,1);
  }
}
function drawShockWaves() {
  for (var i=0; i<shockWaves.length; i++) {
    var s = shockWaves[i];
    ctx.save();
    ctx.globalAlpha = s.life * 0.5;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 2 * s.life;
    ctx.stroke();
    ctx.restore();
  }
}

// --- Kapu flash gólon ---
var goalGateFlash = {side: null, life: 0};
function triggerGateFlash(side) { goalGateFlash = {side: side, life: 1.0}; }
function drawGateFlash() {
  if (goalGateFlash.life <= 0) return;
  var x = goalGateFlash.side === 'left' ? 0 : W - WL*4;
  ctx.save();
  ctx.globalAlpha = goalGateFlash.life * 0.7;
  ctx.fillStyle = 'white';
  ctx.fillRect(x, GY, WL*4, GH);
  ctx.restore();
  goalGateFlash.life = Math.max(0, goalGateFlash.life - 0.07);
}

// --- Nyerő pálcika ugrás ---
var victoryJump = {side: null, startTime: 0};
function triggerVictoryJump(side) { victoryJump = {side: side, startTime: Date.now()}; }
function getVictoryOffset(padKey) {
  if (!victoryJump.side) return 0;
  var elapsed = Date.now() - victoryJump.startTime;
  if (elapsed > 800) { victoryJump.side = null; return 0; }
  var isLeft = (victoryJump.side === 'left') && (padKey === 'p' || padKey === 'm');
  var isRight = (victoryJump.side === 'right') && (padKey === 'a' || padKey === 'am');
  if (!isLeft && !isRight) return 0;
  return -Math.abs(Math.sin(elapsed / 800 * Math.PI * 3)) * BR * 0.8;
}

// --- Bónusz megjelenés animáció ---
var powerBallSpawnTime = 0;
function drawPowerBallSpawn() {
  if (!pb) return;
  var age = Date.now() - powerBallSpawnTime;
  if (age > 600) return;
  var scale = 1 + (1 - age/600) * 1.5;
  var alpha = age/600;
  ctx.save();
  ctx.globalAlpha = (1-alpha) * 0.6;
  ctx.beginPath();
  ctx.arc(pb.x, pb.y, pb.r * scale, 0, Math.PI*2);
  ctx.strokeStyle = '#ffd700';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();
}

// --- Bónusz lejárat figyelmeztetés ---
function drawPowerWarning() {
  var warn = null;
  if (isPowerActive(powerLeft)) {
    var rem = powerLeft.endTime - Date.now();
    if (rem < 3000) warn = {power: powerLeft, side: 'left', rem: rem};
  }
  if (isPowerActive(powerRight)) {
    var rem2 = powerRight.endTime - Date.now();
    if (rem2 < 3000) warn = {power: powerRight, side: 'right', rem: rem2};
  }
  if (!warn) return;
  var blink = Math.sin(Date.now()/150) > 0;
  if (!blink) return;
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = warn.side === 'left' ? '#4fc3f7' : '#ef5350';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// --- Drámai zene (14. gólnál) ---
var dramaticPlayed = false;
function checkDramatic() {
  var maxScore = Math.max(sc1, sc2);
  if (maxScore >= 14 && !dramaticPlayed) {
    dramaticPlayed = true;
    playDramatic();
  }
  if (maxScore < 14) dramaticPlayed = false;
}
function playDramatic() {
  if (!audioCtx) return;
  var notes = [220, 196, 174, 220];
  var times = [0, 0.3, 0.6, 0.9];
  for (var i=0; i<notes.length; i++) {
    (function(freq, t) {
      setTimeout(function() {
        playBeep(freq, 'sawtooth', 0.08, 0.25);
      }, t*1000);
    })(notes[i], times[i]);
  }
}

// Konfetti részecskék
var confetti = [];

// --- Gól effektek (4 féle véletlenszerűen) ---
var goalEffectParticles = [];
var goalStreaks = [];

function triggerGoalEffect(side) {
  var type = Math.floor(Math.random()*4);
  var gx = side==='left' ? WL*2 : W-WL*2;

  if (type===0) {
    // Tűzijáték - rakéták felfelé, robbanás
    for (var r=0; r<5; r++) {
      var rx = gx + (Math.random()-0.5)*W*0.2;
      var ry = H;
      var targetY = H*0.1 + Math.random()*H*0.4;
      (function(sx,sy,ty) {
        setTimeout(function() {
          // Robbanás a célponton
          var colors=['#ff5252','#ffeb3b','#69f0ae','#40c4ff','#ea80fc','#ff6d00','#fff'];
          for (var i=0;i<25;i++) {
            var angle=Math.random()*Math.PI*2;
            var spd2=2+Math.random()*5;
            goalEffectParticles.push({
              x:sx, y:ty,
              vx:Math.cos(angle)*spd2,
              vy:Math.sin(angle)*spd2,
              life:1.0, r:2+Math.random()*3,
              col:colors[Math.floor(Math.random()*colors.length)],
              type:'spark'
            });
          }
        }, r*150);
      })(rx,ry,targetY);
    }

  } else if (type===1) {
    // Robbanás a kapuban
    var colors2=['#ff6d00','#ffeb3b','#fff','#ff5252'];
    for (var i=0;i<60;i++) {
      var angle2=Math.random()*Math.PI*2;
      var spd3=3+Math.random()*8;
      goalEffectParticles.push({
        x:gx, y:GY+Math.random()*GH,
        vx:Math.cos(angle2)*spd3 * (side==='left'?1:-1),
        vy:Math.sin(angle2)*spd3,
        life:1.0, r:2+Math.random()*5,
        col:colors2[Math.floor(Math.random()*colors2.length)],
        type:'spark'
      });
    }

  } else if (type===2) {
    // Streak - fénycsíkok söpörnek végig
    var colors3=['#ff5252','#ffeb3b','#69f0ae','#40c4ff','#ea80fc'];
    for (var s=0;s<12;s++) {
      goalStreaks.push({
        x: side==='left' ? 0 : W,
        y: Math.random()*H,
        vx: (side==='left'?1:-1) * (8+Math.random()*12),
        life: 1.0,
        width: 3+Math.random()*5,
        col: colors3[Math.floor(Math.random()*colors3.length)]
      });
    }

  } else {
    // Cunami - részecske áradat a kapuból
    for (var i=0;i<80;i++) {
      var angle3=(Math.random()-0.5)*Math.PI*0.8;
      var spd4=4+Math.random()*10;
      var colors4=['#4fc3f7','#fff','#b3e5fc','#e1f5fe','#69f0ae'];
      goalEffectParticles.push({
        x:gx, y:GY+Math.random()*GH,
        vx:Math.cos(angle3)*spd4*(side==='left'?1:-1),
        vy:Math.sin(angle3)*spd4,
        life:1.0, r:1+Math.random()*4,
        col:colors4[Math.floor(Math.random()*colors4.length)],
        type:'wave'
      });
    }
  }
}

function updateGoalEffects() {
  for (var i=goalEffectParticles.length-1;i>=0;i--) {
    var p=goalEffectParticles[i];
    p.x+=p.vx; p.y+=p.vy;
    p.vy+=0.06;
    p.vx*=0.98;
    p.life-=0.007;
    if(p.life<=0) goalEffectParticles.splice(i,1);
  }
  for (var j=goalStreaks.length-1;j>=0;j--) {
    var s=goalStreaks[j];
    s.x+=s.vx;
    s.life-=0.012;
    if(s.life<=0) goalStreaks.splice(j,1);
  }
}

function drawGoalEffects() {
  for (var i=0;i<goalEffectParticles.length;i++) {
    var p=goalEffectParticles[i];
    ctx.save();
    ctx.globalAlpha=p.life;
    ctx.beginPath();
    ctx.arc(p.x,p.y,p.r*p.life,0,Math.PI*2);
    ctx.fillStyle=p.col;
    ctx.fill();
    ctx.restore();
  }
  for (var j=0;j<goalStreaks.length;j++) {
    var s=goalStreaks[j];
    ctx.save();
    ctx.globalAlpha=s.life*0.8;
    ctx.strokeStyle=s.col;
    ctx.lineWidth=s.width*s.life;
    ctx.beginPath();
    ctx.moveTo(s.x-s.vx*8,s.y);
    ctx.lineTo(s.x,s.y);
    ctx.stroke();
    ctx.restore();
  }
}

function spawnConfetti(side) {} // üres - konfetti helyett goalEffect

function updateConfetti() {
  for (var i = confetti.length-1; i >= 0; i--) {
    var p = confetti[i];
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.15; // gravitáció
    p.vx *= 0.98;
    p.rot += p.rspd;
    p.life -= 0.018;
    if (p.life <= 0) confetti.splice(i,1);
  }
}

function drawConfetti() {
  for (var i=0; i<confetti.length; i++) {
    var p = confetti[i];
    ctx.save();
    ctx.globalAlpha = p.life;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillStyle = p.col;
    ctx.fillRect(-p.r/2, -p.r/2, p.r, p.r*1.6);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

