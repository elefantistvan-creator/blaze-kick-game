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

// ---------- ÜTŐ-SKINEK (6) ----------
// 13 PIXELEN CSAK SZÍN ÉS VILÁGOSSÁG LÁTSZIK. Textúrát utánozni értelmetlen
// (kipróbáltuk fotókkal: márvány, kristály, bőr — mind ugyanaz a csík lett).
// Ezért mindegyik skin egy külön SZÍN + VILÁGOSSÁG párost foglal el:
//   Classic=kék · Chrome=világos szürke · Carbon=fekete
//   Neon=bíbor · Magma=narancs · Gold=arany
// A gép MINDIG Classic piros -> a te ütőd bármilyen színű lehet, nincs tévesztés.
// shadowBlur SEHOL: mobilon szoftveres elmosást kényszerít -> lag.
var PADDLE_SKINS = [
  { id:'classic', name:'Classic', price:0,   icon:'🟦',
    desc:'The one you started with.' },
  { id:'chrome',  name:'Chrome',  price:150, icon:'⬜',
    desc:'Polished steel. Bright and cold.' },
  { id:'carbon',  name:'Carbon',  price:200, icon:'⬛',
    desc:'Matte black. Says nothing, means it.' },
  { id:'neon',    name:'Neon',    price:280, icon:'🟣',
    desc:'Dark core, burning edge.' },
  { id:'magma',   name:'Magma',   price:350, icon:'🔥',
    desc:'It never cools down.' },
  { id:'gold',    name:'Gold',    price:500, icon:'🟨',
    desc:'For when the arena is finally full.' }
];

// ---------- LABDA-SKINEK (7) ----------
// SZABÁLY: a labda SOHA nem lehet sötét. Sötét labda a sötét pályán eltűnik,
// és akkor nem lehet játszani. Minden skin világos vagy erősen izzó.
var BALL_SKINS = [
  { id:'classic', name:'Classic',  price:0,   icon:'⚽',
    desc:'White leather, black pentagons.' },
  { id:'fireball',name:'Fireball', price:180, icon:'🔥',
    desc:'Burns as it flies.' },
  { id:'ice',     name:'Ice',      price:180, icon:'🧊',
    desc:'Pale blue, cracked through.' },
  { id:'neon',    name:'Neon',     price:260, icon:'🟣',
    desc:'Glowing rings on a dark core.' },
  { id:'toxic',   name:'Toxic',    price:300, icon:'🟢',
    desc:'Lime green. Hard to look away from.' },
  { id:'beach',   name:'Beach',    price:320, icon:'🏖️',
    desc:'Six colours. Nobody takes it seriously.' },
  { id:'gold',    name:'Gold',     price:450, icon:'🟡',
    desc:'Heavy on the eye, not on the pitch.' }
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
// OLCSÓ IZZÁS — shadowBlur NÉLKÜL
//
// A ctx.shadowBlur mobilon szoftveres elmosást kényszerít: minden
// frame-ben, minden pálcikánál. Ez okozta a lagot (mérve: alap
// skinekkel tökéletes, Neon/Magma mellett akadozik).
//
// Helyette: 2-3 egymásba írt körvonal / radiális gradiens. Ugyanaz a
// hatás, GPU-n fut, nagyságrenddel olcsóbb.
// ============================================================
function glowRect(sx, sy, sw, sh, col, strength) {
  // Kifelé halványuló keret — rajzolva, nem elmosva.
  var layers = [[3, 0.10], [2, 0.20], [1, 0.42]];
  for (var i = 0; i < layers.length; i++) {
    var pad = layers[i][0], a = layers[i][1] * strength;
    ctx.globalAlpha = a;
    ctx.strokeStyle = col;
    ctx.lineWidth = 1;
    ctx.strokeRect(sx - pad, sy - pad, sw + pad*2, sh + pad*2);
  }
  ctx.globalAlpha = 1;
}
function glowDisc(r, col, strength) {
  // Kifelé halványuló korona a labda körül — egyetlen radiális gradiens.
  var g = ctx.createRadialGradient(0, 0, r * 0.85, 0, 0, r * 1.7);
  g.addColorStop(0, col);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.55 * strength;
  ctx.beginPath(); ctx.arc(0, 0, r * 1.7, 0, Math.PI*2);
  ctx.fillStyle = g; ctx.fill();
  ctx.globalAlpha = 1;
}

// ============================================================
// RAJZ — ÜTŐ
// A drawPad() hívja. A GÉP mindig 'classic' -> a te színed szabad.
// ============================================================
function paintPad(sx, sy, sw, sh, col, now, override) {
  var s = override || equippedPaddle();
  if (s === 'chrome') return padChrome(sx, sy, sw, sh);
  if (s === 'carbon') return padCarbon(sx, sy, sw, sh);
  if (s === 'neon')   return padNeon(sx, sy, sw, sh, now);
  if (s === 'magma')  return padMagma(sx, sy, sw, sh, now);
  if (s === 'gold')   return padGold(sx, sy, sw, sh);
  return padClassic(sx, sy, sw, sh, col);
}

// Segéd: függőleges gradiens + fénysáv (a közös váz)
function padBase(sx, sy, sw, sh, c0, c1, c2, c3, shineA) {
  var g = ctx.createLinearGradient(sx, sy, sx+sw, sy);
  g.addColorStop(0.00, c0);
  g.addColorStop(0.35, c1);
  g.addColorStop(0.62, c2);
  g.addColorStop(1.00, c3);
  ctx.fillStyle = g; ctx.fillRect(sx, sy, sw, sh);
  if (shineA) {
    ctx.globalAlpha = shineA;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(sx + sw*0.10, sy, Math.max(1.5, sw*0.20), sh);
    ctx.globalAlpha = 1;
  }
}

function padClassic(sx, sy, sw, sh, col) {
  padBase(sx, sy, sw, sh,
    lightenColor(col, 45), col, col, darkenColor(col, 45), 0.30);
}

function padChrome(sx, sy, sw, sh) {
  // Világos szürke — a LEGVILÁGOSABB pálcika. Ez különbözteti meg.
  padBase(sx, sy, sw, sh, '#ffffff', '#c9d2d9', '#7b858f', '#e2e8ed', 0.45);
}

function padCarbon(sx, sy, sw, sh) {
  // Matt fekete — a LEGSÖTÉTEBB. Egy halvány perem, hogy ne olvadjon a pályába.
  padBase(sx, sy, sw, sh, '#3a4149', '#1b1f24', '#0d1014', '#262c33', 0.10);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, sw - 1, sh - 1);
}

