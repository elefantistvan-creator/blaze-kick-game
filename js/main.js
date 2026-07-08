
function loop() {
  if (running) { updateAI(); updateBall(); updateBallRotation(); }
  draw();
  requestAnimationFrame(loop);
}

function endGame(won) {
  running = false;
  var earned = 0;
  lastCoinReward = 0;
  if (bkMode === 'stage') {
    // FONTOS: az "első teljesítés" a recordWin ELŐTT dől el
    var firstClear = (Progress.stars(currentStage) === 0);
    if (won) {
      earned = Progress.recordWin(currentStage, sc2);   // sc2 = kapott gólok
      lastCoinReward = coinsForMatch(true, currentStage, earned, firstClear);
    } else {
      Progress.recordLoss(currentStage);
      lastCoinReward = coinsForMatch(false, currentStage, 0, false);
    }
    Progress.addCoins(lastCoinReward);
  }
  Shop.reset();
  Screens.showResult(won, sc1, sc2, earned);
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
  Shop.reset();
  var po = document.getElementById('pauseOverlay');
  if (po) po.style.display = 'none';
  var ib = document.getElementById('itemBar'); if (ib) ib.style.display='none';
  Screens.show('menu');
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
  var ms = document.getElementById('menuScreen');    if (ms) ms.style.display='none';
  var ss = document.getElementById('stagesScreen');  if (ss) ss.style.display='none';
  var rs = document.getElementById('resultScreen');  if (rs) rs.style.display='none';
  var sh = document.getElementById('shopScreen');    if (sh) sh.style.display='none';

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

function showHowTo() {
  document.getElementById('howToOverlay').style.display = 'flex';
}
function hideHowTo() {
  document.getElementById('howToOverlay').style.display = 'none';
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



// Szünet gomb + overlay gombok
var pauseBtn = document.getElementById('pauseBtn');
if (pauseBtn) pauseBtn.addEventListener('pointerup', function(e){ e.stopPropagation(); e.preventDefault(); pauseGame(); });
bindBtn('resumeBtn', resumeGame);
bindBtn('exitBtn', exitToMenu);
var pauseOv = document.getElementById('pauseOverlay');
if (pauseOv) pauseOv.addEventListener('pointerdown', function(e){ e.stopPropagation(); });

// --- Új képernyők bekötése ---
bindBtn('miStage',        openStages);
bindBtn('miQuick',        startQuick);
bindBtn('miShop',         openShop);
bindBtn('shopBackBtn',    function(){ Screens.show('menu'); });
bindBtn('miSettings',     function(){ Screens.show('settings'); });
bindBtn('miHow',          showHowTo);
bindBtn('miExit',         exitGame);
bindBtn('stagesBackBtn',  function(){ Screens.show('menu'); });
bindBtn('settingsBackBtn',function(){ Screens.show('menu'); });
bindBtn('resetProgressBtn', resetProgress);
bindBtn('resultRetryBtn', retryStage);
bindBtn('resultNextBtn',  nextStage);
bindBtn('resultMenuBtn',  backToMenu);

window.addEventListener('resize', function(){ if(running) setup(); });
setup(); loop();
