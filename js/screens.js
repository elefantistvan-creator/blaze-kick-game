// ============================================================
// SCREENS — képernyő-váltó + Stage rács + eredményképernyő
// Placeholder megjelenés; a stílus a css/ui.css tokenjeiből jön.
// ============================================================

var bkMode = 'stage';        // 'stage' = progresszió, 'quick' = gyors meccs
var currentStage = 1;        // épp játszott pálya

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

  var NAMES = ['menuScreen','stagesScreen','resultScreen','settingsScreen'];
  function el(id) { return document.getElementById(id); }

  function hideAll() {
    for (var i=0;i<NAMES.length;i++) { var e = el(NAMES[i]); if (e) e.style.display='none'; }
  }

  // Van-e nyitva bármelyik UI réteg? (az input.js ebből tudja, hogy ne vegye el a görgetést)
  function anyOpen() {
    var ids = NAMES.concat(['pauseOverlay','howToOverlay','mpOverlay']);
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

  return { show:show, showResult:showResult, anyOpen:anyOpen, refreshMenu:refreshMenu, buildGrid:buildGrid };
})();

// ---------- Indítók ----------
function startStage(n) {
  bkMode = 'stage';
  currentStage = n;
  stage = n;                 // a fizika/AI ebből számol (stageMult)
  Screens.show('game');
  doStart();
}

function startQuick() {
  bkMode = 'quick';
  currentStage = 1;
  stage = 1;
  Screens.show('game');
  doStart();
}

function retryStage()  { startStage(currentStage); }
function nextStage()   { if (currentStage < MAX_STAGE) startStage(currentStage + 1); }
function backToMenu()  { running = false; paused = false; Screens.show('menu'); }
function openStages()  { Screens.show('stages'); }

function resetProgress() {
  if (!window.confirm('Delete all progress? This cannot be undone.')) return;
  Progress.reset();
  Screens.refreshMenu();
  Screens.buildGrid();
}
