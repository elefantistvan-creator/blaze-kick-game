// ============================================================
// DIFFICULTY — a nehézségi görbe EGY helyen
// Modell:
//   - Labda sebessége: szezonon BELÜL nő (+3%/meccs), szezonok között
//     visszaáll egy KÚSZÓ alapra (+2%/szezon, plafon 1.15) → "fűrészfog"
//   - AI ügyessége: szezonok KÖZÖTT javul (célzási hiba, reakciókésés,
//     előrejelzés). Alsó korlátokkal: az AI sosem lesz tökéletes.
//   - 3 vereség után csendes gyengítés (a játékos nem érzékeli).
// Minden szám ITT hangolható.
// ============================================================

var DIFF = {
  // --- Labda ---
  BALL_BASE:        0.0072,  // alap sebesség a magasság arányában (volt 0.006, +20%)
  PER_MATCH:        0.03,    // +3% meccsenként a szezonon belül
  PER_SEASON:       0.02,    // +2% a szezon kiindulási sebességére
  SEASON_BASE_CAP:  1.15,    // a kúszó alap plafonja

  // --- AI: célzási hiba (a pálcika fél-magasságának arányában) ---
  AIM_ERR_START:    0.40,
  AIM_ERR_END:      0.10,    // sosem 0 — az AI mindig hibázhat

  // --- AI: reakciókésés (képkocka) ---
  DELAY_START:      8,
  DELAY_END:        2,       // sosem 0

  // --- AI: előrejelzés (0 = a labdát követi, 1 = a becsapódási pontot) ---
  PREDICT_END:      0.85,    // plafon — sosem tökéletes
  PREDICT_BOUNCES:  1,       // csak EGY falpattanásig lát előre → a kétpattanásos lövés végig működik

  // --- AI: pálcika-sebesség (a labda sebességéhez igazodik, nem a szezonhoz) ---
  GOALIE_SPD:       0.005,
  STRIKER_SPD:      0.006,

  // --- Csendes segítség 3 vereség után ---
  ASSIST_AFTER:     3,
  ASSIST_ERR_MULT:  1.35,    // nagyobb célzási hiba
  ASSIST_DELAY_ADD: 1        // +1 képkocka késés
};

// Hányadik meccs a szezonon belül (1..10)
function matchInSeason(stage) { return ((stage-1) % SEASON_LEN) + 1; }

// Szezon-alapú "ügyességi" arány: 0 (1. szezon) .. 1 (utolsó szezon)
function skillT(stage) {
  if (SEASON_COUNT <= 1) return 0;
  return (seasonOf(stage) - 1) / (SEASON_COUNT - 1);
}

var Difficulty = {
  // Labda sebesség-szorzó (fűrészfog)
  ballMult: function(stage) {
    var base = 1 + (seasonOf(stage) - 1) * DIFF.PER_SEASON;
    if (base > DIFF.SEASON_BASE_CAP) base = DIFF.SEASON_BASE_CAP;
    return base + (matchInSeason(stage) - 1) * DIFF.PER_MATCH;
  },

  // AI célzási hibája (szorzó a pálcika fél-magasságára)
  aimError: function(stage) {
    var t = skillT(stage);
    var e = DIFF.AIM_ERR_START + (DIFF.AIM_ERR_END - DIFF.AIM_ERR_START) * t;
    if (assistActive(stage)) e *= DIFF.ASSIST_ERR_MULT;
    return e;
  },

  // AI reakciókésése képkockában
  reactionDelay: function(stage) {
    var t = skillT(stage);
    var d = Math.round(DIFF.DELAY_START + (DIFF.DELAY_END - DIFF.DELAY_START) * t);
    if (assistActive(stage)) d += DIFF.ASSIST_DELAY_ADD;
    return Math.max(0, d);
  },

  // Mennyire a becsapódási pontra áll (0..PREDICT_END)
  predictWeight: function(stage) {
    var w = DIFF.PREDICT_END * skillT(stage);
    if (assistActive(stage)) w *= 0.7;
    return w;
  }
};

// Csendes segítség: 3+ vereség UGYANAZON a pályán, csak Stage módban
function assistActive(stage) {
  if (typeof bkMode !== 'undefined' && bkMode !== 'stage') return false;
  if (typeof Progress === 'undefined') return false;
  return Progress.lossStreak(stage) >= DIFF.ASSIST_AFTER;
}
