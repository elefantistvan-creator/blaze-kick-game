// ============================================================
// SCREENS — képernyő-váltó + Stage rács + eredményképernyő
// Placeholder megjelenés; a stílus a css/ui.css tokenjeiből jön.
// ============================================================

var bkMode = 'stage';        // 'stage' = progresszió, 'quick' = gyors meccs
var currentStage = 1;        // épp játszott pálya
var lastCoinReward = 0;      // az utolsó meccs érme-jutalma
var lastCoinDoubled = false; // Double coins beváltva ezen a meccsen?

// Telepített appként fut? (TWA a Play Store-ból, vagy PWA a kezdőképernyőről)
// Csak ekkor van értelme a "Exit game" gombnak — böngészőfülön a window.close() nem működik.
function isStandalone() {
  try {
    if (document.referrer && document.referrer.indexOf('android-app://') === 0) return true;   // TWA
    if (navigator.standalone) return true;                                                      // iOS
    if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) return true;
    if (window.matchMedia && window.matchMedia('(display-mode: fullscreen)').matches) return true;
  } catch(e) {}
  return false;
}

function exitGame() {
  if (!window.confirm('Exit Blaze Kick?')) return;
  try { window.close(); } catch(e) {}
  // Ha a rendszer nem engedte bezárni, legalább ne maradjon félkész állapot
  setTimeout(function(){ running = false; paused = false; }, 100);
}

