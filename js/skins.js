// ============================================================
// SKINEK — ütő, labda, pálya
//
// ELV (fontos, ne lazítsunk rajta):
//   A skin SOHA nem befolyásolja a játékmenetet. Se méret, se
//   sebesség, se ütközés. Tiszta hiúság.
//   Ezért lehet érméért venni anélkül, hogy a season-ív sérülne:
//   a season 3 pofonját nem lehet megvásárolni.
//
// A PÁLYA-SKIN külön eset:
//   Stage módban a pályát a SEASON diktálja (seasons.js) — az az ív,
//   ahhoz nem nyúlunk. A pálya-skin csak ott él, ahol nincs ív:
//   2 Player, és később az 1 Player Endless.
//   A PITCH_SKINS tábla most ÜRES — nincs extra pályakép. Amint
//   beteszed az elsőt, a bolt kategóriája magától megjelenik.
//
// Az ütő és a labda tiszta rajz: nulla asset, nulla letöltés.
// ============================================================

// ---------- ÜTŐ-SKINEK ----------
// A rajz a drawPad()-ből kapja a base színt (kék = te, piros = gép).
// A skin ezt a színt DOLGOZZA FEL — így a két oldal továbbra is
// megkülönböztethető marad, bármilyen skin van rajta.
var PADDLE_SKINS = [
  { id:'classic', name:'Classic',  price:0,   icon:'🟦',
    desc:'The one you started with.' },
  { id:'chrome',  name:'Chrome',   price:150, icon:'⬜',
    desc:'Polished metal. Hard light, hard edges.' },
  { id:'carbon',  name:'Carbon',   price:200, icon:'⬛',
    desc:'Woven carbon fibre. Matte, serious.' },
  { id:'neon',    name:'Neon',     price:280, icon:'💠',
    desc:'Dark core, glowing rim.' },
  { id:'magma',   name:'Magma',    price:350, icon:'🔥',
    desc:'It never cools down.' },
  { id:'gold',    name:'Gold',     price:500, icon:'🟨',
    desc:'For when the arena is finally full.' }
];

// ---------- LABDA-SKINEK ----------
var BALL_SKINS = [
  { id:'classic', name:'Classic',  price:0,   icon:'⚽',
    desc:'White leather, black pentagons.' },
  { id:'fireball',name:'Fireball', price:180, icon:'🔥',
    desc:'Burns as it flies.' },
  { id:'ice',     name:'Ice',      price:180, icon:'🧊',
    desc:'Pale blue, crystalline.' },
  { id:'neon',    name:'Neon',     price:260, icon:'🟣',
    desc:'Dark sphere, glowing seams.' },
  { id:'gold',    name:'Gold',     price:450, icon:'🟡',
    desc:'Heavy on the eye, not on the pitch.' }
];

// ---------- PÁLYA-SKINEK ----------
// Egy sor = egy pálya. Formátum azonos a seasons.js-szel:
//   { id, name, price, file, frame:[GL,GR,GT,GB] }
// ÜRES, amíg nincs extra pályakép. A bolt kategóriája automatikusan
// eltűnik, ha ez a tömb üres — nem mutatunk üres polcot.
var PITCH_SKINS = [
  // példa, ha majd lesz kép:
  // { id:'night', name:'Night match', price:600, file:'skin-night.jpg',
  //   frame:[0.126, 0.876, 0.123, 0.869], desc:'Floodlights, no daylight.' }
];

function skinList(cat) {
  if (cat === 'paddle') return PADDLE_SKINS;
  if (cat === 'ball')   return BALL_SKINS;
  if (cat === 'pitch')  return PITCH_SKINS;
  return [];
}
function skinById(cat, id) {
  var l = skinList(cat);
  for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
  return l[0] || null;
}

// ---------- Aktuálisan viselt ----------
function equippedPaddle() { return Progress.equipped('paddle'); }
function equippedBall()   { return Progress.equipped('ball');   }
function equippedPitch()  { return Progress.equipped('pitch');  }

// ============================================================
// RAJZ — ÜTŐ
// A drawPad() hívja. sx,sy,sw,sh = a pálcika téglalapja,
// col = az alapszín (kék/piros), heat = 0..1 hőizzás.
// ============================================================
function paintPad(sx, sy, sw, sh, col, now, override) {
  var s = override || equippedPaddle();

  if (s === 'chrome')  return padChrome(sx, sy, sw, sh, col);
  if (s === 'carbon')  return padCarbon(sx, sy, sw, sh, col);
  if (s === 'neon')    return padNeon(sx, sy, sw, sh, col, now);
  if (s === 'magma')   return padMagma(sx, sy, sw, sh, col, now);
  if (s === 'gold')    return padGold(sx, sy, sw, sh, col);
  return padClassic(sx, sy, sw, sh, col);
}