function padNeon(sx, sy, sw, sh, now) {
  var pulse = 0.72 + 0.28 * Math.sin(now / 260);
  ctx.fillStyle = '#120a1c'; ctx.fillRect(sx, sy, sw, sh);   // sötét mag
  glowRect(sx, sy, sw, sh, '#d07bff', pulse);                // rajzolt izzás
  ctx.strokeStyle = 'rgba(228,168,255,' + (0.85*pulse).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.5, sw * 0.16);
  ctx.strokeRect(sx + ctx.lineWidth/2, sy + ctx.lineWidth/2,
                 sw - ctx.lineWidth, sh - ctx.lineWidth);
  ctx.globalAlpha = 0.4 * pulse;                             // belső fénymag
  ctx.fillStyle = '#e9c6ff';
  ctx.fillRect(sx + sw*0.38, sy + sh*0.03, Math.max(1, sw*0.24), sh*0.94);
  ctx.globalAlpha = 1;
}

function padMagma(sx, sy, sw, sh, now) {
  padBase(sx, sy, sw, sh, '#ffd27a', '#ff8a2b', '#d63a10', '#5c1405', 0);
  // izzó repedések: RAJZOLT vízszintes vonalak (13 px-en is látszanak)
  ctx.strokeStyle = 'rgba(255,244,200,0.8)';
  ctx.lineWidth = 1;
  var n = 5;
  for (var i = 0; i < n; i++) {
    var yy = sy + (i + 0.5) * sh / n + Math.sin(now/420 + i*1.7) * sh * 0.012;
    ctx.beginPath();
    ctx.moveTo(sx + sw*0.05, yy);
    ctx.lineTo(sx + sw*0.95, yy + sh*0.008);
    ctx.stroke();
  }
}

function padGold(sx, sy, sw, sh) {
  padBase(sx, sy, sw, sh, '#fff3c4', '#ffd75e', '#b8871f', '#ffe694', 0.42);
}

