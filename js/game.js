var c = document.getElementById('c');
var ctx = c.getContext('2d');
var overlay = document.getElementById('overlay');
var s1El = document.getElementById('s1');
var s2El = document.getElementById('s2');
var startBtn = document.getElementById('startBtn');

// --- INTRO ANIMÁCIÓ ---
var LOGO_SRC = 'assets/logo.png';
var PLAY_SRC = 'assets/play.png';

(function() {
  var ic = document.getElementById('introCanvas');
  var ix = ic.getContext('2d');
  var W, H;
  var logoImg = new Image();
  var playImg = new Image();
  var imgsLoaded = 0;
  var animStarted = false;
  var startTime = 0;
  var playBtnShown = false;
  var sparks = [];

  logoImg.onload = playImg.onload = function() {
    imgsLoaded++;
    if (imgsLoaded === 2) startAnim();
  };
  logoImg.src = LOGO_SRC;
  playImg.src = PLAY_SRC;

  function resize() {
    W = ic.width  = window.innerWidth;
    H = ic.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function spawnSpark(x, y) {
    sparks.push({
      x:x, y:y,
      vx:(Math.random()-0.5)*6,
      vy:-2-Math.random()*4,
      life:1.0,
      r:2+Math.random()*4,
      col:Math.random()>0.5?'#ff6600':'#ffcc00'
    });
  }

  function startAnim() {
    animStarted = true;
    startTime = Date.now();
    loop();
  }

  function loop() {
    var elapsed = (Date.now() - startTime) / 1000;
    ix.clearRect(0,0,W,H);
    ix.fillStyle='#000'; ix.fillRect(0,0,W,H);

    // Logo animáció - balról csúszik be
    var isLandscape = W > H;
    var logoW = Math.min(W*0.85, H*1.8);
    var logoH = logoW * (logoImg.height / logoImg.width);
    var finalX = (W - logoW) / 2;
    var finalY = isLandscape ? (H*0.5 - logoH*0.85) : (H*0.5 - logoH*0.55);

    var logoX, logoAlpha;
    if (elapsed < 0.6) {
      // Becsúszik balról
      var t = elapsed / 0.6;
      var ease = 1 - Math.pow(1-t, 3);
      logoX = -logoW + (finalX + logoW) * ease;
      logoAlpha = t;
    } else {
      logoX = finalX;
      logoAlpha = 1.0;
    }

    // Logo rajzolás
    ix.save();
    ix.globalAlpha = logoAlpha;
    ix.drawImage(logoImg, logoX, finalY, logoW, logoH);
    ix.restore();

    // Szikrák a logóból
    if (elapsed > 0.3 && Math.random() > 0.4) {
      var sx = logoX + logoW * (0.5 + Math.random()*0.4);
      var sy = finalY + logoH * Math.random();
      spawnSpark(sx, sy);
    }

    // Szikrák frissítés és rajzolás
    for (var i=sparks.length-1;i>=0;i--) {
      var s=sparks[i];
      s.x+=s.vx; s.y+=s.vy; s.vy+=0.15;
      s.life-=0.035;
      if(s.life<=0){sparks.splice(i,1);continue;}
      ix.save();
      ix.globalAlpha=s.life*0.9;
      ix.beginPath();
      ix.arc(s.x,s.y,s.r*s.life,0,Math.PI*2);
      ix.fillStyle=s.col; ix.fill();
      ix.restore();
    }

    // Play gomb - 0.8s után jelenik meg
    if (elapsed > 0.8) {
      var playSize = Math.min(W, H) * (isLandscape ? 0.16 : 0.22);
      var playX = (W - playSize) / 2;
      var playY = finalY + logoH + H*(isLandscape ? 0.015 : 0.04);
      playY = Math.min(playY, H - playSize - H*0.06);
      var pulse = 0.9 + 0.1 * Math.sin(elapsed * 4);

      if (!playBtnShown) {
        playBtnShown = true;
        document.getElementById('playBtn').style.display = 'none'; // canvas-on rajzoljuk
      }

      ix.save();
      ix.globalAlpha = Math.min((elapsed-0.8)/0.4, 1.0);
      ix.translate(playX + playSize/2, playY + playSize/2);
      ix.scale(pulse, pulse);
      ix.drawImage(playImg, -playSize/2, -playSize/2, playSize, playSize);
      ix.restore();

      // Kattintható terület beállítása
      if (!ic._playRect) {
        ic._playRect = true;
        ic.style.cursor = 'pointer';
        // Pointer Events: egy kezelő fedi a touch-ot, egeret és touchpadot
        ic.addEventListener('pointerup', function(e) {
          e.preventDefault();
          var rect = ic.getBoundingClientRect();
          var cx = e.clientX - rect.left;
          var cy = e.clientY - rect.top;
          var ps = Math.min(W,H)*(isLandscape ? 0.16 : 0.22);
          var px2 = (W-ps)/2;
          var py2 = Math.min(finalY + logoH + H*(isLandscape ? 0.015 : 0.04), H - ps - H*0.06);
          if (cx>px2 && cx<px2+ps && cy>py2 && cy<py2+ps) startIntroExit();
        });
      }
    }

    requestAnimationFrame(loop);
  }
})();

function startIntroExit() {
  var intro = document.getElementById('intro');
  intro.style.transition = 'opacity 0.5s';
  intro.style.opacity = '0';
  setTimeout(function(){ intro.style.display='none'; }, 500);
}

// ============================================================
// ============================================================
// MULTIPLAYER - WebSocket szerver alapú (szerver számolja a fizikát)
// ============================================================
var WS_SERVER = 'wss://blaze-kick-server.onrender.com';

var mpMode = false;
var mpRole = null;
var mpCode = null;
var mpConnected = false;
var mpWs = null;
var mpSendTimer = null;

function mpSetStatus(msg) {
  var el = document.getElementById('mpStatus');
  if (el) el.textContent = msg;
}

function mpConnect(onOpen) {
  mpSetStatus('Connecting... (first launch may take ~30s)');
  var ws = new WebSocket(WS_SERVER);
  mpWs = ws;
  var connected = false;

  var timeout = setTimeout(function() {
    if (!connected) {
      mpSetStatus('Timed out - try again!');
      try { ws.close(); } catch(e) {}
    }
  }, 45000);

  ws.onopen = function() {
    connected = true;
    clearTimeout(timeout);
    mpSetStatus('Connected!');
    onOpen(ws);
  };

  ws.onmessage = function(e) {
    try {
      var msg = JSON.parse(e.data);

      if (msg.type === 'created') {
        document.getElementById('mpRoomCode').textContent = msg.code;
        document.getElementById('mpCreate').style.display = 'none';
        document.getElementById('mpWaiting').style.display = 'flex';
        document.getElementById('mpCancelBtn').style.display = 'none';
        mpSetStatus('Waiting for the other player...');
      }

      if (msg.type === 'start') {
        mpRole = msg.role;
        mpConnected = true;
        mpStartGame();
      }

      if (msg.type === 'state') {
        if (!mpMode) return;
        // Server sends the full state
        bx  = msg.bx * W;
        by  = msg.by * H;
        bvx = msg.bvx * W;
        bvy = msg.bvy * H;
        // Paddle positions
        py  = msg.h_py * H;
        my  = msg.h_my * H;
        ay  = msg.g_py * H;
        amy = msg.g_my * H;
        // Score
        if (msg.sc1 !== undefined) {
          sc1 = msg.sc1; sc2 = msg.sc2;
          if (s1El) s1El.textContent = sc1;
          if (s2El) s2El.textContent = sc2;
        }
      }

      if (msg.type === 'gameover') {
        running = false;
        var won = mpRole === 'host' ? msg.sc1 > msg.sc2 : msg.sc2 > msg.sc1;
        overlay.querySelector('h2').textContent = won ? '🏆 You won!' : '😞 You lost!';
        overlay.querySelectorAll('p')[0].textContent = won ? 'Congratulations!' : 'Try again!';
        overlay.querySelectorAll('p')[1].textContent = '';
        startBtn.textContent = '▶ Continue';
        overlay.style.display = 'flex';
        mpMode = false;
      }

      if (msg.type === 'error') {
        mpSetStatus(msg.msg || 'Error!');
      }

      if (msg.type === 'disconnect') {
        mpSetStatus('Opponent left.');
        mpMode = false;
        overlay.style.display = 'flex';
      }

    } catch(err) {}
  };

  ws.onerror = function() {
    clearTimeout(timeout);
    mpSetStatus('Connection error - try again!');
  };

  ws.onclose = function() {
    clearTimeout(timeout);
    if (!connected) mpSetStatus('Failed to connect - try again!');
    else if (mpMode) mpSetStatus('Connection lost.');
  };

  return ws;
}

function mpCreateRoom() {
  var code = Math.floor(1000 + Math.random()*9000).toString();
  mpCode = code;
  mpConnect(function(ws) {
    ws.send(JSON.stringify({ type: 'create', code: code }));
  });
}

function mpJoinRoom() {
  var code = prompt('Enter the 4-digit room code:');
  if (!code || code.trim().length !== 4) {
    if (code !== null) mpSetStatus('A 4-digit code is required!');
    return;
  }
  mpCode = code.trim();
  mpConnect(function(ws) {
    ws.send(JSON.stringify({ type: 'join', code: mpCode }));
  });
}

function mpStartGame() {
  overlay.style.display = 'none';
  document.getElementById('mpOverlay').style.display = 'none';
  mpMode = true;
  running = true;
  gameStartTime = Date.now();
  // Input küldés 30fps - csak ütők pozíciója
  mpSendTimer = setInterval(function() {
    if (!mpMode || !mpWs || mpWs.readyState !== 1) return;
    mpWs.send(JSON.stringify({
      type: 'input',
      py: py/H, my: my/H
    }));
  }, 33);
  // Játék inicializálás
  initAudio();
  isNight = Math.random() > 0.5;
  sc1=0; sc2=0;
  if (s1El) s1El.textContent='0';
  if (s2El) s2El.textContent='0';
  goalTime=0; spd=baseSpd;
  touchLeft=null; touchRight=null; lastLeftY=null; lastRightY=null;
  pb=null; powerLeft=null; powerRight=null;
  countdown=0;
  setup();
}

function mpCancel() {
  if (mpSendTimer) { clearInterval(mpSendTimer); mpSendTimer = null; }
  if (mpWs) { try { mpWs.close(); } catch(e){} mpWs = null; }
  mpMode=false; mpRole=null; mpCode=null; mpConnected=false;
  document.getElementById('mpOverlay').style.display = 'none';
  document.getElementById('mpCreate').style.display = 'flex';
  document.getElementById('mpWaiting').style.display = 'none';
  document.getElementById('mpCancelBtn').style.display = 'block';
  mpSetStatus('');
}

function showMpOverlay() {
  var el = document.getElementById('mpOverlay');
  el.style.display = 'flex';
  el.style.zIndex = '200';
}

// --- Hang ---
var audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBeep(freq, type, dur, vol) {
  if (!audioCtx) return;
  try {
    var o = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    o.connect(g); g.connect(audioCtx.destination);
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol||0.2, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch(e) {}
}

function soundHit()  { playBeep(280, 'square', 0.07, 0.22); }
function soundWall() { playBeep(160, 'sine', 0.05, 0.12); }
function soundGoal() {
  // Fanfár
  playBeep(523, 'sine', 0.12, 0.4);
  setTimeout(function(){ playBeep(659, 'sine', 0.12, 0.4); }, 100);
  setTimeout(function(){ playBeep(784, 'sine', 0.15, 0.4); }, 200);
  setTimeout(function(){ playBeep(1047,'sine', 0.30, 0.5); }, 320);
  // Közönség zaj - fehér zaj burst
  crowd();
}

function crowd() {
  if (!audioCtx) return;
  try {
    var bufSize = audioCtx.sampleRate * 1.2;
    var buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i=0; i<bufSize; i++) data[i] = (Math.random()*2-1) * 0.15;
    var src = audioCtx.createBufferSource();
    src.buffer = buf;
    // Sávszűrő: 800-3000Hz = emberi hangra hasonlít
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800;
    filter.Q.value = 0.8;
    var g = audioCtx.createGain();
    g.gain.setValueAtTime(0.0, audioCtx.currentTime);
    g.gain.linearRampToValueAtTime(0.4, audioCtx.currentTime + 0.1);
    g.gain.linearRampToValueAtTime(0.3, audioCtx.currentTime + 0.5);
    g.gain.linearRampToValueAtTime(0.0, audioCtx.currentTime + 1.2);
    src.connect(filter); filter.connect(g); g.connect(audioCtx.destination);
    src.start(); src.stop(audioCtx.currentTime + 1.2);
  } catch(e) {}
}

var W, H, GY, GH, WL;
var PR;   // kapus pálcika fél-magasság
var MR;   // mezőnyjátékos pálcika fél-magasság (rövidebb)
var PW;   // pálcika szélesség

// Játékos: kapus (bal fal) + mezőnyjátékos (30%-os vonal előtt)
var px, py;   // kapus pozíció
var mx, my;   // mezőnyjátékos pozíció

// Gép: kapus + mezőnyjátékos
var ax, ay;   // gép kapus
var amx, amy; // gép mezőnyjátékos

var bx, by, bvx, bvy, BR;
var sc1=0, sc2=0;
var spd, baseSpd;
var running=false, goalTime=0;

// Sebesség nyomonkövetés (csavar)
var prevPY=0, prevMY=0, prevAY=0, prevAmY=0;
var padVY=0, midVY=0, aiVY=0, aiMidVY=0;

// Multi-touch: két ujj egyszerre
var touchLeft=null, touchRight=null;
var lastLeftY=null, lastRightY=null;

// --- Screen shake ---
var shakeTime=0, shakeMag=0;
function triggerShake(mag) { shakeMag=mag; shakeTime=Date.now(); }

// --- Motion trail ---
var ballTrail = [];  // [{x,y,age}]
function updateTrail() {
  ballTrail.push({x:bx, y:by, age:1.0});
  if (ballTrail.length > 10) ballTrail.shift();
  for (var i=0; i<ballTrail.length; i++) ballTrail[i].age -= 0.08;
}
function drawTrail() {
  for (var i=0; i<ballTrail.length; i++) {
    var t = ballTrail[i];
    if (t.age <= 0) continue;
    ctx.save();
    ctx.globalAlpha = t.age * 0.35;
    ctx.beginPath();
    ctx.arc(t.x, t.y, BR * t.age * 0.8, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    ctx.restore();
  }
}

// --- Szikrák ütéskor ---
var sparks = [];
function spawnSparks(x, y, vx, vy) {
  for (var i=0; i<12; i++) {
    var angle = Math.random()*Math.PI*2;
    var spd2 = 2 + Math.random()*4;
    sparks.push({
      x:x, y:y,
      vx: Math.cos(angle)*spd2 + vx*0.3,
      vy: Math.sin(angle)*spd2 + vy*0.3,
      life: 1.0,
      color: Math.random()>0.5 ? '#fff' : '#ffd54f'
    });
  }
}
function updateSparks() {
  for (var i=sparks.length-1; i>=0; i--) {
    sparks[i].x += sparks[i].vx;
    sparks[i].y += sparks[i].vy;
    sparks[i].vy += 0.15;
    sparks[i].life -= 0.06;
    if (sparks[i].life <= 0) sparks.splice(i,1);
  }
}
function drawSparks() {
  for (var i=0; i<sparks.length; i++) {
    var s = sparks[i];
    ctx.save();
    ctx.globalAlpha = s.life;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 2*s.life, 0, Math.PI*2);
    ctx.fillStyle = s.color;
    ctx.fill();
    ctx.restore();
  }
}

// --- Gól flash ---
var goalFlash = 0;  // 0-1, elhalványul
function triggerGoalFlash() { goalFlash = 1.0; }
function drawGoalFlash() {
  if (goalFlash <= 0) return;
  ctx.save();
  ctx.globalAlpha = goalFlash * 0.45;
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  goalFlash = Math.max(0, goalFlash - 0.06);
}

// --- Score animáció ---
var scoreAnim = {left:0, right:0};  // 0-1 pulse
function triggerScoreAnim(side) {
  if (side==='left') scoreAnim.left=1.0;
  else scoreAnim.right=1.0;
}
function updateScoreAnim() {
  if (scoreAnim.left>0)  scoreAnim.left  = Math.max(0, scoreAnim.left  - 0.04);
  if (scoreAnim.right>0) scoreAnim.right = Math.max(0, scoreAnim.right - 0.04);
  var lEl = document.getElementById('s1');
  var rEl = document.getElementById('s2');
  if (lEl) {
    var ls = 1 + scoreAnim.left * 0.6;
    lEl.style.transform = 'scale('+ls+')';
    // Vezető száma nagyobb
    lEl.style.fontSize = (sc1 > sc2 ? 54 : 42) + 'px';
  }
  if (rEl) {
    var rs = 1 + scoreAnim.right * 0.6;
    rEl.style.transform = 'scale('+rs+')';
    rEl.style.fontSize = (sc2 > sc1 ? 54 : 42) + 'px';
  }
}

// --- Feszültség (közeleg a vége) ---
function drawTension() {
  var maxScore = Math.max(sc1, sc2);
  if (maxScore < 12) return;  // csak 12 gól felett
  var intensity = (maxScore - 12) / 3;  // 0..1 (12→13→14→15)
  intensity = Math.min(intensity, 1.0);
  var pulse = 0.5 + 0.5*Math.sin(Date.now()/200);
  ctx.save();
  ctx.globalAlpha = intensity * pulse * 0.15;
  ctx.fillStyle = '#ff1744';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// --- Labda árnyék ---
function drawBallShadow() {
  ctx.save();
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.ellipse(bx+BR*0.3, by+BR*0.4, BR*0.85, BR*0.4, 0, 0, Math.PI*2);
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fill();
  ctx.restore();
}

function setup() {
  var mid = document.getElementById('mid');
  W = mid.clientWidth;
  H = mid.clientHeight;
  c.width = W; c.height = H;

  WL  = Math.max(4, H * 0.015);
  PW  = WL * 1.4;          // pálcika szélesség
  PR  = H * 0.07;          // kapus fél-magasság
  MR  = H * 0.042;         // mezőnyjátékos fél-magasság (60%)
  GH  = H * 0.36;
  GY  = (H - GH) / 2;
  baseSpd = H * 0.006 * stageMult();
  spd = baseSpd;

  // Játékos pozíciók
  px = WL + PW/2;             py = H/2;
  mx = W * 0.40;              my = H/2;

  // Gép pozíciók
  ax  = W - WL - PW/2;        ay  = H/2;
  amx = W * 0.60;             amy = H/2;

  resetBall(1);
}

var isNight = true;
var ballAngle = 0;
var ballSpin = 0;      // forgási sebesség (csavar)
var ballSquish = 0;    // deformáció 0-1
var ballSquishDir = 0; // deformáció iránya (szög)
var countdown = 0;
var countdownStart = 0;
var goalSpeedMult = 1.0;
var lastGoalDir = 1;   // ki kapott gólt - ő kapja a bedobást

// --- Stage rendszer: minden meccs végén nő, labda + gép erősebb lesz ---
var stage = parseInt(localStorage.getItem('bk_stage'), 10) || 1;
function stageMult() { return 1 + (stage - 1) * 0.025; } // Stage1=1.0, Stage2=1.025, Stage3=1.05, ...

function updateBallRotation() {
  ballSpin *= 0.96;
  ballAngle += ballSpin * 0.3 + (bvx > 0 ? 1 : -1) * 0.015;
  ballSquish *= 0.82;
}

function resetBall(dir) {
  bx=W/2; by=H/2;
  var currentSpd = baseSpd * goalSpeedMult;
  bvx = currentSpd * (dir>0?1:-1);
  bvy = currentSpd * (Math.random()*0.4-0.2);
  BR = H * 0.022;
  spd = currentSpd;
  ballSpin = 0;
  ballSquish = 0;
}

// --- Multi-touch ---
var rsav = document.getElementById('rsav');
var lsav = document.getElementById('lsav');

// Koppintás detektálás
var touchStartTimes = {};
var touchStartY = {};
var TAP_MAX_MS = 180;    // max 180ms = tap
var TAP_MAX_MOVE = 8;    // max 8px mozgás = tap
var POWER_HIT_DIST = 5;  // 5px közelség az ütőhöz

// Csavar - utolsó mozgás sebessége
var lastLeftVY = 0;
var lastRightVY = 0;

function getTouchSide(clientX) {
  var lRect = lsav.getBoundingClientRect();
  var rRect = rsav.getBoundingClientRect();
  var mRect = document.getElementById('mid').getBoundingClientRect();
  if (clientX <= lRect.right || clientX < mRect.left + mRect.width * 0.45)
    return 'left';
  if (clientX >= rRect.left || clientX > mRect.left + mRect.width * 0.55)
    return 'right';
  return null;
}

function distToPad(padX, padY, halfH) {
  // Legközelebbi pont a téglalaphoz
  var cx = Math.max(padX-PW/2, Math.min(bx, padX+PW/2));
  var cy = Math.max(padY-halfH, Math.min(by, padY+halfH));
  return Math.sqrt((bx-cx)*(bx-cx)+(by-cy)*(by-cy));
}

var powerHitActive = false;
var prePowerHitVX = 0;  // power hit előtti sebesség

function doPowerHit(side) {
  if (!running) return;
  var threshold = BR * 2.5;
  if (side === 'left') {
    var dP = distToPad(px, py, PR);
    if (dP < threshold) {
      prePowerHitVX = bvx;
      bvx = Math.abs(bvx) * 2.5;
      powerHitActive = true;
      fireTrailActive = true;
      spawnSparks(bx, by, bvx, bvy);
      triggerShake(8);
      playBeep(440, 'square', 0.15, 0.1);
      hitEffect = {pad: 'p', time: Date.now()};
    }
  } else {
    var dM = distToPad(mx, my, MR);
    if (dM < threshold) {
      prePowerHitVX = bvx;
      bvx = Math.abs(bvx) * 2.5;
      powerHitActive = true;
      fireTrailActive = true;
      spawnSparks(bx, by, bvx, bvy);
      triggerShake(8);
      playBeep(440, 'square', 0.15, 0.1);
      hitEffect = {pad: 'm', time: Date.now()};
    }
  }
}

// --- Pointer Events alapú vezérlés (touch + egér + touchpad + toll) ---
console.log('%cBlaze Kick build: MODULAR-V1', 'color:#ff6600;font-weight:bold');
document.addEventListener('pointerdown', function(e) {
  // Input mezőnél, gombnál, mp overlay-nél és a leírás panelnél ne akadályozzuk meg az alapértelmezett viselkedést
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' ||
      document.getElementById('mpOverlay').style.display === 'flex' ||
      document.getElementById('howToOverlay').style.display === 'flex') return;
  e.preventDefault();
  var side = getTouchSide(e.clientX);
  if (side==='left'  && touchLeft===null)  {
    touchLeft=e.pointerId;  lastLeftY=e.clientY;
    touchStartTimes[e.pointerId] = Date.now();
    touchStartY[e.pointerId] = e.clientY;
    lastLeftVY = 0;
  }
  if (side==='right' && touchRight===null) {
    touchRight=e.pointerId; lastRightY=e.clientY;
    touchStartTimes[e.pointerId] = Date.now();
    touchStartY[e.pointerId] = e.clientY;
    lastRightVY = 0;
  }
});

document.addEventListener('pointermove', function(e) {
  if (e.target.tagName === 'INPUT' ||
      document.getElementById('mpOverlay').style.display === 'flex' ||
      document.getElementById('howToOverlay').style.display === 'flex') return;
  if (e.pointerId===touchLeft && lastLeftY!==null) {
    e.preventDefault();
    var d = (e.clientY - lastLeftY) * 1.5;
    lastLeftVY = e.clientY - lastLeftY;  // csavar sebessége
    py += d;
    py = Math.max(WL+PR, Math.min(H-WL-PR, py));
    lastLeftY = e.clientY;
  }
  if (e.pointerId===touchRight && lastRightY!==null) {
    e.preventDefault();
    var d = (e.clientY - lastRightY) * 1.5;
    lastRightVY = e.clientY - lastRightY;  // csavar sebessége
    my += d;
    my = Math.max(WL+MR, Math.min(H-WL-MR, my));
    lastRightY = e.clientY;
  }
});

function releasePointer(e, withTap) {
  if (withTap) {
    // Koppintás detektálás
    var elapsed = Date.now() - (touchStartTimes[e.pointerId] || 0);
    var moved = Math.abs(e.clientY - (touchStartY[e.pointerId] || e.clientY));
    if (elapsed < TAP_MAX_MS && moved < TAP_MAX_MOVE) {
      // Tap volt - erős ütés ha labda közel
      if (e.pointerId === touchLeft)  doPowerHit('left');
      if (e.pointerId === touchRight) doPowerHit('right');
    }
  }
  if (e.pointerId===touchLeft)  { touchLeft=null;  lastLeftY=null;  lastLeftVY=0; }
  if (e.pointerId===touchRight) { touchRight=null; lastRightY=null; lastRightVY=0; }
  delete touchStartTimes[e.pointerId];
  delete touchStartY[e.pointerId];
}

document.addEventListener('pointerup', function(e) {
  releasePointer(e, true);
});

// Megszakadt pointer (pl. rendszer elveszi a fókuszt) - ütő elengedése tap nélkül
document.addEventListener('pointercancel', function(e) {
  releasePointer(e, false);
});

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
    x: W/2, y: H/3 + Math.random()*H/3,
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
  if (type===1)  return '🥅 Small goal';
  if (type===2)  return '🥅 2x goal for them';
  if (type===3)  return '🧱 Goal walled off';
  if (type===4)  return '🌐 Full-court goal for them';
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

  if (pb.y - pb.r < WL)   { pb.y = WL+pb.r;   pb.vy = Math.abs(pb.vy); }
  if (pb.y + pb.r > H-WL) { pb.y = H-WL-pb.r; pb.vy = -Math.abs(pb.vy); }

  if (pb.x < -pb.r*2 || pb.x > W+pb.r*2) {
    pb = null; schedulePowerBall(); return;
  }

  var hitP = hitRect(px-PW/2,py-PR,PW,PR*2,pb.x,pb.y,pb.r) ||
             hitRect(mx-PW/2,my-MR,PW,MR*2,pb.x,pb.y,pb.r);
  var hitA = hitRect(ax-PW/2,ay-PR,PW,PR*2,pb.x,pb.y,pb.r) ||
             hitRect(amx-PW/2,amy-MR,PW,MR*2,pb.x,pb.y,pb.r);

  if (hitP || hitA) {
    // 6 pár: 1-10 + 11/12 (falazott kapu)
    var pairIdx = Math.floor(Math.random()*6); // 0-5
    var pairs = [1,3,5,7,9,11];
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

  // Kapu méretek (fizika)
  // powerLeft = játékos aktív hatása, powerRight = gép aktív hatása
  // Minden hatás az ellenfélre vonatkozik (elkapónak kedvező)
  var leftGY = GY, leftGH = GH;   // bal (játékos) kapu
  var rightGY = GY, rightGH = GH; // jobb (gép) kapu

  // Játékos aktív hatása → gép kapuját érinti:
  if (isPowerActive(powerLeft)) {
    if (powerLeft.type===1) { rightGY=GY+GH/4; rightGH=GH/2; }  // ellenfél kapuja feleződik
    if (powerLeft.type===2) { rightGY=GY-GH/2; rightGH=GH*2; }  // ellenfél kapuja duplázódik
    if (powerLeft.type===3) { rightGY=0; rightGH=H; }            // ellenfél kapuja teljes pálya
    if (powerLeft.type===4) { leftGY=0;  leftGH=H; }             // saját kapu teljes pálya (nehezítő)
  }
  // Gép aktív hatása → játékos kapuját érinti:
  if (isPowerActive(powerRight)) {
    if (powerRight.type===1) { leftGY=GY+GH/4;  leftGH=GH/2; }  // ellenfél kapuja feleződik
    if (powerRight.type===2) { leftGY=GY-GH/2;  leftGH=GH*2; }  // ellenfél kapuja duplázódik
    if (powerRight.type===3) { leftGY=0;  leftGH=H; }            // ellenfél kapuja teljes pálya
    if (powerRight.type===4) { rightGY=0; rightGH=H; }           // saját kapu teljes pálya (nehezítő)
  }

  // Falak fel/le - type 3 NEM érinti a felső/alsó falat, csak az oldalsó kapufal tűnik el
  var topWallLeft=WL, botWallLeft=WL, topWallRight=WL, botWallRight=WL;

  var tw = bx < W/2 ? topWallLeft  : topWallRight;
  var bw = bx < W/2 ? botWallLeft  : botWallRight;
  if (by-BR < tw)   { by=tw+BR;   bvy=Math.abs(bvy);  soundWall(); spawnDust(bx, tw, 0); ballSquish=0.8; ballSquishDir=Math.PI/2; }
  if (by+BR > H-bw) { by=H-bw-BR; bvy=-Math.abs(bvy); soundWall(); spawnDust(bx, H-bw, 0); ballSquish=0.8; ballSquishDir=Math.PI/2; }

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
    checkPost(WL, leftGY, true);           // bal felső kapufa
    checkPost(WL, leftGY+leftGH, true);    // bal alsó kapufa
  }
  if (!rBlocked) {
    checkPost(W-WL, rightGY, false);         // jobb felső kapufa
    checkPost(W-WL, rightGY+rightGH, false); // jobb alsó kapufa
  }

  // Bal fal / kapu
  if (bx-BR<WL) {
    var leftBlocked = (isPowerActive(powerLeft)  && powerLeft.type===11) ||
                      (isPowerActive(powerRight) && powerRight.type===12);
    if (!leftBlocked && by+BR>leftGY && by-BR<leftGY+leftGH) {
      sc2++; s2El.textContent=sc2; goalTime=Date.now();
      goalSpeedMult = Math.min(goalSpeedMult + 0.05, 3.0);
      powerHitActive = false; fireTrailActive = false; fireTrail = []; burnMarks = [];
      soundGoal(); spawnConfetti('left'); triggerGoalEffect('right');
      triggerGoalFlash(); triggerScoreAnim('right'); triggerShake(10);
      triggerGateFlash('left'); triggerVictoryJump('right'); checkDramatic();
      if (sc2>=7) { endGame(false); return; }
      setTimeout(function(){ resetBall(-1); }, 1100); return;  // bal kapott gólt, bal indít
    } else { bx=WL+BR; bvx=Math.abs(bvx); soundWall(); spawnDust(WL, by, 1); ballSquish=0.8; ballSquishDir=0; }
  }

  // Jobb fal / kapu
  if (bx+BR>W-WL) {
    var rightBlocked = (isPowerActive(powerRight) && powerRight.type===11) ||
                       (isPowerActive(powerLeft)  && powerLeft.type===12);
    if (!rightBlocked && by+BR>rightGY && by-BR<rightGY+rightGH) {
      sc1++; s1El.textContent=sc1; goalTime=Date.now();
      goalSpeedMult = Math.min(goalSpeedMult + 0.05, 3.0);
      powerHitActive = false; fireTrailActive = false; fireTrail = []; burnMarks = [];
      soundGoal(); spawnConfetti('right'); triggerGoalEffect('left');
      triggerGoalFlash(); triggerScoreAnim('left'); triggerShake(10);
      triggerGateFlash('right'); triggerVictoryJump('left'); checkDramatic();
      if (sc1>=7) { endGame(true); return; }
      setTimeout(function(){ resetBall(1); }, 1100); return;  // jobb kapott gólt, jobb indít
    } else { bx=W-WL-BR; bvx=-Math.abs(bvx); soundWall(); spawnDust(W-WL, by, -1); ballSquish=0.8; ballSquishDir=0; }
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
  ctx.shadowColor = '#ff6600';
  ctx.shadowBlur = BR * 3 * intensity;
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

  var heat = padHeat[padKey] || 0;
  if (heat > 0.2) {
    ctx.save();
    ctx.shadowColor = heat > 0.7 ? '#ff6600' : '#ffaa00';
    ctx.shadowBlur = heat * 20;
    ctx.globalAlpha = heat * 0.8;
    ctx.fillStyle = heat > 0.7 ? '#ff4400' : '#ffcc00';
    ctx.fillRect(sx-2, sy-2, sw+4, sh+4);
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

  // Pálcika alap - 3D gradient
  var pgrad = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  pgrad.addColorStop(0, lightenColor(col, 40));
  pgrad.addColorStop(0.4, col);
  pgrad.addColorStop(1, darkenColor(col, 40));
  ctx.fillStyle = pgrad;
  ctx.fillRect(sx, sy, sw, sh);

  // Fény sáv
  ctx.fillStyle='rgba(255,255,255,0.3)';
  ctx.fillRect(sx, sy, sw*0.35, sh);

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

  // 3D alap
  var grad = ctx.createRadialGradient(-r*0.35, -r*0.35, r*0.05, 0, 0, r);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.3, '#e8e8e8');
  grad.addColorStop(0.7, '#c0c0c0');
  grad.addColorStop(1, '#888888');
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fillStyle = grad; ctx.fill();

  // Forgó fociminta
  ctx.save();
  ctx.rotate(ballAngle);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.clip();
  // Pentagon origóban
  ctx.beginPath();
  var ps = r*0.36;
  for (var pi=0; pi<5; pi++) {
    var pa = (pi*72-90)*Math.PI/180;
    if (pi===0) ctx.moveTo(Math.cos(pa)*ps, Math.sin(pa)*ps);
    else ctx.lineTo(Math.cos(pa)*ps, Math.sin(pa)*ps);
  }
  ctx.closePath(); ctx.fillStyle='#222'; ctx.fill();
  var angles2=[0,72,144,216,288];
  for(var i=0;i<5;i++) {
    var rad=(angles2[i]-90)*Math.PI/180;
    var cx2=Math.cos(rad)*r*0.63, cy2=Math.sin(rad)*r*0.63;
    var ps2=r*0.27;
    ctx.beginPath();
    for (var pi2=0; pi2<5; pi2++) {
      var pa2=(pi2*72-90)*Math.PI/180;
      if (pi2===0) ctx.moveTo(cx2+Math.cos(pa2)*ps2, cy2+Math.sin(pa2)*ps2);
      else ctx.lineTo(cx2+Math.cos(pa2)*ps2, cy2+Math.sin(pa2)*ps2);
    }
    ctx.closePath(); ctx.fillStyle='#222'; ctx.fill();
  }
  ctx.restore();
  ctx.restore();

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

function loop() {
  if (running) {
    if (!mpMode) {
      // Normál mód: AI + fizika fut lokálisan
      updateAI(); updateBall(); updateBallRotation();
    } else {
      // Multiplayer: csak forgás animáció, fizika a szerveren fut
      updateBallRotation();
    }
  }
  draw();
  requestAnimationFrame(loop);
}

function endGame(won) {
  running=false;
  // Stage only increases on a win - stays the same on a loss
  if (won) {
    stage++;
    try { localStorage.setItem('bk_stage', stage); } catch(e) {}
  }
  overlay.querySelector('h2').textContent = won?'🏆 You won!':'💻 CPU wins!';
  overlay.querySelectorAll('p')[0].textContent = won?'Congratulations!':'Try again!';
  overlay.querySelectorAll('p')[1].textContent='Stage: ' + stage;
  startBtn.textContent='▶ Continue';
  overlay.style.display='flex';
}

function doStart() {
  initAudio();
  // Véletlenszerű napszak
  isNight = Math.random() > 0.5;
  var el=document.documentElement;
  if(el.requestFullscreen) el.requestFullscreen();
  else if(el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  sc1=0; sc2=0; s1El.textContent='0'; s2El.textContent='0';
  spd=baseSpd; goalTime=0; running=false; gameStartTime=0;
  touchLeft=null; touchRight=null; lastLeftY=null; lastRightY=null;
  pb=null; powerLeft=null; powerRight=null; goalBalls=[];
  fireTrail=[]; burnMarks=[];
  setup();
  overlay.style.display='none';

  // Visszaszámlálás 3-2-1
  countdown = 3; countdownStart = Date.now();
  var cdInterval = setInterval(function() {
    countdown--;
    if (countdown <= 0) {
      clearInterval(cdInterval);
      countdown = 0;
      running = true;
      gameStartTime = Date.now();
      schedulePowerBall();
    } else {
      countdownStart = Date.now();
    }
  }, 1000);
}

startBtn.addEventListener('pointerup', function(e) {
  e.stopPropagation(); e.preventDefault(); doStart();
});

function showHowTo() {
  document.getElementById('howToOverlay').style.display = 'flex';
}
function hideHowTo() {
  document.getElementById('howToOverlay').style.display = 'none';
}
var howToBtn = document.getElementById('howToBtn');
if (howToBtn) {
  howToBtn.addEventListener('pointerup', function(e){ e.stopPropagation(); e.preventDefault(); showHowTo(); });
}
var howToBackBtn = document.getElementById('howToBackBtn');
if (howToBackBtn) {
  howToBackBtn.addEventListener('pointerup', function(e){ e.stopPropagation(); e.preventDefault(); hideHowTo(); });
}
document.getElementById('howToOverlay').addEventListener('pointerdown', function(e){
  e.stopPropagation();
});

function bindBtn(id, fn) {
  var el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('pointerup', function(e){ e.stopPropagation(); e.preventDefault(); fn(); });
}

bindBtn('mpCreateBtn', mpCreateRoom);
bindBtn('mpJoinBtn', mpJoinRoom);
bindBtn('mpCancelBtn', mpCancel);
bindBtn('mpCancelWaitBtn', mpCancel);

document.getElementById('mpOverlay').addEventListener('pointerdown', function(e){
  if (e.target.tagName !== 'INPUT') e.stopPropagation();
});

window.addEventListener('resize', function(){ if(running) setup(); });
setup(); loop();