function padClassic(sx, sy, sw, sh, col) {
  var g = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  g.addColorStop(0, lightenColor(col, 40));
  g.addColorStop(0.4, col);
  g.addColorStop(1, darkenColor(col, 40));
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillRect(sx, sy, sw*0.35, sh);
}

function padChrome(sx, sy, sw, sh, col) {
  // Fém: éles, sávos tükröződés. A base szín csak enyhe árnyalatot ad.
  var g = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  g.addColorStop(0.00, '#f2f5f8');
  g.addColorStop(0.22, '#ffffff');
  g.addColorStop(0.34, '#9aa4ad');
  g.addColorStop(0.52, '#e6ebef');
  g.addColorStop(0.72, '#79838d');
  g.addColorStop(1.00, '#cfd6dc');
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  // az oldal jelzése: vékony színes perem (kell, hogy tudd, kié)
  ctx.fillStyle = col;
  ctx.fillRect(sx, sy, sw, Math.max(2, sh*0.03));
  ctx.fillRect(sx, sy+sh-Math.max(2, sh*0.03), sw, Math.max(2, sh*0.03));
}

function padCarbon(sx, sy, sw, sh, col) {
  ctx.fillStyle = '#1b1f24'; ctx.fillRect(sx, sy, sw, sh);
  ctx.save();
  ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  // szövet: átlós kockák
  var step = Math.max(3, sw * 0.42);
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
  for (var y = sy - sw; y < sy + sh + sw; y += step) {
    ctx.beginPath(); ctx.moveTo(sx, y); ctx.lineTo(sx+sw, y+sw); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(sx, y+sw); ctx.lineTo(sx+sw, y); ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(sx, sy, sw*0.28, sh);
  ctx.fillStyle = col;                       // oldaljelző perem
  ctx.fillRect(sx, sy, Math.max(2, sw*0.16), sh);
}

function padNeon(sx, sy, sw, sh, col, now) {
  var pulse = 0.72 + 0.28 * Math.sin(now / 260);
  ctx.fillStyle = '#0a0d11'; ctx.fillRect(sx, sy, sw, sh);
  ctx.save();
  ctx.shadowColor = col; ctx.shadowBlur = 16 * pulse;
  ctx.strokeStyle = lightenColor(col, 60);
  ctx.lineWidth = Math.max(1.5, sw * 0.16);
  ctx.strokeRect(sx + ctx.lineWidth/2, sy + ctx.lineWidth/2,
                 sw - ctx.lineWidth, sh - ctx.lineWidth);
  ctx.restore();
  ctx.globalAlpha = 0.35 * pulse;
  ctx.fillStyle = col;
  ctx.fillRect(sx + sw*0.35, sy + sh*0.04, sw*0.3, sh*0.92);
  ctx.globalAlpha = 1;
}

function padMagma(sx, sy, sw, sh, col, now) {
  var g = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  g.addColorStop(0.0, '#ffd27a');
  g.addColorStop(0.3, '#ff8a2b');
  g.addColorStop(0.7, '#d63a10');
  g.addColorStop(1.0, '#5c1405');
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  // izzó repedések
  ctx.save();
  ctx.beginPath(); ctx.rect(sx, sy, sw, sh); ctx.clip();
  ctx.strokeStyle = 'rgba(255,240,180,0.75)';
  ctx.lineWidth = 1;
  var n = 6;
  for (var i = 0; i < n; i++) {
    var yy = sy + (i + 0.5) * sh / n + Math.sin(now/400 + i) * sh*0.01;
    ctx.beginPath();
    ctx.moveTo(sx, yy);
    ctx.lineTo(sx + sw*0.5, yy - sh*0.015);
    ctx.lineTo(sx + sw, yy + sh*0.01);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = col; ctx.fillRect(sx, sy, Math.max(2, sw*0.12), sh);
}

function padGold(sx, sy, sw, sh, col) {
  var g = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  g.addColorStop(0.00, '#fff3c4');
  g.addColorStop(0.25, '#ffd75e');
  g.addColorStop(0.45, '#c9962a');
  g.addColorStop(0.62, '#ffe694');
  g.addColorStop(1.00, '#8a6412');
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(sx+sw*0.06, sy, sw*0.14, sh);
  ctx.fillStyle = col;
  ctx.fillRect(sx, sy, sw, Math.max(2, sh*0.025));
  ctx.fillRect(sx, sy+sh-Math.max(2, sh*0.025), sw, Math.max(2, sh*0.025));
}

// ============================================================
// RAJZ — LABDA
// A drawBall() hívja, MÁR eltolt/forgatott koordinátarendszerben
// (a labda közepe = 0,0). r = sugár, ang = a forgás szöge.
// ============================================================
function paintBall(r, ang, now, override) {
  var s = override || equippedBall();
  if (s === 'fireball') return ballFire(r, ang, now);
  if (s === 'ice')      return ballIce(r, ang, now);
  if (s === 'neon')     return ballNeon(r, ang, now);
  if (s === 'gold')     return ballGold(r, ang);
  return ballClassic(r, ang);
}

// közös: gömb-gradiens + forgó pentagon-minta
function ballSphere(r, c0, c1, c2, c3) {
  var g = ctx.createRadialGradient(-r*0.35, -r*0.35, r*0.05, 0, 0, r);
  g.addColorStop(0, c0); g.addColorStop(0.3, c1);
  g.addColorStop(0.7, c2); g.addColorStop(1, c3);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
  ctx.fillStyle = g; ctx.fill();
}
function ballPentagons(r, ang, fill) {
  ctx.save();
  ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2); ctx.clip();
  ctx.fillStyle = fill;
  // közép
  ctx.beginPath();
  var ps = r*0.36;
  for (var i = 0; i < 5; i++) {
    var a = (i*72-90)*Math.PI/180;
    if (i === 0) ctx.moveTo(Math.cos(a)*ps, Math.sin(a)*ps);
    else         ctx.lineTo(Math.cos(a)*ps, Math.sin(a)*ps);
  }
  ctx.closePath(); ctx.fill();
  // körben 5
  for (var k = 0; k < 5; k++) {
    var rad = (k*72-90)*Math.PI/180;
    var cx = Math.cos(rad)*r*0.63, cy = Math.sin(rad)*r*0.63, ps2 = r*0.27;
    ctx.beginPath();
    for (var j = 0; j < 5; j++) {
      var a2 = (j*72-90)*Math.PI/180;
      if (j === 0) ctx.moveTo(cx+Math.cos(a2)*ps2, cy+Math.sin(a2)*ps2);
      else         ctx.lineTo(cx+Math.cos(a2)*ps2, cy+Math.sin(a2)*ps2);
    }
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

function ballClassic(r, ang) {
  ballSphere(r, '#ffffff', '#e8e8e8', '#c0c0c0', '#888888');
  ballPentagons(r, ang, '#222');
}
function ballFire(r, ang, now) {
  ctx.save();
  ctx.shadowColor = 'rgba(255,120,20,0.9)';
  ctx.shadowBlur = r * (0.9 + 0.25 * Math.sin(now/180));
  ballSphere(r, '#fff6d5', '#ffc244', '#f2620f', '#7a1c02');
  ctx.restore();
  ballPentagons(r, ang, 'rgba(60,12,0,0.85)');
}
function ballIce(r, ang, now) {
  ctx.save();
  ctx.shadowColor = 'rgba(127,216,255,0.8)';
  ctx.shadowBlur = r * 0.7;
  ballSphere(r, '#ffffff', '#dff4ff', '#9fd9ef', '#4a8fae');
  ctx.restore();
  // repedések a pentagon helyett
  ctx.save();
  ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1;
  for (var i = 0; i < 6; i++) {
    var a = i * Math.PI/3;
    ctx.beginPath(); ctx.moveTo(0,0);
    ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r);
    ctx.stroke();
  }
  ctx.restore();
}
function ballNeon(r, ang, now) {
  var pulse = 0.7 + 0.3 * Math.sin(now/220);
  ballSphere(r, '#3a2f52', '#241d38', '#15111f', '#08060d');
  ctx.save();
  ctx.rotate(ang);
  ctx.shadowColor = '#c56bff'; ctx.shadowBlur = 12 * pulse;
  ctx.strokeStyle = 'rgba(210,140,255,' + pulse.toFixed(2) + ')';
  ctx.lineWidth = Math.max(1, r*0.09);
  for (var i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r*0.9, r*0.32, i * Math.PI/3, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();
}
function ballGold(r, ang) {
  ballSphere(r, '#fff8d8', '#ffdf78', '#c99a2c', '#6d4d0c');
  ballPentagons(r, ang, 'rgba(90,62,8,0.8)');
}
