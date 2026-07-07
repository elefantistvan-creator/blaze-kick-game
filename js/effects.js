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

