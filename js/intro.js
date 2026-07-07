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