// ============================================================
// RAJZ — LABDA
// A drawBall() hívja, MÁR eltolt/forgatott rendszerben (közép = 0,0).
// SZABÁLY: soha nem lehet sötét. A labdát látni kell.
// ============================================================
function paintBall(r, ang, now, override) {
  var s = override || equippedBall();
  if (s === 'fireball') return ballFire(r, ang, now);
  if (s === 'ice')      return ballIce(r, ang, now);
  if (s === 'neon')     return ballNeon(r, ang, now);
  if (s === 'toxic')    return ballToxic(r, ang, now);
  if (s === 'beach')    return ballBeach(r, ang);
  if (s === 'gold')     return ballGold(r, ang);
  return ballClassic(r, ang);
}

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
  var ps = r*0.36, i, j, a;
  ctx.beginPath();
  for (i = 0; i < 5; i++) {
    a = (i*72-90)*Math.PI/180;
    if (i === 0) ctx.moveTo(Math.cos(a)*ps, Math.sin(a)*ps);
    else         ctx.lineTo(Math.cos(a)*ps, Math.sin(a)*ps);
  }
  ctx.closePath(); ctx.fill();
  for (var k = 0; k < 5; k++) {
    var rad = (k*72-90)*Math.PI/180;
    var cx = Math.cos(rad)*r*0.63, cy = Math.sin(rad)*r*0.63, ps2 = r*0.27;
    ctx.beginPath();
    for (j = 0; j < 5; j++) {
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
  glowDisc(r, 'rgba(255,130,30,0.55)', 0.85 + 0.15*Math.sin(now/180));
  ballSphere(r, '#fff6d5', '#ffc244', '#f2620f', '#a02c04');
  ballPentagons(r, ang, 'rgba(70,16,0,0.75)');
}
function ballIce(r, ang, now) {
  glowDisc(r, 'rgba(140,220,255,0.5)', 0.9);
  ballSphere(r, '#ffffff', '#e8f8ff', '#a8dff5', '#5fa3c4');
  ctx.save();
  ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 1;
  for (var i = 0; i < 6; i++) {
    var a = i * Math.PI/3;
    ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(Math.cos(a)*r, Math.sin(a)*r); ctx.stroke();
  }
  ctx.restore();
}
function ballNeon(r, ang, now) {
  var pulse = 0.75 + 0.25 * Math.sin(now/220);
  glowDisc(r, 'rgba(200,120,255,0.6)', pulse);        // az IZZÁS teszi láthatóvá
  ballSphere(r, '#6a4f96', '#3a2b58', '#221a33', '#150f21');
  ctx.save();
  ctx.rotate(ang);
  ctx.strokeStyle = 'rgba(225,160,255,' + (0.95*pulse).toFixed(2) + ')';
  ctx.lineWidth = Math.max(1.2, r*0.12);
  for (var i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, r*0.88, r*0.30, i * Math.PI/3, 0, Math.PI*2);
    ctx.stroke();
  }
  ctx.restore();
}
function ballToxic(r, ang, now) {
  var pulse = 0.8 + 0.2 * Math.sin(now/160);
  glowDisc(r, 'rgba(150,255,60,0.55)', pulse);
  ballSphere(r, '#f4ffd8', '#c6f542', '#7ec81e', '#3f6b0c');
  ballPentagons(r, ang, 'rgba(25,55,5,0.6)');
}
function ballBeach(r, ang) {
  // Hat cikk, váltakozó színek — a legjobban látható labda.
  ballSphere(r, '#ffffff', '#f4f4f4', '#d8d8d8', '#a8a8a8');
  var cols = ['#e53935','#fdd835','#43a047','#1e88e5','#fb8c00','#8e24aa'];
  ctx.save();
  ctx.rotate(ang);
  ctx.beginPath(); ctx.arc(0,0,r,0,Math.PI*2); ctx.clip();
  for (var i = 0; i < 6; i++) {
    ctx.globalAlpha = 0.82;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, i*Math.PI/3, (i+1)*Math.PI/3);
    ctx.closePath();
    ctx.fillStyle = cols[i]; ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
function ballGold(r, ang) {
  glowDisc(r, 'rgba(255,215,90,0.4)', 0.8);
  ballSphere(r, '#fff8d8', '#ffdf78', '#c99a2c', '#7a5a10');
  ballPentagons(r, ang, 'rgba(85,58,6,0.75)');
}
