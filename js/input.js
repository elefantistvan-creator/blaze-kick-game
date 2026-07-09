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
      prePowerHitSpeed = Math.sqrt(bvx*bvx + bvy*bvy);
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
      prePowerHitSpeed = Math.sqrt(bvx*bvx + bvy*bvy);
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
// Nyitva van-e bármelyik UI réteg? (akkor a pointer a UI-é, nem a játéké)
function uiBlocking() {
  if (typeof Screens !== 'undefined' && Screens.anyOpen()) return true;
  var ids = ['howToOverlay','pauseOverlay'];
  for (var i=0;i<ids.length;i++) {
    var e = document.getElementById(ids[i]);
    if (e && e.style.display && e.style.display !== 'none') return true;
  }
  return false;
}

console.log('%cBlaze Kick build: MODULAR-V20', 'color:#ff6600;font-weight:bold');
document.addEventListener('pointerdown', function(e) {
  // Input mezőnél, gombnál, mp overlay-nél és a leírás panelnél ne akadályozzuk meg az alapértelmezett viselkedést
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || uiBlocking()) return;
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
  if (e.target.tagName === 'INPUT' || uiBlocking()) return;
  if (e.pointerId===touchLeft && lastLeftY!==null) {
    e.preventDefault();
    var d = (e.clientY - lastLeftY) * 1.5;
    lastLeftVY = e.clientY - lastLeftY;  // csavar sebessége
    py += d;
    var _pr = effPR();
    py = Math.max(PLY+_pr, Math.min(PLY+PLH-_pr, py));
    lastLeftY = e.clientY;
  }
  if (e.pointerId===touchRight && lastRightY!==null) {
    e.preventDefault();
    var d = (e.clientY - lastRightY) * 1.5;
    lastRightVY = e.clientY - lastRightY;  // csavar sebessége
    my += d;
    var _mr = effMR();
    my = Math.max(PLY+_mr, Math.min(PLY+PLH-_mr, my));
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

