// ============================================================
// PROGRESS — mentés-réteg (localStorage)
// Minden haladás-adat EGY helyen. A képernyők ebből olvasnak.
// ============================================================

var MAX_STAGE  = 100;
var SEASON_LEN = 10;   // 10 meccs = 1 szezon
var SEASON_COUNT = MAX_STAGE / SEASON_LEN;

function seasonOf(stage)      { return Math.floor((stage-1)/SEASON_LEN) + 1; }
function isSeasonStart(stage) { return (stage-1) % SEASON_LEN === 0; }

// --- Adaptív skill konstansok (mind hangolható) ---
var SKILL_MIN = 15, SKILL_MAX = 92, SKILL_START = 22, CALIB_MATCHES = 3;
function skillToT(s){ return Math.max(0, Math.min(1, (s - SKILL_MIN) / (SKILL_MAX - SKILL_MIN))); }

var Progress = (function() {
  var KEY = 'bk_progress_v1';
  var data = { unlocked:1, stars:{}, coins:0, losses:{}, inv:{}, welcomed:false,
               skill:SKILL_START, skillMatches:0,
               // Skinek: mit birtokolsz, mit viselsz. A 'classic' mindig a tiéd.
               skinsOwned: { paddle:{classic:1}, ball:{classic:1}, pitch:{} },
               skinsEquip: { paddle:'classic', ball:'classic', pitch:null } };

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
    // Migráció: régi mentésben még nincs skin-adat
    if (!data.skinsOwned) data.skinsOwned = { paddle:{classic:1}, ball:{classic:1}, pitch:{} };
    if (!data.skinsOwned.paddle) data.skinsOwned.paddle = { classic:1 };
    if (!data.skinsOwned.ball)   data.skinsOwned.ball   = { classic:1 };
    if (!data.skinsOwned.pitch)  data.skinsOwned.pitch  = {};
    data.skinsOwned.paddle.classic = 1;    // az alap SOHA nem veszhet el
    data.skinsOwned.ball.classic   = 1;
    if (!data.skinsEquip) data.skinsEquip = { paddle:'classic', ball:'classic', pitch:null };
    if (!data.inv)    data.inv    = {};
    if (typeof data.welcomed !== 'boolean') data.welcomed = false;
    if (!data.unlocked) data.unlocked = 1;
    if (typeof data.coins !== 'number') data.coins = 0;
    if (typeof data.skill !== 'number') data.skill = SKILL_START;
    if (typeof data.skillMatches !== 'number') data.skillMatches = 0;
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

  // ---------- Skinek ----------
  function ownsSkin(cat, id) {
    if (id === 'classic') return true;
    return !!(data.skinsOwned[cat] && data.skinsOwned[cat][id]);
  }
  function buySkin(cat, id, price) {
    if (ownsSkin(cat, id)) return false;
    if (data.coins < price) return false;
    data.coins -= price;
    if (!data.skinsOwned[cat]) data.skinsOwned[cat] = {};
    data.skinsOwned[cat][id] = 1;
    save();
    return true;
  }
  function equipSkin(cat, id) {
    if (!ownsSkin(cat, id)) return false;
    data.skinsEquip[cat] = id;
    save();
    return true;
  }
  function equipped(cat) {
    var v = data.skinsEquip ? data.skinsEquip[cat] : null;
    if (cat === 'pitch') return v || null;
    return v || 'classic';
  }

  return {
    ownsSkin:ownsSkin, buySkin:buySkin, equipSkin:equipSkin, equipped:equipped,
    load: load,
    save: save,
    starsFor: starsFor,
    unlockedMax: function()      { return data.unlocked; },
    isUnlocked:  function(stage) { return stage <= data.unlocked; },
    stars:       function(stage) { return data.stars[stage] || 0; },
    coins:       function()      { return data.coins; },
    getSkill:    function()      { return data.skill; },
    skillT:      function()      { return skillToT(data.skill); },
    skillMatches:function()      { return data.skillMatches; },
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
      // --- Adaptív skill: győzelem (gólkülönbség = 7 - kapott gól) ---
      var calibW = data.skillMatches < CALIB_MATCHES;
      var diff   = 7 - conceded;
      var dW     = calibW ? (diff >= 5 ? 8 : 3) : (diff >= 5 ? 3 : 0);
      data.skill = Math.max(SKILL_MIN, Math.min(SKILL_MAX, data.skill + dW));
      data.skillMatches++;
      save();
      return st;
    },
    // Vereség: sorozat számláló (a későbbi csendes AI-gyengítéshez)
    recordLoss: function(stage) {
      var prior = data.losses[stage] || 0;
      var AA = (typeof DIFF !== 'undefined') ? DIFF.ASSIST_AFTER : 2;
      var assistWasActive = prior >= AA;   // ha már beragadt, ne rántsuk le tovább a profilt
      data.losses[stage] = prior + 1;
      // --- Adaptív skill: vesztés (csak ha a helyi segítség még nem aktív) ---
      if (!assistWasActive) {
        var calibL = data.skillMatches < CALIB_MATCHES;
        data.skill = Math.max(SKILL_MIN, Math.min(SKILL_MAX, data.skill + (calibL ? -5 : -3)));
      }
      data.skillMatches++;
      save();
      return data.losses[stage];
    },
    lossStreak: function(stage) { return data.losses[stage] || 0; },
    unlockAll:  function() { data.unlocked = MAX_STAGE; save(); },   // TESZT
    reset: function() {
      data = { unlocked:1, stars:{}, coins:0, losses:{}, inv:{}, welcomed:false, skill:SKILL_START, skillMatches:0 };
      try { localStorage.removeItem('bk_stage'); } catch(e) {}
      save();
    }
  };
})();

Progress.load();
