// ============================================================
// PROGRESS — mentés-réteg (localStorage)
// Minden haladás-adat EGY helyen. A képernyők ebből olvasnak.
// ============================================================

var MAX_STAGE  = 100;
var SEASON_LEN = 10;   // 10 meccs = 1 szezon
var SEASON_COUNT = MAX_STAGE / SEASON_LEN;

function seasonOf(stage)      { return Math.floor((stage-1)/SEASON_LEN) + 1; }
function isSeasonStart(stage) { return (stage-1) % SEASON_LEN === 0; }

var Progress = (function() {
  var KEY = 'bk_progress_v1';
  var data = { unlocked:1, stars:{}, coins:0, losses:{}, inv:{}, welcomed:false };

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        data = JSON.parse(raw);
      } else {
        // Migráció a régi 'bk_stage' kulcsról
        var old = parseInt(localStorage.getItem('bk_stage'), 10);
        if (old && old > 1) data.unlocked = Math.min(old, MAX_STAGE);
      }
    } catch(e) {}
    if (!data.stars)  data.stars  = {};
    if (!data.losses) data.losses = {};
    if (!data.inv)    data.inv    = {};
    if (typeof data.welcomed !== 'boolean') data.welcomed = false;
    if (!data.unlocked) data.unlocked = 1;
    if (typeof data.coins !== 'number') data.coins = 0;
    return data;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch(e) {}
  }

  // Csillag-szabály: 0-1 kapott gól = 3, 2-4 = 2, 5-6 = 1
  function starsFor(conceded) {
    if (conceded <= 1) return 3;
    if (conceded <= 4) return 2;
    return 1;
  }

  return {
    load: load,
    save: save,
    starsFor: starsFor,
    unlockedMax: function()      { return data.unlocked; },
    isUnlocked:  function(stage) { return stage <= data.unlocked; },
    stars:       function(stage) { return data.stars[stage] || 0; },
    coins:       function()      { return data.coins; },
    addCoins:    function(n)     { data.coins += n; if (data.coins<0) data.coins=0; save(); },

    // --- Készlet (Shop) ---
    invCount:    function(id)    { return data.inv[id] || 0; },
    addInv:      function(id,n)  { data.inv[id] = (data.inv[id]||0) + n; save(); },
    useInv:      function(id)    { if (data.inv[id]>0) { data.inv[id]--; save(); return true; } return false; },
    inventory:   function()      { return data.inv; },

    // --- Nyitóajándék (egyszer, az első Shop-látogatáskor) ---
    welcomed:    function()      { return data.welcomed; },
    claimWelcome:function(n)     { if (data.welcomed) return 0; data.welcomed = true; data.coins += n; save(); return n; },
    totalStars:  function() {
      var t = 0;
      for (var k in data.stars) t += data.stars[k];
      return t;
    },
    // Győzelem: csillag mentés (csak ha jobb), következő stage feloldás, vereség-sorozat nullázás
    recordWin: function(stage, conceded) {
      var st = starsFor(conceded);
      if (st > (data.stars[stage] || 0)) data.stars[stage] = st;
      if (stage + 1 > data.unlocked && stage < MAX_STAGE) data.unlocked = stage + 1;
      data.losses[stage] = 0;
      save();
      return st;
    },
    // Vereség: sorozat számláló (a későbbi csendes AI-gyengítéshez)
    recordLoss: function(stage) {
      data.losses[stage] = (data.losses[stage] || 0) + 1;
      save();
      return data.losses[stage];
    },
    lossStreak: function(stage) { return data.losses[stage] || 0; },
    unlockAll:  function() { data.unlocked = MAX_STAGE; save(); },   // TESZT
    reset: function() {
      data = { unlocked:1, stars:{}, coins:0, losses:{}, inv:{}, welcomed:false };
      try { localStorage.removeItem('bk_stage'); } catch(e) {}
      save();
    }
  };
})();

Progress.load();
