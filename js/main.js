
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

// --- Immerzív: teljes képernyő visszakérése, ha a rendszer elvette ---
function reRequestFullscreen() {
  var el = document.documentElement;
  if (document.fullscreenElement || document.webkitFullscreenElement) return;
  if (el.requestFullscreen) { el.requestFullscreen().catch(function(){}); }
  else if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); }
}
// Ha játék közben felbukkant a rendszersáv (fullscreen elveszett), érintésre visszakérjük
document.addEventListener('pointerdown', function() {
  if (running && !paused && !document.fullscreenElement && !document.webkitFullscreenElement) {
    reRequestFullscreen();
  }
}, true);
document.addEventListener('visibilitychange', function() {
  if (!document.hidden && running && !paused) reRequestFullscreen();
});

// --- Szünet ---
function pauseGame() {
  if (!running || paused) return;
  paused = true; running = false;
  var po = document.getElementById('pauseOverlay');
  if (po) po.style.display = 'flex';
}
function resumeGame() {
  var po = document.getElementById('pauseOverlay');
  if (po) po.style.display = 'none';
  if (!paused) return;
  paused = false;
  reRequestFullscreen();
  running = true;
}
function exitToMenu() {
  paused = false; running = false;
  var po = document.getElementById('pauseOverlay');
  if (po) po.style.display = 'none';
  overlay.style.display = 'flex';
  startBtn.textContent = '⚽ Start Game';
}

function doStart() {
  initAudio();
  paused = false;
  var po = document.getElementById('pauseOverlay');
  if (po) po.style.display = 'none';
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

// Szünet gomb + overlay gombok
var pauseBtn = document.getElementById('pauseBtn');
if (pauseBtn) pauseBtn.addEventListener('pointerup', function(e){ e.stopPropagation(); e.preventDefault(); pauseGame(); });
bindBtn('resumeBtn', resumeGame);
bindBtn('exitBtn', exitToMenu);
var pauseOv = document.getElementById('pauseOverlay');
if (pauseOv) pauseOv.addEventListener('pointerdown', function(e){ e.stopPropagation(); });

window.addEventListener('resize', function(){ if(running) setup(); });
setup(); loop();
