// ============================================================
// SCREENS — képernyő-váltó + Stage rács + eredményképernyő
// Placeholder megjelenés; a stílus a css/ui.css tokenjeiből jön.
// ============================================================

var bkMode = 'stage';        // 'stage' = progresszió, 'quick' = gyors meccs
var currentStage = 1;        // épp játszott pálya
var lastCoinReward = 0;      // az utolsó meccs érme-jutalma

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

  var NAMES = ['menuScreen','stagesScreen','resultScreen','settingsScreen','shopScreen'];
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
    if (name === 'shop')   buildShop();
  }

  // ---------- Shop ----------
  function buildShop() {
    // Nyitóajándék: egyszer, az első látogatáskor
    var gift = Progress.claimWelcome(ECON.WELCOME);
    var wrap = el('shopList');
    var cn = el('shopCoins');
    if (cn) cn.textContent = Progress.coins();
    if (!wrap) return;
    wrap.innerHTML = '';

    if (gift > 0) {
      var g = document.createElement('div');
      g.className = 'shop-gift';
      g.textContent = '🎁 Welcome gift: ' + gift + ' coins';
      wrap.appendChild(g);
    }

    var note = document.createElement('div');
    note.className = 'shop-note';
    note.textContent = 'A boost lasts until the next goal (max 30s). Up to ' +
                       Shop.maxActivations + ' per match.';
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
    head.innerHTML = '<span class="shop-ico">' + it.icon + '</span>' +
                     '<span class="shop-name">' + it.name + '</span>' +
                     '<span class="shop-own">×' + Progress.invCount(it.id) + '</span>';
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
        b.innerHTML = '×' + pack.qty + ' <b>' + cost + '</b>' +
                      (pack.discount ? ' <i>−' + Math.round(pack.discount*100) + '%</i>' : '');
        b.addEventListener('pointerup', function(e){
          e.stopPropagation(); e.preventDefault();
          if (Shop.buy(it.id, pack.qty)) buildShop();
        });
        buys.appendChild(b);
      })(SHOP_PACKS[p]);
    }
    row.appendChild(buys);
    return row;
  }

  // ---------- Meccs közbeni aktiváló sáv ----------
  function buildItemBar() {
    var bar = el('itemBar');
    if (!bar) return;
    bar.innerHTML = '';
    if (bkMode !== 'stage') { bar.style.display = 'none'; return; }

    var any = false;
    for (var i=0;i<SHOP_ITEMS.length;i++) {
      var it = SHOP_ITEMS[i];
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
      h.className = 'season-head';
      var firstStage = (s-1)*SEASON_LEN + 1;
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

    // Szezonnyitó: lelakatolt bélyegkép (csali). Placeholder: pitch1 színárnyalattal.
    if (teaser) {
      var thumb = document.createElement('div');
      thumb.className = 'tile-thumb';
      var hue = (seasonOf(stage)-1) * 28;
      thumb.style.backgroundImage = 'url(assets/pitch1.jpg)';
      thumb.style.filter = 'hue-rotate(' + hue + 'deg) saturate(0.85)';
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

  // ---------- Eredményképernyő ----------
  function showResult(won, myGoals, cpuGoals, earnedStars) {
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
      cw.textContent = lastCoinReward > 0 ? ('+' + lastCoinReward + ' ◎') : '';
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
    show('result');
  }

  return { show:show, showResult:showResult, anyOpen:anyOpen, refreshMenu:refreshMenu,
           buildGrid:buildGrid, buildShop:buildShop, buildItemBar:buildItemBar };
})();

// ---------- Indítók ----------
function startStage(n) {
  bkMode = 'stage';
  currentStage = n;
  stage = n;                 // a fizika/AI ebből számol
  Shop.reset();
  Screens.show('game');
  doStart();
  Screens.buildItemBar();
}

function startQuick() {
  bkMode = 'quick';
  currentStage = 1;
  stage = 1;
  Shop.reset();
  Screens.show('game');
  doStart();
  Screens.buildItemBar();
}

function retryStage()  { startStage(currentStage); }
function nextStage()   { if (currentStage < MAX_STAGE) startStage(currentStage + 1); }
function backToMenu()  { running = false; paused = false; Shop.reset();
  var ib = document.getElementById('itemBar'); if (ib) ib.style.display='none';
  Screens.show('menu'); }
function openStages()  { Screens.show('stages'); }
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