var Screens = (function() {

  var NAMES = ['menuScreen','stagesScreen','pitchScreen','resultScreen','settingsScreen','shopScreen'];
  function el(id) { return document.getElementById(id); }

  function hideAll() {
    for (var i=0;i<NAMES.length;i++) { var e = el(NAMES[i]); if (e) e.style.display='none'; }
  }

  // Van-e nyitva bármelyik UI réteg? (az input.js ebből tudja, hogy ne vegye el a görgetést)
  function anyOpen() {
    var ids = NAMES.concat(['pauseOverlay','howToOverlay']);
    for (var i=0;i<ids.length;i++) {
      var e = el(ids[i]);
      if (e && e.style.display && e.style.display !== 'none') return true;
    }
    return false;
  }

  function show(name) {
    hideAll();
    if (name === 'game') return;
    var e = el(name + 'Screen');
    if (!e) return;
    e.style.display = 'flex';
    if (name === 'menu')   refreshMenu();
    if (name === 'stages') buildGrid();
    if (name === 'pitch')  buildPitchGrid();
    if (name === 'shop')   buildShop();
    if (typeof Sound !== 'undefined') Sound.menu();   // menü-zene a menü-képernyőkön (nem indul újra, ha már szól)
  }

  // ---------- Shop ----------
  // ---------- Shop fülek: Boosts / Skins ----------
  var shopTab = 'boosts';
  function setShopTab(t) { shopTab = t; buildShop(); }

  function buildShopTabs(wrap) {
    var t = document.createElement('div');
    t.className = 'shop-tabs';
    [['boosts','⚡ Boosts'], ['skins','🎨 Skins']].forEach(function (p) {
      var b = document.createElement('div');
      b.className = 'shop-tab' + (shopTab === p[0] ? ' on' : '');
      b.textContent = p[1];
      b.addEventListener('pointerup', function (e) {
        e.stopPropagation(); e.preventDefault(); setShopTab(p[0]);
      });
      t.appendChild(b);
    });
    wrap.appendChild(t);
  }

  function buildShop() {
    // Nyitóajándék: egyszer, az első látogatáskor
    var gift = Progress.claimWelcome(ECON.WELCOME);
    var wrap = el('shopList');
    var cn = el('shopCoins');
    if (cn) cn.textContent = Progress.coins();
    if (!wrap) return;
    wrap.innerHTML = '';

    buildShopTabs(wrap);
    if (shopTab === 'skins') { buildSkinTab(wrap); return; }

    if (gift > 0) {
      var g = document.createElement('div');
      g.className = 'shop-gift';
      g.textContent = '🎁 Welcome gift: ' + gift + ' coins';
      wrap.appendChild(g);
    }

    var note = document.createElement('div');
    note.className = 'shop-note';
    note.innerHTML = 'A boost lasts until the next goal (max 30s). Up to ' +
                     Shop.maxActivations + ' per match.<br>' +
                     '<b>Pro</b> boosts last the <b>whole match</b>. ' +
                     '<b>Double coins</b> is not a boost — it pays out on your next win.';
    wrap.appendChild(note);

    for (var i=0;i<SHOP_ITEMS.length;i++) {
      wrap.appendChild(makeShopRow(SHOP_ITEMS[i]));
    }
  }

  function makeShopRow(it) {
    var row = document.createElement('div');
    row.className = 'shop-row tier-' + it.tier;

    var head = document.createElement('div');
    head.className = 'shop-head';
    var own = Progress.invCount(it.id);
    head.innerHTML = '<span class="shop-ico">' + it.icon + '</span>' +
                     '<span class="shop-name">' + it.name + '</span>' +
                     '<span class="shop-own' + (own > 0 ? ' has' : '') + '">×' + own + '</span>';
    row.appendChild(head);

    var d = document.createElement('div');
    d.className = 'shop-desc';
    d.textContent = it.desc;
    row.appendChild(d);

    var buys = document.createElement('div');
    buys.className = 'shop-buys';
    for (var p=0;p<SHOP_PACKS.length;p++) {
      (function(pack){
        var cost = packPrice(it.price, pack);
        var b = document.createElement('button');
        b.className = 'btn small' + (Progress.coins() >= cost ? ' primary' : '');
        if (Progress.coins() < cost) b.setAttribute('disabled','');
        b.innerHTML = '<span class="p-qty">×' + pack.qty + '</span>' +
                      '<span class="p-cost"><b>' + cost + '</b><img class="coin" src="assets/coin.svg" alt=""></span>' +
                      (pack.discount ? '<span class="p-disc">−' + Math.round(pack.discount*100) + '%</span>' : '');
        b.addEventListener('pointerup', function(e){
          e.stopPropagation(); e.preventDefault();
          if (Shop.buy(it.id, pack.qty)) {
            b.classList.add('flash');           // garantált fehér villanás
            setTimeout(buildShop, 160);         // csak utána épül újra a shop
          } else {
            b.classList.add('flash-deny');      // nincs elég érme -> piros villanás
            setTimeout(function(){ b.classList.remove('flash-deny'); }, 220);
          }
        });
        buys.appendChild(b);
      })(SHOP_PACKS[p]);
    }
    row.appendChild(buys);
    return row;
  }

  // ---------- Meccs közbeni aktiváló sáv ----------
  // A gombok állapota magától frissül: lejáró hatás / gól után újra aktiválható.
  var itemBarTimer = null;
  function startItemBarTicker() {
    if (itemBarTimer) return;
    itemBarTimer = setInterval(function(){
      var bar = el('itemBar');
      if (!bar || bar.style.display === 'none') return;
      var btns = bar.querySelectorAll('button[data-item]');
      for (var i=0;i<btns.length;i++) {
        var id = btns[i].getAttribute('data-item');
        var ok = Shop.canActivate(id);
        if (ok) btns[i].removeAttribute('disabled');
        else    btns[i].setAttribute('disabled','');
        // aktív hatás jelzése + hátralévő idő
        if (Shop.isActive(id)) { btns[i].classList.add('on'); btns[i].setAttribute('data-left', Shop.timeLeft(id)); }
        else                   { btns[i].classList.remove('on'); btns[i].removeAttribute('data-left'); }
      }
    }, 400);
  }

  function buildItemBar() {
    startItemBarTicker();
    var bar = el('itemBar');
    if (!bar) return;
    bar.innerHTML = '';
    if (bkMode !== 'stage') { bar.style.display = 'none'; return; }

    var any = false;
    for (var i=0;i<SHOP_ITEMS.length;i++) {
      var it = SHOP_ITEMS[i];
      if (it.tier === 'econ') continue;             // Double coins: nem meccs közbeni bónusz
      if (Progress.invCount(it.id) <= 0) continue;
      any = true;
      (function(item){
        var b = document.createElement('button');
        b.className = 'item-btn';
        b.innerHTML = '<span>' + item.icon + '</span><em>' + Progress.invCount(item.id) + '</em>';
        b.setAttribute('data-item', item.id);
        b.addEventListener('pointerup', function(e){
          e.stopPropagation(); e.preventDefault();
          if (Shop.activate(item.id)) buildItemBar();
        });
        if (!Shop.canActivate(item.id)) b.setAttribute('disabled','');
        bar.appendChild(b);
      })(it);
    }
    bar.style.display = any ? 'flex' : 'none';
  }

  // ---------- Főmenü ----------
  function refreshMenu() {
    var s = el('menuStars'), c = el('menuCoins');
    if (s) s.textContent = Progress.totalStars() + ' / ' + (MAX_STAGE*3);
    if (c) c.textContent = Progress.coins();
    // Kilépés gomb csak telepített appban (TWA/PWA), böngészőfülön nem működne
    var ex = el('miExit');
    if (ex) ex.style.display = isStandalone() ? 'flex' : 'none';
  }

  // ---------- Stage rács ----------
  // Egy sor = egy szezon (10 meccs). A szezonnyitó csempe lelakatolt bélyegkép.
  var gridBuilt = false;
  function buildGrid() {
    var head = el('stagesStars');
    if (head) head.textContent = '★ ' + Progress.totalStars() + ' / ' + (MAX_STAGE*3);
    var wrap = el('stagesGrid');
    if (!wrap) return;
    wrap.innerHTML = '';

    for (var s=1; s<=SEASON_COUNT; s++) {
      var sec = document.createElement('div');
      sec.className = 'season';

      var h = document.createElement('div');
      var firstStage = (s-1)*SEASON_LEN + 1;
      h.className = 'season-head' + (Progress.isUnlocked(firstStage) ? ' started' : '');
      h.innerHTML = '<span class="season-name">Season ' + s + '</span>' +
                    '<span class="season-sub">' + firstStage + '–' + (firstStage+SEASON_LEN-1) + '</span>';
      sec.appendChild(h);

      var row = document.createElement('div');
      row.className = 'season-row';
      for (var i=0; i<SEASON_LEN; i++) {
        row.appendChild(makeTile(firstStage + i));
      }
      sec.appendChild(row);
      wrap.appendChild(sec);
    }

    // Az első zárolt pályához görgetünk (ott tart a játékos)
    var target = wrap.querySelector('[data-stage="' + Progress.unlockedMax() + '"]');
    if (target && target.scrollIntoView) {
      try { target.scrollIntoView({block:'center'}); } catch(e) {}
    }
    gridBuilt = true;
  }

  function makeTile(stage) {
    var unlocked = Progress.isUnlocked(stage);
    var stars    = Progress.stars(stage);
    var teaser   = isSeasonStart(stage);

    var t = document.createElement('div');
    t.className = 'tile' + (unlocked ? ' open' : ' locked') + (teaser ? ' teaser' : '');
    t.setAttribute('data-stage', stage);

    // Stadionkép: minden FELOLDOTT csempén világosan (látszik a haladás),
    // a zárolt szezonnyitón halványan (csali). A season SAJÁT pályaképe.
    if (unlocked || teaser) {
      var thumb = document.createElement('div');
      thumb.className = 'tile-thumb';
      thumb.style.backgroundImage = 'url(' + seasonPitchSrc(seasonOf(stage)) + ')';
      t.appendChild(thumb);
    }

    var num = document.createElement('div');
    num.className = 'tile-num';
    num.textContent = stage;
    t.appendChild(num);

    if (unlocked) {
      var st = document.createElement('div');
      st.className = 'tile-stars';
      for (var i=1;i<=3;i++) {
        var sp = document.createElement('span');
        sp.className = 'st' + (i<=stars ? ' on' : '');
        sp.textContent = '★';
        st.appendChild(sp);
      }
      t.appendChild(st);
      t.addEventListener('pointerup', function(e){
        e.stopPropagation(); e.preventDefault();
        startStage(parseInt(this.getAttribute('data-stage'),10));
      });
    } else {
      var lock = document.createElement('div');
      lock.className = 'tile-lock';
      lock.textContent = '🔒';
      t.appendChild(lock);
    }
    return t;
  }

  // ---------- Skin-fül ----------
  // A pálya-kategória CSAK akkor jelenik meg, ha van benne valami.
  // Üres polcot nem mutatunk.
  function buildSkinTab(wrap) {
    var cats = [
      ['paddle', '🏓 Paddles', 'Your paddles, in every mode.'],
      ['ball',   '⚽ Balls',   'Your ball, in every mode.'],
      ['pitch',  '🏟 Pitches', 'Used in 2 Player. Stage mode always shows the season\'s own pitch — that story is not for sale.']
    ];
    var any = false;
    for (var c = 0; c < cats.length; c++) {
      var cat = cats[c][0], list = skinList(cat);
      if (!list.length) continue;
      any = true;

      var h = document.createElement('div');
      h.className = 'shop-sec';
      h.textContent = cats[c][1];
      wrap.appendChild(h);

      var note = document.createElement('div');
      note.className = 'skin-note';
      note.textContent = cats[c][2];
      wrap.appendChild(note);

      var grid = document.createElement('div');
      grid.className = 'skin-grid';
      for (var i = 0; i < list.length; i++) grid.appendChild(makeSkinCard(cat, list[i]));
      wrap.appendChild(grid);
    }
    if (!any) {
      var e = document.createElement('div');
      e.className = 'skin-note';
      e.textContent = 'Nothing here yet.';
      wrap.appendChild(e);
    }
  }

  function makeSkinCard(cat, sk) {
    var owned  = Progress.ownsSkin(cat, sk.id);
    var on     = (Progress.equipped(cat) === sk.id);
    var afford = Progress.coins() >= sk.price;

    var card = document.createElement('div');
    card.className = 'skin-card' + (on ? ' equipped' : '') +
                     (owned ? ' owned' : (afford ? ' buyable' : ' toopoor'));

    var cv = document.createElement('canvas');
    cv.className = 'skin-prev';
    cv.width = 220; cv.height = 116;
    card.appendChild(cv);

    var nm = document.createElement('div');
    nm.className = 'skin-name';
    nm.textContent = sk.name;
    card.appendChild(nm);

    var ds = document.createElement('div');
    ds.className = 'skin-desc';
    ds.textContent = sk.desc || '';
    card.appendChild(ds);

    var foot = document.createElement('div');
    foot.className = 'skin-foot';
    if (on) {
      foot.className += ' is-on';
      foot.textContent = '✓ EQUIPPED';
    } else if (owned) {
      foot.className += ' is-own';
      foot.textContent = 'Tap to wear';
    } else if (afford) {
      foot.className += ' is-buy';
      foot.innerHTML = 'BUY · ' + sk.price + ' <img class="coin" src="assets/coin.svg" alt="">';
    } else {
      foot.className += ' is-poor';
      foot.innerHTML = sk.price + ' <img class="coin" src="assets/coin.svg" alt=""> — not enough';
    }
    card.appendChild(foot);

    card.addEventListener('pointerup', function (e) {
      e.stopPropagation(); e.preventDefault();
      if (Progress.ownsSkin(cat, sk.id)) {
        Progress.equipSkin(cat, sk.id);
        if (typeof Haptics !== 'undefined') Haptics.paddle();
      } else if (Progress.buySkin(cat, sk.id, sk.price)) {
        Progress.equipSkin(cat, sk.id);              // amit veszel, azt fel is veszed
        if (typeof Haptics !== 'undefined') Haptics.bonus();
        if (typeof Sound !== 'undefined' && Sound.pickup) Sound.pickup();
      } else {
        card.classList.remove('shake');              // nincs elég érme: rázás
        void card.offsetWidth;
        card.classList.add('shake');
        return;
      }
      buildShop();
    });

    drawSkinPreview(cv, cat, sk.id);
    return card;
  }

  // Az előnézet UGYANAZT a rajzoló kódot futtatja, amit a pálya.
  // Nincs külön ikonkészlet, amit karban kellene tartani — amit látsz, azt kapod.
  // A skint PARAMÉTERKÉNT adjuk át: a mentéshez nem nyúlunk.
  function drawSkinPreview(cv, cat, id) {
    var g = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    g.fillStyle = '#0d1a12'; g.fillRect(0, 0, W, H);

    var prev = (typeof ctx !== 'undefined') ? ctx : null;
    ctx = g;                                    // a rajzolók a globális ctx-et használják
    try {
      var now = (typeof performance !== 'undefined') ? performance.now() : Date.now();
      if (cat === 'paddle') {
        paintPad(W*0.24, H*0.14, 15, H*0.72, '#4fc3f7', now, id);   // te
        paintPad(W*0.66, H*0.14, 15, H*0.72, '#ef5350', now, id);   // gép
      } else if (cat === 'ball') {
        g.save(); g.translate(W/2, H/2);
        paintBall(Math.min(W, H) * 0.32, 0.5, now, id);
        g.restore();
      }
    } catch (e) {}
    ctx = prev;
  }

  // ---------- 2P pályaválasztó ----------
  // Mind a 10 pálya látszik. A zároltak sötétek — ők a kampány reklámja:
  // a haver meglátja az arénát, és megkérdezi, hogy azt hogyan lehet elérni.
  // A pálya EGYBEN tempóválasztás is (twoplayer.js: P2_SPEED).
  function buildPitchGrid() {
    var wrap = el('pitchGrid');
    if (!wrap) return;
    wrap.innerHTML = '';

    for (var s = 1; s <= SEASON_COUNT; s++) {
      wrap.appendChild(makePitchCard(s));
    }

    var hint = el('pitchHint');
    if (hint) {
      var maxS = seasonOf(Progress.unlockedMax());
      hint.textContent = (maxS >= SEASON_COUNT)
        ? 'All pitches unlocked.'
        : 'Play Stage mode to unlock more pitches.';
    }
  }

  function makePitchCard(s) {
    var open = p2SeasonUnlocked(s);

    var c = document.createElement('div');
    c.className = 'pcard' + (open ? ' open' : ' locked');
    c.setAttribute('data-season', s);

    var thumb = document.createElement('div');
    thumb.className = 'pcard-thumb';
    thumb.style.backgroundImage = 'url(' + seasonPitchSrc(s) + ')';
    c.appendChild(thumb);

    var name = document.createElement('div');
    name.className = 'pcard-name';
    name.textContent = 'Season ' + s;
    c.appendChild(name);

    if (open) {
      var sp = document.createElement('div');
      sp.className = 'pcard-speed b' + p2Bolts(s);
      sp.textContent = new Array(p2Bolts(s) + 1).join('⚡');
      c.appendChild(sp);

      c.addEventListener('pointerup', function(e){
        e.stopPropagation(); e.preventDefault();
        start2Player(parseInt(this.getAttribute('data-season'), 10));
      });
    } else {
      var lock = document.createElement('div');
      lock.className = 'pcard-lock';
      lock.textContent = '🔒';
      c.appendChild(lock);
    }
    return c;
  }

  // ---------- Eredményképernyő ----------
  function showResult(won, myGoals, cpuGoals, earnedStars) {
    if (typeof Sound !== 'undefined') Sound.matchStop();   // aláfestő leáll, menü-zene jön a result képernyőn
    var title = el('resultTitle');
    if (title) {
      title.textContent = won ? 'Match won' : 'Match lost';
      title.className = won ? 'won' : 'lost';
    }
    var sc = el('resultScore');
    if (sc) sc.textContent = myGoals + ' : ' + cpuGoals;

    var sw = el('resultStars');
    if (sw) {
      sw.innerHTML = '';
      if (bkMode === 'stage' && won) {
        for (var i=1;i<=3;i++) {
          var sp = document.createElement('span');
          sp.className = 'rst' + (i<=earnedStars ? ' on' : '');
          sp.textContent = '★';
          sw.appendChild(sp);
        }
      }
    }
    var cw = el('resultCoins');
    if (cw) {
      cw.innerHTML = lastCoinReward > 0
        ? ('+' + lastCoinReward + ' <img class="coin" src="assets/coin.svg" alt="">' +
           (lastCoinDoubled ? ' <span class="coin-dbl">💰 DOUBLED</span>' : ''))
        : '';
      cw.style.display = lastCoinReward > 0 ? 'block' : 'none';
    }
    var sub = el('resultSub');
    if (sub) {
      sub.textContent = (bkMode==='stage')
        ? ('Stage ' + currentStage + ' · Season ' + seasonOf(currentStage))
        : 'Quick match';
    }
    var next = el('resultNextBtn');
    if (next) {
      var hasNext = (bkMode==='stage') && won && currentStage < MAX_STAGE;
      next.style.display = hasNext ? 'inline-block' : 'none';
    }
    // A 2P eredményképernyő átírja "Rematch"-re — itt vissza kell állítani,
    // különben egy 2P meccs után a kampányban is "Rematch" maradna.
    var retry = el('resultRetryBtn');
    if (retry) retry.textContent = '↻ Retry';
    show('result');
  }

  function showResult2P(winner, p1score, p2score) {
    if (typeof Sound !== 'undefined') Sound.matchStop();
    var title = el('resultTitle');
    if (title) { title.textContent = 'Player ' + winner + ' wins'; title.className = 'won'; }
    var sc = el('resultScore');
    if (sc) sc.textContent = 'P1 ' + p1score + ' : ' + p2score + ' P2';
    var sw = el('resultStars'); if (sw) sw.innerHTML = '';
    var cw = el('resultCoins'); if (cw) cw.style.display = 'none';
    var sub = el('resultSub'); if (sub) sub.textContent = '2 Player';
    var next = el('resultNextBtn'); if (next) next.style.display = 'none';
    var retry = el('resultRetryBtn'); if (retry) retry.textContent = '↻ Rematch';
    show('result');
  }

  return { show:show, showResult:showResult, showResult2P:showResult2P, anyOpen:anyOpen, refreshMenu:refreshMenu,
           buildGrid:buildGrid, buildPitchGrid:buildPitchGrid, buildShop:buildShop, buildItemBar:buildItemBar };
})();

