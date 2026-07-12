// ============================================================
// TWO PLAYER — hot-seat, egy telefon, fekvő képernyő
//   Jobb fél = 1. játékos: kapus (jobb szél) + csatár EGYÜTT mozog
//   Bal fél  = 2. játékos: kapus (bal szél) + csatár EGYÜTT mozog
//   Változó-leképezés a meglévő pálcikákra:
//     P1 (jobb) -> ay (kapus, jobb szél) + amy (csatár, bal térfél)
//     P2 (bal)  -> py (kapus, bal szél)  + my  (csatár, jobb térfél)
//   Mindkét ütő a CSATÁR méretét (MR) kapja. A loop 2P-ben NEM hív AI-t.
//   Bónuszlabda visszatér: csak a KAPUS gyűjti be, a hatás a felvevőt segíti.
// ============================================================

var is2P = false;
var bonus2P = { p1:null, p2:null };   // {type, until} | null
var BONUS2P_MS = 8000;
var BONUS2P_TYPES = ['bigStriker','bigGoalie','slowFoe'];   // mind a felvevőt segíti

function start2Player() {
  bkMode = 'twoplayer';
  is2P = true;
  currentStage = 1; stage = 1;
  bonus2P = { p1:null, p2:null }; pb = null;
  Screens.show('game');
  loadSeasonPitch(1);        // 2P: Season 1 pálya
  Sound.matchStart(1);       // 2P: Season 1 hangulat
  doStart();                 // közös indítás (countdown, setup); a 2P ágakat a mód kapcsolja
  scheduleBonus2P();
}

// --- 2P méret: minden ütő MR (a goalie is) ---
function goalieSize(side) {
  // side: 'p1' (jobb kapus=ay) vagy 'p2' (bal kapus=py) vagy általános
  if (is2P) return MR;
  return PR;
}

// --- Bónuszlabda ---
function scheduleBonus2P() {
  if (!is2P) return;
  var delay = 6000 + Math.random()*9000;
  setTimeout(function(){
    if (is2P && running && !pb) spawnBonus2P();
    if (is2P) scheduleBonus2P();
  }, delay);
}
function spawnBonus2P() {
  var dirX = Math.random() > 0.5 ? 1 : -1;
  pb = { x:PLX+PLW/2, y:PLY+PLH*0.35 + Math.random()*PLH*0.3,
         vx:(H*0.0038)*dirX, vy:(H*0.0038)*(Math.random()>0.5?1:-1), r:MR*0.6 };
}
function updateBonus2P() {
  var now = Date.now();
  if (bonus2P.p1 && now > bonus2P.p1.until) bonus2P.p1 = null;
  if (bonus2P.p2 && now > bonus2P.p2.until) bonus2P.p2 = null;
  if (!pb) return;
  pb.x += pb.vx; pb.y += pb.vy;
  if (pb.y-pb.r < PLY)     { pb.y=PLY+pb.r;     pb.vy=Math.abs(pb.vy); }
  if (pb.y+pb.r > PLY+PLH) { pb.y=PLY+PLH-pb.r; pb.vy=-Math.abs(pb.vy); }
  if (pb.x < PLX-pb.r*3 || pb.x > PLX+PLW+pb.r*3) { pb=null; return; }
  // csak a kapusok gyűjthetik: P1 = jobb szél (ay), P2 = bal szél (py)
  if (padHit2P(PLX+PLW-PW/2, ay, pb)) { grantBonus2P('p1'); return; }
  if (padHit2P(PLX+PW/2,     py, pb)) { grantBonus2P('p2'); return; }
}
function padHit2P(padX, padY, ball) {
  var cx = Math.max(padX-PW/2, Math.min(ball.x, padX+PW/2));
  var cy = Math.max(padY-MR,   Math.min(ball.y, padY+MR));
  var dx = ball.x-cx, dy = ball.y-cy;
  return (dx*dx+dy*dy) < (ball.r*ball.r);
}
function grantBonus2P(who) {
  var type = BONUS2P_TYPES[Math.floor(Math.random()*BONUS2P_TYPES.length)];
  bonus2P[who] = { type:type, until:Date.now()+BONUS2P_MS };
  pb = null; Sound.goal(); triggerShake(6);
}
function bonus2PActive(who, type) {
  return bonus2P[who] && bonus2P[who].type===type && Date.now() < bonus2P[who].until;
}
function onGoal2P() { bonus2P = { p1:null, p2:null }; }

// --- Hatás-segédek a fizikának/rajznak (2P) ---
// P1 = ay(kapus)+amy(csatár) ; P2 = py(kapus)+my(csatár)
function sizeP1Goalie()  { return MR * (bonus2PActive('p1','bigGoalie')  ? 1.5 : 1); }
function sizeP1Striker() { return MR * (bonus2PActive('p1','bigStriker') ? 1.5 : 1); }
function sizeP2Goalie()  { return MR * (bonus2PActive('p2','bigGoalie')  ? 1.5 : 1); }
function sizeP2Striker() { return MR * (bonus2PActive('p2','bigStriker') ? 1.5 : 1); }
// lassítás: ha P1 vette fel a slowFoe-t, a P2 lassul (és fordítva)
function slowP1() { return bonus2PActive('p2','slowFoe') ? 0.5 : 1; }
function slowP2() { return bonus2PActive('p1','slowFoe') ? 0.5 : 1; }

// --- Egységes méret-feloldók (1P és 2P is ezeket hívja) ---
function szGoalieLeft()   { return is2P ? sizeP2Goalie()  : effPR(); }   // px/py
function szStrikerLeft()  { return is2P ? sizeP2Striker() : effMR(); }   // mx/my
function szGoalieRight()  { return is2P ? sizeP1Goalie()  : PR; }        // ax/ay
function szStrikerRight() { return is2P ? sizeP1Striker() : MR; }        // amx/amy
function rGoalieGone()  { return !is2P && cpuGoalieGone(); }
function rStrikerGone() { return !is2P && cpuStrikerGone(); }
