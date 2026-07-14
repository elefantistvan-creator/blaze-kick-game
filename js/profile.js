// ============================================================
// PROFILNÉV
//
// Csak a FŐ játékosnak — ő az állandó. A 2P társ neve nem kell:
// ő ma itt van, holnap nem, és a mentés ehhez az eszközhöz tartozik.
//
// Első indításkor bekérjük. Utána Settingsben bármikor módosítható.
// Megjelenik a HUD-on ("You" helyett), az eredményképernyőn, és
// később a statisztikában.
//
// Nem kötelező: aki átugorja, marad "You". Ne kényszerítsünk.
// ============================================================
var Profile = (function () {

  var KEY = 'bk_name';
  var MAXLEN = 14;                 // hosszabb nem fér ki a HUD-ra
  var name = '';

  try { name = (localStorage.getItem(KEY) || '').trim(); } catch (e) {}

  // Csak azt szűrjük, ami eltörné a felületet — a nevekbe nem szólunk bele.
  function clean(v) {
    return String(v || '')
      .replace(/[\u0000-\u001f<>]/g, '')   // vezérlőkarakter, HTML-tag
      .trim()
      .slice(0, MAXLEN);
  }

  return {
    max: MAXLEN,
    has:  function () { return name.length > 0; },
    get:  function () { return name; },
    // Amit a felületen mutatunk. Ha nincs név, marad az eredeti "You".
    display: function () { return name || 'You'; },
    set: function (v) {
      name = clean(v);
      try {
        if (name) localStorage.setItem(KEY, name);
        else      localStorage.removeItem(KEY);
      } catch (e) {}
      applyName();
      return name;
    },
    clean: clean
  };
})();

// A HUD bal oldali "You" felirata + bárhol, ahol a név megjelenik.
function applyName() {
  var el = document.getElementById('s1Label');
  if (el) el.textContent = Profile.display();
  var s = document.getElementById('miName');
  if (s) {
    s.innerHTML = '<span class="ico">🙋</span> Name: ' +
                  (Profile.has() ? Profile.get() : '—');
  }
}

// ---------- Első indítás: névbekérő ----------
// A Start képernyő UTÁN, a menü ELŐTT. Egyszer.
// Átugorható — nem kapuőr, csak egy kérdés.
function openNamePrompt(firstRun) {
  var ov = document.getElementById('nameOverlay');
  var inp = document.getElementById('nameInput');
  var skip = document.getElementById('nameSkipBtn');
  if (!ov || !inp) return false;

  inp.value = Profile.get();
  inp.maxLength = Profile.max;
  ov.style.display = 'flex';
  if (skip) skip.textContent = firstRun ? 'Skip' : 'Cancel';
  setTimeout(function () { try { inp.focus(); } catch (e) {} }, 60);
  return true;
}
function closeNamePrompt() {
  var ov = document.getElementById('nameOverlay');
  if (ov) ov.style.display = 'none';
}
function saveNameFromPrompt() {
  var inp = document.getElementById('nameInput');
  if (inp) Profile.set(inp.value);
  closeNamePrompt();
}