// ---------- Indítók ----------
function startStage(n) {
  bkMode = 'stage';
  is2P = false;
  currentStage = n;
  stage = n;                 // a fizika/AI ebből számol
  Shop.reset();
  Screens.show('game');
  loadSeasonPitch(seasonOf(n));    // a season saját pályaképe
  Sound.matchStart(seasonOf(n));   // season-hez igazított aláfestő
  doStart();
  Screens.buildItemBar();
}

function startQuick() {
  bkMode = 'quick';
  is2P = false;
  currentStage = 1;
  stage = 1;
  Shop.reset();
  Screens.show('game');
  loadSeasonPitch(1);              // gyors meccs: Season 1 pálya
  Sound.matchStart(1);             // gyors meccs: Season 1 hangulat
  doStart();
  Screens.buildItemBar();
}

// 2P-ben a "Rematch" NEM indít azonnal: visszavisz a pályaválasztóhoz.
// (Meccs előtt mindig lehessen pályát/tempót váltani.)
function retryStage()  { if (typeof is2P!=='undefined' && is2P) { openPitchSelect(); } else { startStage(currentStage); } }
function nextStage()   { if (currentStage < MAX_STAGE) startStage(currentStage + 1); }
function backToMenu()  { running = false; paused = false; if (typeof is2P!=='undefined') is2P=false; Shop.reset();
  var ib = document.getElementById('itemBar'); if (ib) ib.style.display='none';
  Screens.show('menu'); }
function openStages()  { Screens.show('stages'); }
function openPitchSelect() { running = false; paused = false; Screens.show('pitch'); }
function openShop()    { Screens.show('shop'); }

// ============ TESZT ESZKÖZÖK — KIADÁS ELŐTT TÖRLENDŐ ============
function testInfo(msg) {
  var e = document.getElementById('testInfo');
  if (e) e.textContent = msg + '   (coins: ' + Progress.coins() + ')';
}
function testAddCoins() { Progress.addCoins(1000); testInfo('+1000 coins'); Screens.refreshMenu(); }
function testStockAll() {
  for (var i=0;i<SHOP_ITEMS.length;i++) Progress.addInv(SHOP_ITEMS[i].id, 5);
  testInfo('every item +5');
}
function testUnlockAll() {
  Progress.unlockAll();          // csak feloldás, csillagot NEM ad
  testInfo('all ' + MAX_STAGE + ' stages unlocked');
  Screens.refreshMenu();
}
// ============ /TESZT ESZKÖZÖK ============

function resetProgress() {
  if (!window.confirm('Delete all progress? This cannot be undone.')) return;
  Progress.reset();
  Screens.refreshMenu();
  Screens.buildGrid();
}
