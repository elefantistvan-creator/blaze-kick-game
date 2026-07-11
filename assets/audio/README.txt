BLAZE KICK — HANGFÁJLOK (assets/audio/)
========================================
Formátum: OGG (Vorbis). Rövid effektek 0,1–1 mp; zene/aláfestő loopolható.
A fájlneveknek PONTOSAN egyezniük kell az alábbiakkal (a kód ezeket keresi).
Csoportonként több változat is lehet — csak vedd fel a nevet a listába (audio.js -> FILES).

1) INTRO / MENÜ
   intro.ogg        – az intró alatt, egyszer
   menu.ogg         – a menüben, loopol

2) ALÁFESTŐ (meccs alatt) — 4 csoport, pályatípus szerint
   amb1_1.ogg       – 1. csoport: utcai pálya (alig/semmi szurkolás)
   amb2_1.ogg       – 2. csoport: kisebb sportpálya (közepes)
   amb3_1.ogg       – 3. csoport: nagyobb aréna
   amb4_1.ogg       – 4. csoport: nagy aréna (teltház)
   (több változat: amb1_2.ogg, amb1_3.ogg, ... és így tovább csoportonként)
   Viselkedés: végigfut -> véletlen szünet (5–15 mp) -> random másik ugyanabból a csoportból.
   Semmi nem szakítja meg (gól sem).

3) GÓLÖRÖM — 4 csoport (ugyanaz a pályatípus-logika)
   goal1_1.ogg      – kis gólöröm (utcai)
   goal2_1.ogg      – közepes
   goal3_1.ogg      – nagy
   goal4_1.ogg      – nagyon nagy (teltház)
   (több változat: goal1_2.ogg, ... — random választ, teljesen végigfut)

4) ÜTŐ
   hit_me.ogg       – a saját ütőd
   hit_cpu.ogg      – az ellenfél ütője
   (fal-pattanásra NINCS külön hang)

SEASON -> CSOPORT hozzárendelés (audio.js -> SEASON_GROUP):
   jelenleg: Season 1–2 = 1, 3–4 = 2, 5–7 = 3, 8–10 = 4
   (szabadon átírható)

MEGJEGYZÉS:
- Amíg egy fájl hiányzik, a régi szintetizált hang szól helyette (semmi nem törik el).
- A fájlokat majd fel kell venni a Service Worker előtöltésébe is (sw.js -> ASSETS),
  hogy offline is szóljanak — ezt a végső bekötéskor csináljuk meg.
