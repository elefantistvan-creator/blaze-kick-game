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
var BONUS2P_TYPES = ['bigStriker','bigGoalie','slowFoe','freezeFoe'];   // mind a felvevőt segíti
// A Freeze 2P-ben külön időt kap (a többi bónusz 8 mp).
var BONUS2P_FREEZE_MS = 5000;

// --- A felvett bónusz KIÍRÁSA (eddig semmi nem jelezte, mit kaptál) ---
var BONUS2P_LABEL = {
  bigStriker: '📏 BIG STRIKER',
  bigGoalie:  '🧤 BIG KEEPER',
  slowFoe:    '🐢 SLOW OPPONENT',
  freezeFoe:  '❄️ FREEZE'
};
function bonus2PText(who) {
  var b = bonus2P[who];
  if (!b || Date.now() >= b.until) return '';
  var left = Math.ceil((b.until - Date.now()) / 1000);
  return (BONUS2P_LABEL[b.type] || b.type) + '  ' + left + 's';
}
// P1 = JOBB oldal (ax/amx), P2 = BAL oldal (px/mx)
function updateBonusBanner() {
  var bar = document.getElementById('bonusBanner');
  if (!bar) return;
  if (!is2P) { if (bar.style.display !== 'none') bar.style.display = 'none'; return; }
  var l = document.getElementById('bonusL'), r = document.getElementById('bonusR');
  var tl = bonus2PText('p2'), tr = bonus2PText('p1');
  if (l && l.textContent !== tl) { l.textContent = tl; l.style.display = tl ? 'inline-block' : 'none'; }
  if (r && r.textContent !== tr) { r.textContent = tr; r.style.display = tr ? 'inline-block' : 'none'; }
  var show = !!(tl || tr);
  bar.style.display = show ? 'flex' : 'none';
}

// ------------------------------------------------------------
// 2P TEMPÓ — a választott pálya EGYBEN sebességválasztás is.
// Saját tábla, NEM a kampány fűrészfog-görbéje: ott a seasonök között
// az AI erősödik, nem a labda (S1->S10 mindössze 1.00 -> 1.15).
// 2P-ben nincs AI, tehát a különbséget a labdának kell hoznia.
// Egy helyen hangolható.
// ------------------------------------------------------------
var P2_SPEED = [1.00, 1.06, 1.11, 1.17, 1.22, 1.28, 1.33, 1.39, 1.44, 1.50];
//               S1    S2    S3    S4    S5    S6    S7    S8    S9    S10
// (volt 1.00 -> 1.75; az 1.75 rally-vel 3.15x-ig ment fel — játszhatatlan)
var p2Season = 1;                       // a 2P-ben választott pálya (1..10)

function p2SpeedMult(s) {
  var i = Math.max(1, Math.min(SEASON_COUNT, s || 1)) - 1;
  return P2_SPEED[i] || 1;
}
// Villám-jelzés a pályaválasztón: ⚡ (S1-3) · ⚡⚡ (S4-7) · ⚡⚡⚡ (S8-10)
function p2Bolts(s) { return s <= 3 ? 1 : (s <= 7 ? 2 : 3); }

// Melyik season pályája választható? Amelyikbe a kampányban BELÉPTÉL.
function p2SeasonUnlocked(s) { return s <= seasonOf(Progress.unlockedMax()); }

function start2Player(season) {
  p2Season = (season && p2SeasonUnlocked(season)) ? season : 1;
  bkMode = 'twoplayer';
  is2P = true;
  currentStage = 1; stage = 1;   // a kampány-görbe 2P-ben nem érvényes (l. P2_SPEED)
  bonus2P = { p1:null, p2:null }; pb = null;
  Screens.show('game');
  loadSeasonPitch(p2Season);     // a választott pálya
  Sound.matchStart(p2Season);    // és a hozzá tartozó hangcsoport
  doStart();                     // közös indítás (countdown, setup); a 2P ágakat a mód kapcsolja
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
  var ms   = (type === 'freezeFoe') ? BONUS2P_FREEZE_MS : BONUS2P_MS;
  bonus2P[who] = { type:type, until:Date.now()+ms };
  pb = null; Sound.pickup(); Haptics.bonus(); triggerShake(6);
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
function slowP1() {
  if (bonus2PActive('p2','freezeFoe')) return 0;             // P2 befagyasztotta P1-et
  return bonus2PActive('p2','slowFoe') ? 0.5 : 1;
}
function slowP2() {
  if (bonus2PActive('p1','freezeFoe')) return 0;             // P1 befagyasztotta P2-t
  return bonus2PActive('p1','slowFoe') ? 0.5 : 1;
}
// Rajzoláshoz: be van-e fagyva az adott oldal? (p = bal/P2 pálcikák, a = jobb/P1)
function frozenP1() { return bonus2PActive('p2','freezeFoe'); }
function frozenP2() { return bonus2PActive('p1','freezeFoe'); }

// --- Egységes méret-feloldók (1P és 2P is ezeket hívja) ---
function szGoalieLeft()   { return is2P ? sizeP2Goalie()  : effPR(); }   // px/py
function szStrikerLeft()  { return is2P ? sizeP2Striker() : effMR(); }   // mx/my
function szGoalieRight()  { return is2P ? sizeP1Goalie()  : PR; }        // ax/ay
function szStrikerRight() { return is2P ? sizeP1Striker() : MR; }        // amx/amy
function rGoalieGone()  { return !is2P && cpuGoalieGone(); }
function rStrikerGone() { return !is2P && cpuStrikerGone(); }
