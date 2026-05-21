# osu! Mod Score Finder Beta

Local-first osu! score analysis tool for mod-specific passes, local score history, improvement tracking, calendar review, and experimental RP (Relative Performance) scoring.

This project is a beta. It is designed to help players inspect scores that are hard to compare on the normal osu! website, especially local stable/lazer plays and unusual mod combinations.

## Languages

- [English documentation](#english)
- [Deutsche Dokumentation](#deutsch)

---

# English

## What This Tool Does

osu! Mod Score Finder Beta helps you search a player, collect reachable scores, store them locally, and then filter or compare them in ways the normal osu! profile does not expose directly.

The app is especially useful when you want to answer questions like:

- Which maps did I pass with a specific mod?
- What are my best stored scores for `AL`, `CL`, `DT`, `HDHR`, or other combinations?
- Did I improve on a map compared with my last try?
- What did I play today, this month, or on a specific day?
- Which score is my best try on each map difficulty?
- How strong was a pass relative to the map and leaderboard context?

The app runs locally in your browser and stores its own local database in the project folder.

## What Makes It Different

This tool is not only another top-play viewer. It focuses on local score discovery and score history.

Main differences compared with normal osu! profile pages:

- It combines locally stored stable scores, lazer scores, osu!api scores, and optional pp.huismetbenen data.
- It keeps scores in a local SQLite database so they can be viewed again later.
- It can show scores that are locally present even when they are not easy to find through the online profile.
- It has a calendar view for played days.
- It has an improvement view that compares tries on the same map difficulty.
- It has a beta RP view that estimates Relative Performance instead of only showing PP.

## Privacy And Local Files

The beta is local-first.

- `.env` contains your osu! Client ID, Client Secret, local osu! paths, and port.
- `.env` is ignored by Git and must not be uploaded.
- `data/` contains the local SQLite database and RP/PP caches.
- `data/` is ignored by Git and must not be uploaded.
- `node_modules/` is ignored by Git.
- Log files are ignored by Git.
- Local osu! files are read, not copied into this repository.

Before publishing or pushing changes, check:

```bash
git status --ignored
```

Files such as `.env`, `data/`, `node_modules/`, and `*.log` must not appear as staged or committed files.

## Setup

Run:

```bat
setup-beta.bat
```

The setup window lets you configure:

- osu! Client ID
- osu! Client Secret
- osu!stable folder
- osu!lazer folder
- local port
- whether project dependencies should be installed

Already installed requirements are shown but disabled. Missing requirements stay selectable.

After setup, start the app with:

```bat
start-beta.bat
```

Then open:

```text
http://127.0.0.1:5173
```

## osu! API Credentials

Create an OAuth application here:

```text
https://osu.ppy.sh/home/account/edit
```

Recommended callback URL:

```text
http://localhost:5173/callback
```

The app currently uses the Client Credentials flow for public osu!api data. Keep your Client Secret private.

## Manual Start

If you do not want to use the setup window:

```bash
npm install
npm start
```

The default local URL is:

```text
http://127.0.0.1:5173
```

## Data Sources

The app can use several data sources. Each source has different strengths.

### Local osu!stable Files

Used for:

- local score database
- stable replay files when present
- beatmap metadata from local osu! files

Strength:

- Can include scores that are not visible through recent online API pages.

Limitation:

- Local score files do not always include everything needed for exact replay timing.

### Local osu!lazer Files

Used for:

- lazer client score database
- lazer score metadata
- local beatmap information when available

Strength:

- Helps include modern lazer-only scores and lazer mod combinations.

Limitation:

- Local data format can change between lazer versions.

### Official osu!api v2

Used for:

- user profile data
- recent scores
- individual score PP hydration
- beatmap metadata
- beatmap scores / leaderboard references
- beatmap difficulty attributes
- passcount / playcount
- failtimes when available

Strength:

- Official source for public online osu! data.

Limitation:

- osu!api does not expose complete old score history for every player.
- osu!api does not expose exact miss or slider-break timestamps.

### pp.huismetbenen

Used optionally for:

- extra top-rank style score data
- PP values from live/rework calculations when available

Strength:

- Can fill some gaps in top-score style views.

Limitation:

- It is a third-party source and not the official osu!api.

## Main Views

### Scores

The Scores tab shows filtered pass results.

You can filter by:

- player name
- mode
- sort order
- mod match
- scan pages
- date range
- rank window
- display limit
- best try mode
- stable/lazer inclusion
- osu!api usage
- pp.huismetbenen usage
- PP recalculation
- best score per map
- ranked/approved and loved map settings
- selected mods

### Improvement

The Improvement tab compares one try with another try on the same map difficulty.

Supported scopes:

- last try
- last hour
- today

It can show changes in:

- PP
- accuracy
- misses
- score
- combo

The map detail view also includes an improvement history chart.

### Calendar

The Calendar tab shows played days in a month grid.

It highlights:

- days with scores
- days without scores
- the day containing the top PP play of the selected month

The calendar also has a PP range filter, so you can inspect only scores between a minimum and maximum PP value.

### Map Details

Each score can open a map detail panel.

The panel shows all stored tries for the same map difficulty and sorts them by best available performance. It also shows a chart with PP, accuracy, and miss history over time.

## RP: Relative Performance

RP means Relative Performance.

PP answers:

```text
How valuable is this score according to the official osu! performance system?
```

RP tries to answer:

```text
How strong was this pass relative to the map, the leaderboard, and the known pressure points of the map?
```

The RP tab intentionally collapses the normal filter panel. Only the player field and RP button stay visible. This is deliberate: RP uses fixed rules in this beta so the results are easier to compare.

The RP tab has its own small controls:

- `RP system`: filters the result list by local estimates, API-assisted estimates, confirmed top-50 scores, or replay candidates.
- `RP limit`: controls how many of the strongest stored candidate scores are calculated.

## RP System Types

The UI can show several RP system labels. They do not mean that the score itself came only from that source.

`Local estimate` means the score came from the local database and the app could not add enough online context. It still calculates `S_rp`, map difficulty, and a conservative miss penalty when possible.

`API-assisted` means the score is still a stored/local candidate, but osu!api supplied useful context such as beatmap data, max combo, pass/play ratio, failtimes, leaderboard samples, or the player's map rank.

`API-limited` means osu!api supplied some context, but not enough to call it a full top-50 reference. This happens on maps or mod combinations where the visible API sample is small.

`Top-50 direct` is the only system that can award the fixed `95` to `100 RP` range. It requires a confirmed map rank inside a full top-50 reference.

`Replay candidates` are scores where an online or local replay exists. They are important for a future replay-exact RP engine, but replay-frame decoding is not fully implemented yet.

## RP Step 1: Stable/Lazer Neutral Score

The first step is a stable/lazer-independent internal score called `S_rp`.

It uses:

- player combo
- map max combo when known
- accuracy

```text
S_rp = (player_combo / map_max_combo * 70000)
     + (accuracy_percent / 100 * 30000)
```

Why this exists:

- osu!stable score values can be huge because of ScoreV1.
- osu!lazer standardised score is capped differently.
- Directly comparing raw stable and lazer score values is not fair.
- `S_rp` makes both clients comparable through combo and accuracy.

A perfect full-combo SS reaches `100000` internal points.

If max combo is missing, the RP result can still be shown only with lower confidence or may be skipped for that score.

## RP Step 2: Reference S_rp

RP needs a reference point for the map. The app calls this `RP reference` in the UI.

This reference is not always a real top-50 average. The UI therefore shows the reference source separately.

Reference rules:

- `real top-50 average`: at least 50 usable leaderboard scores are available for the relevant map/mod context.
- `visible API average`: between 10 and 49 usable leaderboard scores are available, so the app averages only the visible usable sample.
- `rank-1 reference x 0.95`: fewer than 10 usable scores are available, so the app uses rank 1 as a cautious reference point.
- `player fallback`: no useful leaderboard context is available, so the player's own score is used only as a weak fallback.

If at least 50 usable scores are available:

```text
reference_s_rp = average S_rp of the top 50 usable leaderboard scores
```

If 10 to 49 usable scores are available:

```text
reference_s_rp = average S_rp of the visible usable scores
```

If 1 to 9 usable scores are available:

```text
reference_s_rp = S_rp of rank 1 * 0.95
```

The old `rank 1 * 0.75` fallback was removed because it could make non-top-50 scores look like perfect `100 RP` scores.

## RP Step 3: Map Factor

The map factor describes how much the map context should matter before the final RP value is capped.

```text
M_map = star_rating * (1 + (1 - success_rate))
```

With:

```text
success_rate = passcount / playcount
```

This means:

- higher star rating increases the factor
- lower pass rate increases the factor
- the factor is smoothed with `log10(M_map)` so it cannot explode forever

The map factor is not a final score. It is only one multiplier inside the RP estimate.

## RP Step 4: Top-50 Gate

The `95` to `100 RP` range is reserved.

A score can only enter that range when:

- the app has a full usable top-50 reference
- the player's map rank is known
- the player's rank is `50` or better

Then:

```text
RP = 95 + ((50 - rank) / 49) * 5
```

Rank 50 receives `95 RP`.

Rank 1 receives `100 RP`.

Every non-top-50 estimate is capped below `95 RP`. If the app knows the player's map rank and the rank is worse than 50, the estimate is additionally dampened by rank. This prevents a rank `#283` score from becoming `100 RP` only because the visible reference sample was incomplete.

## RP Step 5: Estimate Formula

```text
RP_pre = (S_rp_player / reference_s_rp) * 95 * log10(M_map)
```

After that, the estimated spike penalty is subtracted and the non-top-50 cap is applied.

## RP Step 6: Replay Exact Status

Replay Exact is not fully implemented yet. The beta does not fake exact replay-based RP.

Instead, the app shows whether a score can later become replay-exact:

- `online replay available`: osu! reports that an online replay exists.
- `local replay available`: the score was read from a local `.osr` replay source.
- `no replay`: no replay source is attached to the score.

Why replay data matters:

The normal score API gives only the result:

```text
98.20% accuracy, 1 miss, 170x combo
```

RP needs to know where the mistake happened:

```text
Was the miss inside the hardest spike, or at a very easy part of the map?
```

That requires replay-frame decoding. `.osr` replay data contains timing, cursor movement, and key states. Once a decoder is added, the app can compare replay frames against the `.osu` map file and estimate real combo-break timestamps much more accurately.

Until then, Replay Exact is a status layer, not a final calculation layer.

## RP Step 7: Current Spike Penalty

The current beta uses an estimated spike penalty.

It considers:

- normal misses
- likely slider breaks when there are no misses but combo is clearly broken
- osu! `failtimes` as a rough pressure profile when available

This is useful, but it is not perfect.

Important limitation:

`failtimes` are not a complete global miss histogram for every mod combination. They are only the public rough fail/exit timing signal that osu! exposes for beatmaps.

Because exact online miss timestamps and slider-break timestamps are not publicly exposed as ready-made data, exact spike penalties require replay decoding.

## RP Confidence

Every RP score has a confidence value.

High confidence usually means:

- beatmap ID exists
- max combo is known
- beatmap data was loaded
- RP reference exists
- failtimes or map pressure data exist
- replay data exists or the score has strong supporting data

Lower confidence usually means:

- missing beatmap ID
- missing max combo
- no RP reference
- no failtimes
- no replay
- fallback values were needed
- osu!api was unavailable

Read RP together with confidence. A `90 RP` score with low confidence should not be treated the same as a `90 RP` score with high confidence.

## What Is Exact And What Is Estimated

Exact or close to exact:

- stored score result
- accuracy
- combo
- miss count
- PP when available or recalculated
- local score timestamp
- beatmap metadata when available

Estimated:

- RP spike penalty before replay decoding exists
- slider-break detection without replay analysis
- map pressure when only `failtimes` are available
- RP reference when only a limited leaderboard sample is available

Not available as a public ready-made source:

- exact miss timestamps for every online score
- exact slider-break timestamps for every online score
- global mod-specific miss histogram for every beatmap
- full old score history for every player

## Known Limitations

- This is a beta and may contain incorrect calculations.
- osu!api does not expose every historical score.
- osu!api does not expose exact hit-event timelines.
- Local lazer formats may change.
- pp.huismetbenen is optional and third-party.
- RP is experimental and not an official osu! ranking system.

## Roadmap

Planned or possible next steps:

- decode local `.osr` replay frames
- use online replay download when available
- build stronger combo-break detection from replay + `.osu` map data
- improve RP confidence explanations in the UI
- add RP details per map
- add export options for score lists
- improve setup diagnostics for users without Node.js or npm

## Development Notes

Useful commands:

```bash
npm install
npm start
node --check server.js
node --check public/app.js
```

The app entry point is:

```text
server.js
```

Frontend files are in:

```text
public/
```

Local persistent app data is stored in:

```text
data/
```

Do not commit `data/`.

---

# Deutsch

## Was Dieses Tool Macht

osu! Mod Score Finder Beta hilft dir dabei, einen Spieler zu suchen, erreichbare Scores einzusammeln, sie lokal zu speichern und danach genauer zu filtern oder zu vergleichen, als es auf der normalen osu!-Profilseite moeglich ist.

Die App ist besonders nuetzlich, wenn du solche Fragen beantworten willst:

- Welche Maps habe ich mit einer bestimmten Mod gepasst?
- Was sind meine besten gespeicherten Scores mit `AL`, `CL`, `DT`, `HDHR` oder anderen Kombinationen?
- Habe ich mich auf einer Map im Vergleich zum letzten Try verbessert?
- Was habe ich heute, in diesem Monat oder an einem bestimmten Tag gespielt?
- Welcher Score ist mein bester Try auf jeder Map-Difficulty?
- Wie stark war ein Pass relativ zur Map und zum Leaderboard-Kontext?

Die App laeuft lokal in deinem Browser und speichert ihre eigene lokale Datenbank im Projektordner.

## Was Das Tool Besonders Macht

Dieses Tool ist nicht nur ein weiterer Top-Play-Viewer. Der Fokus liegt auf lokalen Scores, Score-History und mod-spezifischem Suchen.

Unterschiede zur normalen osu!-Profilseite:

- Es verbindet lokal gespeicherte stable Scores, lazer Scores, osu!api Scores und optional pp.huismetbenen Daten.
- Es speichert gefundene Scores in einer lokalen SQLite-Datenbank.
- Es kann Scores anzeigen, die lokal vorhanden sind, aber online nicht leicht ueber das Profil auffindbar sind.
- Es hat eine Kalenderansicht fuer Spieltage.
- Es hat eine Improvement-Ansicht, die Tries auf derselben Map-Difficulty vergleicht.
- Es hat eine Beta-RP-Ansicht, die Relative Performance schaetzt, statt nur PP anzuzeigen.

## Datenschutz Und Lokale Dateien

Die Beta ist local-first.

- `.env` enthaelt deine osu! Client ID, dein Client Secret, lokale osu!-Pfade und den Port.
- `.env` wird von Git ignoriert und darf nicht hochgeladen werden.
- `data/` enthaelt die lokale SQLite-Datenbank und RP/PP-Caches.
- `data/` wird von Git ignoriert und darf nicht hochgeladen werden.
- `node_modules/` wird von Git ignoriert.
- Log-Dateien werden von Git ignoriert.
- Lokale osu!-Dateien werden gelesen, aber nicht in dieses Repository kopiert.

Vor dem Veroeffentlichen oder Pushen pruefen:

```bash
git status --ignored
```

Dateien wie `.env`, `data/`, `node_modules/` und `*.log` duerfen nicht als staged oder committed auftauchen.

## Setup

Starte:

```bat
setup-beta.bat
```

Im Setup-Fenster kannst du konfigurieren:

- osu! Client ID
- osu! Client Secret
- osu!stable Ordner
- osu!lazer Ordner
- lokaler Port
- ob Projekt-Abhaengigkeiten installiert werden sollen

Bereits installierte Anforderungen werden angezeigt, aber ausgegraut. Fehlende Anforderungen bleiben auswaehlbar.

Nach dem Setup startest du die App mit:

```bat
start-beta.bat
```

Danach oeffnen:

```text
http://127.0.0.1:5173
```

## osu! API Zugangsdaten

Eine OAuth-Anwendung erstellst du hier:

```text
https://osu.ppy.sh/home/account/edit
```

Empfohlene Callback URL:

```text
http://localhost:5173/callback
```

Die App nutzt aktuell den Client-Credentials-Flow fuer oeffentliche osu!api-Daten. Dein Client Secret muss privat bleiben.

## Manueller Start

Wenn du das Setup-Fenster nicht nutzen willst:

```bash
npm install
npm start
```

Die lokale Standard-URL ist:

```text
http://127.0.0.1:5173
```

## Datenquellen

Die App kann mehrere Datenquellen nutzen. Jede Quelle hat andere Staerken.

### Lokale osu!stable Dateien

Genutzt fuer:

- lokale Score-Datenbank
- stable Replay-Dateien, wenn vorhanden
- Beatmap-Metadaten aus lokalen osu!-Dateien

Staerke:

- Kann Scores enthalten, die nicht ueber aktuelle Online-API-Seiten sichtbar sind.

Einschraenkung:

- Lokale Score-Dateien enthalten nicht immer alles, was fuer exaktes Replay-Timing noetig ist.

### Lokale osu!lazer Dateien

Genutzt fuer:

- lazer Client Score-Datenbank
- lazer Score-Metadaten
- lokale Beatmap-Informationen, wenn vorhanden

Staerke:

- Hilft dabei, moderne lazer-only Scores und lazer Mod-Kombinationen einzubeziehen.

Einschraenkung:

- Das lokale Datenformat kann sich zwischen lazer-Versionen aendern.

### Offizielle osu!api v2

Genutzt fuer:

- Nutzerprofil-Daten
- Recent Scores
- einzelne Score-PP-Ergaenzung
- Beatmap-Metadaten
- Beatmap-Scores / Leaderboard-Referenzen
- Beatmap-Difficulty-Attribute
- passcount / playcount
- failtimes, wenn verfuegbar

Staerke:

- Offizielle Quelle fuer oeffentliche Online-osu!-Daten.

Einschraenkung:

- osu!api gibt keine komplette alte Score-History jedes Spielers aus.
- osu!api gibt keine exakten Miss- oder Sliderbreak-Zeitpunkte aus.

### pp.huismetbenen

Optional genutzt fuer:

- zusaetzliche Top-Rank-Score-Daten
- PP-Werte aus Live-/Rework-Berechnungen, wenn verfuegbar

Staerke:

- Kann Luecken in Top-Score-Ansichten fuellen.

Einschraenkung:

- Es ist eine Drittanbieter-Quelle und nicht die offizielle osu!api.

## Hauptansichten

### Scores

Der Scores-Tab zeigt gefilterte Pass-Ergebnisse.

Du kannst filtern nach:

- Spielername
- Modus
- Sortierung
- Mod-Match
- Scan-Seiten
- Zeitraum
- Rangfenster
- Anzeige-Limit
- Bester-Try-Modus
- stable/lazer Einbeziehung
- osu!api Nutzung
- pp.huismetbenen Nutzung
- PP-Neuberechnung
- bester Score pro Map
- ranked/approved und loved Map-Einstellungen
- ausgewaehlten Mods

### Improvement

Der Improvement-Tab vergleicht einen Try mit einem anderen Try auf derselben Map-Difficulty.

Unterstuetzte Bereiche:

- letzter Try
- letzte Stunde
- heute

Angezeigt werden Verbesserungen bei:

- PP
- Accuracy
- Misses
- Score
- Combo

Die Map-Detailansicht enthaelt zusaetzlich einen Improvement-Verlauf als Chart.

### Kalender

Der Kalender-Tab zeigt Spieltage in einem Monatsraster.

Er hebt hervor:

- Tage mit Scores
- Tage ohne Scores
- den Tag mit dem Top-PP-Play des ausgewaehlten Monats

Der Kalender hat ausserdem einen PP-Range-Filter, damit du nur Scores zwischen einem minimalen und maximalen PP-Wert ansehen kannst.

### Map-Details

Jeder Score kann ein Map-Detailpanel oeffnen.

Das Panel zeigt alle gespeicherten Tries auf derselben Map-Difficulty und sortiert sie nach der besten verfuegbaren Performance. Es zeigt auch einen Chart mit PP-, Accuracy- und Miss-Verlauf ueber Zeit.

## RP: Relative Performance

RP bedeutet Relative Performance.

PP fragt:

```text
Wie wertvoll ist dieser Score laut offiziellem osu!-Performance-System?
```

RP versucht zu fragen:

```text
Wie stark war dieser Pass relativ zur Map, zum Leaderboard und zu den bekannten Druckstellen der Map?
```

Der RP-Tab klappt den normalen Filterbereich bewusst ein. Nur Spielerfeld und RP-Button bleiben sichtbar. Das ist Absicht: RP nutzt in dieser Beta feste Regeln, damit die Ergebnisse leichter vergleichbar sind.

Der RP-Tab hat eigene kleine Steuerungen:

- `RP-System`: filtert die Ergebnisliste nach lokalen Estimates, API-gestuetzten Estimates, bestaetigten Top-50-Scores oder Replay-Kandidaten.
- `RP-Limit`: bestimmt, wie viele der staerksten gespeicherten Kandidaten berechnet werden.

## RP-Systemarten

Die UI kann mehrere RP-Systemlabels anzeigen. Diese Labels bedeuten nicht, dass der Score selbst nur aus dieser Quelle kommt.

`Lokal-Estimate` bedeutet: Der Score kommt aus der lokalen Datenbank und die App konnte nicht genug Online-Kontext ergaenzen. `S_rp`, Map-Schwierigkeit und eine vorsichtige Miss-Strafe werden trotzdem berechnet, wenn genug Daten vorhanden sind.

`API-gestuetzt` bedeutet: Der Score bleibt ein gespeicherter/lokaler Kandidat, aber die osu!api konnte hilfreichen Kontext liefern, zum Beispiel Beatmap-Daten, Max-Combo, pass/play-Verhaeltnis, failtimes, Leaderboard-Stichproben oder den Map-Rang des Spielers.

`API-limitiert` bedeutet: Die osu!api konnte etwas Kontext liefern, aber nicht genug fuer eine volle Top-50-Referenz. Das passiert bei Maps oder Mod-Kombinationen, bei denen die sichtbare API-Stichprobe klein ist.

`Top-50 direkt` ist das einzige System, das den festen Bereich von `95` bis `100 RP` vergeben darf. Dafuer muss ein bestaetigter Map-Rang innerhalb einer vollen Top-50-Referenz vorhanden sein.

`Replay-Kandidaten` sind Scores, bei denen ein Online- oder lokales Replay existiert. Sie sind wichtig fuer eine spaetere replay-exakte RP-Engine, aber Replayframe-Decoding ist noch nicht voll implementiert.

## RP Schritt 1: Stable/Lazer Neutraler Score

Der erste Schritt ist ein stable/lazer-unabhaengiger interner Score namens `S_rp`.

Er nutzt:

- Spieler-Combo
- Map-Max-Combo, wenn bekannt
- Accuracy

```text
S_rp = (player_combo / map_max_combo * 70000)
     + (accuracy_percent / 100 * 30000)
```

Warum das existiert:

- osu!stable Scores koennen durch ScoreV1 sehr gross werden.
- osu!lazer standardised score ist anders gedeckelt.
- Rohe stable- und lazer-Scorewerte direkt zu vergleichen waere nicht fair.
- `S_rp` macht beide Clients ueber Combo und Accuracy vergleichbarer.

Ein perfekter Full-Combo-SS erreicht `100000` interne Punkte.

Wenn die Max-Combo fehlt, kann RP nur mit niedrigerer Confidence angezeigt werden oder der Score wird fuer RP uebersprungen.

## RP Schritt 2: Referenz-S_rp

RP braucht einen Vergleichspunkt fuer die Map. Die App nennt diesen Wert in der UI `RP-Referenz`.

Diese Referenz ist nicht immer ein echter Top-50-Schnitt. Darum zeigt die UI die Referenz-Quelle getrennt an.

Referenz-Regeln:

- `echter Top-50-Schnitt`: mindestens 50 nutzbare Leaderboard-Scores sind fuer den relevanten Map-/Mod-Kontext verfuegbar.
- `sichtbarer API-Schnitt`: zwischen 10 und 49 nutzbare Leaderboard-Scores sind verfuegbar, also mittelt die App nur die sichtbare nutzbare Stichprobe.
- `Platz-1-Referenz x 0.95`: weniger als 10 nutzbare Scores sind verfuegbar, also nutzt die App Platz 1 als vorsichtigen Referenzpunkt.
- `Spieler-Fallback`: kein sinnvoller Leaderboard-Kontext ist verfuegbar, also wird der eigene Score nur als schwacher Fallback genutzt.

Wenn mindestens 50 nutzbare Scores verfuegbar sind:

```text
reference_s_rp = durchschnittlicher S_rp der Top 50 nutzbaren Leaderboard-Scores
```

Wenn 10 bis 49 nutzbare Scores verfuegbar sind:

```text
reference_s_rp = durchschnittlicher S_rp der sichtbaren nutzbaren Scores
```

Wenn 1 bis 9 nutzbare Scores verfuegbar sind:

```text
reference_s_rp = S_rp von Platz 1 * 0.95
```

Der alte `Platz 1 * 0.75`-Fallback wurde entfernt, weil dadurch Scores ausserhalb der Top 50 kuenstlich wie perfekte `100 RP` Scores aussehen konnten.

## RP Schritt 3: Map-Faktor

Der Map-Faktor beschreibt, wie stark der Map-Kontext vor der finalen Deckelung in die RP-Schaetzung einfliesst.

```text
M_map = star_rating * (1 + (1 - success_rate))
```

Mit:

```text
success_rate = passcount / playcount
```

Das bedeutet:

- hoeheres Star Rating erhoeht den Faktor
- niedrigere Passrate erhoeht den Faktor
- der Faktor wird mit `log10(M_map)` geglaettet, damit er nicht endlos explodiert

Der Map-Faktor ist kein finales Ergebnis. Er ist nur ein Multiplikator innerhalb der RP-Schaetzung.

## RP Schritt 4: Top-50-Grenze

Der Bereich von `95` bis `100 RP` ist reserviert.

Ein Score darf nur dann in diesen Bereich, wenn:

- die App eine volle nutzbare Top-50-Referenz hat
- der Map-Rang des Spielers bekannt ist
- der Rang `50` oder besser ist

Dann gilt:

```text
RP = 95 + ((50 - rank) / 49) * 5
```

Platz 50 bekommt `95 RP`.

Platz 1 bekommt `100 RP`.

Jeder Estimate ausserhalb der Top 50 wird unter `95 RP` gedeckelt. Wenn die App den Map-Rang kennt und dieser schlechter als 50 ist, wird der Estimate zusaetzlich ueber den Rang gedaempft. Dadurch kann ein Rang `#283` Score nicht mehr nur wegen einer unvollstaendigen Referenz-Stichprobe auf `100 RP` springen.

## RP Schritt 5: Estimate-Formel

```text
RP_pre = (S_rp_player / reference_s_rp) * 95 * log10(M_map)
```

Danach wird die geschaetzte Spike-Strafe abgezogen und die Nicht-Top-50-Deckelung angewendet.

## RP Schritt 6: Replay Exact Status

Replay Exact ist noch nicht voll implementiert. Die Beta tut nicht so, als koennte sie schon exakte Replay-basierte RP berechnen.

Stattdessen zeigt die App, ob ein Score spaeter replay-exakt werden koennte:

- `online replay available`: osu! meldet, dass ein Online-Replay existiert.
- `local replay available`: der Score wurde aus einer lokalen `.osr` Replay-Quelle gelesen.
- `no replay`: am Score haengt keine Replay-Quelle.

Warum Replay-Daten wichtig sind:

Die normale Score-API gibt nur das Ergebnis:

```text
98.20% Accuracy, 1 Miss, 170x Combo
```

RP muss aber wissen, wo der Fehler passiert ist:

```text
War der Miss im schwersten Spike oder an einer sehr leichten Stelle der Map?
```

Dafuer braucht man Replayframe-Decoding. `.osr` Replaydaten enthalten Timing, Cursorbewegung und Tastenzustaende. Sobald ein Decoder eingebaut ist, kann die App Replayframes mit der `.osu` Map-Datei vergleichen und echte Combo-Break-Zeitpunkte viel genauer schaetzen.

Bis dahin ist Replay Exact eine Status-Ebene, keine fertige Berechnungsebene.

## RP Schritt 7: Aktuelle Spike-Strafe

Die aktuelle Beta nutzt eine geschaetzte Spike-Strafe.

Sie beachtet:

- normale Misses
- wahrscheinliche Sliderbreaks, wenn es keine Misses gibt, aber die Combo klar gebrochen ist
- osu! `failtimes` als grobes Druckprofil, wenn verfuegbar

Das ist nuetzlich, aber nicht perfekt.

Wichtige Einschraenkung:

`failtimes` sind kein vollstaendiges globales Miss-Histogramm fuer jede Mod-Kombination. Sie sind nur das oeffentliche grobe Fail-/Exit-Timing-Signal, das osu! fuer Beatmaps bereitstellt.

Weil exakte Online-Miss-Zeitpunkte und Sliderbreak-Zeitpunkte nicht als fertige oeffentliche Datenquelle verfuegbar sind, brauchen exakte Spike-Strafen Replay-Decoding.

## RP Confidence

Jeder RP-Score hat einen Confidence-Wert.

Hohe Confidence bedeutet meistens:

- Beatmap-ID existiert
- Max Combo ist bekannt
- Beatmap-Daten wurden geladen
- RP-Referenz existiert
- failtimes oder Map-Druckdaten existieren
- Replay-Daten existieren oder der Score hat starke Zusatzdaten

Niedrigere Confidence bedeutet meistens:

- Beatmap-ID fehlt
- Max Combo fehlt
- keine RP-Referenz
- keine failtimes
- kein Replay
- Fallback-Werte wurden gebraucht
- osu!api war nicht erreichbar

RP sollte immer zusammen mit Confidence gelesen werden. Ein `90 RP` Score mit niedriger Confidence ist nicht dasselbe wie ein `90 RP` Score mit hoher Confidence.

## Was Exakt Ist Und Was Geschaetzt Ist

Exakt oder nah an exakt:

- gespeichertes Score-Ergebnis
- Accuracy
- Combo
- Miss-Anzahl
- PP, wenn verfuegbar oder nachberechnet
- lokaler Score-Zeitpunkt
- Beatmap-Metadaten, wenn verfuegbar

Geschaetzt:

- RP-Spike-Strafe, solange Replay-Decoding fehlt
- Sliderbreak-Erkennung ohne Replayanalyse
- Map-Druck, wenn nur `failtimes` verfuegbar sind
- RP-Referenz, wenn nur eine begrenzte Leaderboard-Stichprobe verfuegbar ist

Nicht als fertige oeffentliche Quelle verfuegbar:

- exakte Miss-Zeitpunkte fuer jeden Online-Score
- exakte Sliderbreak-Zeitpunkte fuer jeden Online-Score
- globales mod-spezifisches Miss-Histogramm fuer jede Beatmap
- komplette alte Score-History jedes Spielers

## Bekannte Grenzen

- Das ist eine Beta und kann falsche Berechnungen enthalten.
- osu!api gibt nicht jeden historischen Score aus.
- osu!api gibt keine exakten Hit-Event-Zeitachsen aus.
- Lokale lazer-Formate koennen sich aendern.
- pp.huismetbenen ist optional und ein Drittanbieter.
- RP ist experimentell und kein offizielles osu!-Ranking-System.

## Roadmap

Geplante oder moegliche naechste Schritte:

- lokale `.osr` Replayframes dekodieren
- Online-Replay-Download nutzen, wenn verfuegbar
- bessere Combo-Break-Erkennung aus Replay + `.osu` Mapdaten bauen
- RP-Confidence-Erklaerungen in der UI verbessern
- RP-Details pro Map hinzufuegen
- Export-Optionen fuer Scorelisten hinzufuegen
- Setup-Diagnose fuer Nutzer ohne Node.js oder npm verbessern

## Entwicklung

Nuetzliche Befehle:

```bash
npm install
npm start
node --check server.js
node --check public/app.js
```

Der App-Einstiegspunkt ist:

```text
server.js
```

Frontend-Dateien liegen in:

```text
public/
```

Lokale dauerhafte App-Daten liegen in:

```text
data/
```

`data/` nicht committen.
