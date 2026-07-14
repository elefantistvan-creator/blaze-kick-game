// ============================================================
// HAPTICS — rezgés (Vibration API)
//
// Egy helyen minden rezgés. A minták rövidek: a hosszú rezgés
// mobilon idegesítő, és lemeríti az akkut. A cél a VISSZAJELZÉS,
// nem a figyelemfelkeltés.
//
// Nem minden eszköz támogatja (iOS Safari NEM). Ilyenkor csendben
// nem csinál semmit — nem hiba, csak nincs.
// ============================================================
var Haptics = (function () {

  var KEY = 'bk_vibe';
  var enabled = true;
  var supported = (typeof navigator !== 'undefined' &&
                   typeof navigator.vibrate === 'function');

  // Minták (ms). Az ütés rövid koppanás, a gól egy dupla lüktetés.
  var P = {
    paddle:   12,              // sima passz — épp csak érezni
    power:    [22, 30, 45],    // ⚡ TAP szuperütés — hármas, erős
    wall:     8,               // fal — alig
    goal:     [40, 60, 90],    // gól — dupla lüktetés
    bonus:    [15, 40, 15],    // 2P bónuszlabda felvétele
    freeze:   [10, 25, 10, 25, 10]   // Freeze — didergés
  };

  try {
    if (localStorage.getItem(KEY) === '0') enabled = false;
  } catch (e) {}

  function fire(pattern) {
    if (!enabled || !supported) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }

  return {
    isSupported: function () { return supported; },
    isEnabled:   function () { return enabled; },
    setEnabled:  function (v) {
      enabled = !!v;
      try { localStorage.setItem(KEY, enabled ? '1' : '0'); } catch (e) {}
      if (!enabled && supported) { try { navigator.vibrate(0); } catch (e) {} }
    },

    paddle: function () { fire(P.paddle); },
    power:  function () { fire(P.power);  },
    wall:   function () { fire(P.wall);   },
    goal:   function () { fire(P.goal);   },
    bonus:  function () { fire(P.bonus);  },
    freeze: function () { fire(P.freeze); }
  };
})();
