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
- beatmap scores / leaderboard anchors
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

## RP System A: Estimate

Estimate is the baseline RP system.

It uses data already stored locally:

- player combo
- map max combo when known
- accuracy
- miss count
- star rating when known
- pass/play ratio when known

The first step is a stable/lazer-independent internal score called `S_rp`.

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

If important map data is missing, the RP result can still be shown, but confidence becomes lower.

## RP System B: API Anchor

API Anchor adds public online context from osu!api.

The app tries to fetch:

- beatmap metadata
- `max_combo`
- `passcount`
- `playcount`
- `failtimes`
- modded difficulty attributes
- beatmap leaderboard scores

The leaderboard anchor is calculated from matching leaderboard scores when possible.

If at least 50 usable scores are available:

```text
S_rp_avg50 = average S_rp of the top 50 leaderboard scores
```

If fewer than 50 usable scores are available:

```text
S_rp_avg50 = S_rp of rank 1 * 0.75
```

If no usable leaderboard data is available, RP falls back to local estimate mode and confidence drops.

The map factor is:

```text
M_map = star_rating * (1 + (1 - success_rate))
```

With:

```text
success_rate = passcount / playcount
```

This means:

- harder maps increase RP
- maps with lower pass rate increase RP
- easy maps are protected internally so the logarithmic formula cannot become unstable

If the score is inside a full top 50 leaderboard:

```text
RP = 95 + ((50 - rank) / 49) * 5
```

Rank 50 receives `95 RP`.

Rank 1 receives `100 RP`.

For non-top-50 scores:

```text
RP_pre = (S_rp_player / S_rp_avg50) * 95 * log10(M_map)
```

After that, the estimated spike penalty is subtracted.

## RP System C: Replay Exact Status

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

## Current Spike Penalty

The current beta uses an estimated spike penalty.

It considers:

- normal misses
- likely slider breaks when there are no misses but combo is clearly broken
- osu! `failtimes` as a rough pressure profile when available

This is useful, but it is not perfect.

Important limitation:

`failtimes` are not a complete global miss histogram for every mod combination. They are only the public rough fail/exit timing signal that osu! exposes for beatmaps.

## RP Confidence

Every RP score has a confidence value.

High confidence usually means:

- beatmap ID exists
- max combo is known
- beatmap data was loaded
- leaderboard anchor exists
- failtimes or map pressure data exist
- replay data exists or the score has strong supporting data

Lower confidence usually means:

- missing beatmap ID
- missing max combo
- no leaderboard anchor
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
- leaderboard anchor when fewer than 50 scores are available

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
- Beatmap-Scores / Leaderboard-Anker
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

## RP System A: Estimate

Estimate ist das Basis-RP-System.

Es nutzt lokal gespeicherte Daten:

- Spieler-Combo
- Map-Max-Combo, wenn bekannt
- Accuracy
- Miss-Anzahl
- Star Rating, wenn bekannt
- pass/play-Verhaeltnis, wenn bekannt

Der erste Schritt ist ein stable/lazer-unabhaengiger interner Score namens `S_rp`.

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

Wenn wichtige Map-Daten fehlen, kann RP trotzdem angezeigt werden, aber die Confidence sinkt.

## RP System B: API-Anker

API-Anker fuegt oeffentlichen Online-Kontext aus der osu!api hinzu.

Die App versucht zu laden:

- Beatmap-Metadaten
- `max_combo`
- `passcount`
- `playcount`
- `failtimes`
- modifizierte Difficulty-Attribute
- Beatmap-Leaderboard-Scores

Der Leaderboard-Anker wird, wenn moeglich, aus passenden Leaderboard-Scores berechnet.

Wenn mindestens 50 nutzbare Scores verfuegbar sind:

```text
S_rp_avg50 = durchschnittlicher S_rp der Top 50 Leaderboard-Scores
```

Wenn weniger als 50 nutzbare Scores verfuegbar sind:

```text
S_rp_avg50 = S_rp von Platz 1 * 0.75
```

Wenn keine nutzbaren Leaderboard-Daten verfuegbar sind, faellt RP auf den lokalen Estimate zurueck und die Confidence sinkt.

Der Map-Faktor ist:

```text
M_map = star_rating * (1 + (1 - success_rate))
```

Mit:

```text
success_rate = passcount / playcount
```

Das bedeutet:

- schwerere Maps erhoehen RP
- Maps mit niedriger Passrate erhoehen RP
- leichte Maps werden intern geschuetzt, damit die logarithmische Formel nicht instabil wird

Wenn der Score in einem vollen Top-50-Leaderboard liegt:

```text
RP = 95 + ((50 - rank) / 49) * 5
```

Platz 50 bekommt `95 RP`.

Platz 1 bekommt `100 RP`.

Fuer Scores ausserhalb der Top 50:

```text
RP_pre = (S_rp_player / S_rp_avg50) * 95 * log10(M_map)
```

Danach wird die geschaetzte Spike-Strafe abgezogen.

## RP System C: Replay Exact Status

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

## Aktuelle Spike-Strafe

Die aktuelle Beta nutzt eine geschaetzte Spike-Strafe.

Sie beachtet:

- normale Misses
- wahrscheinliche Sliderbreaks, wenn es keine Misses gibt, aber die Combo klar gebrochen ist
- osu! `failtimes` als grobes Druckprofil, wenn verfuegbar

Das ist nuetzlich, aber nicht perfekt.

Wichtige Einschraenkung:

`failtimes` sind kein vollstaendiges globales Miss-Histogramm fuer jede Mod-Kombination. Sie sind nur das oeffentliche grobe Fail-/Exit-Timing-Signal, das osu! fuer Beatmaps bereitstellt.

## RP Confidence

Jeder RP-Score hat einen Confidence-Wert.

Hohe Confidence bedeutet meistens:

- Beatmap-ID existiert
- Max Combo ist bekannt
- Beatmap-Daten wurden geladen
- Leaderboard-Anker existiert
- failtimes oder Map-Druckdaten existieren
- Replay-Daten existieren oder der Score hat starke Zusatzdaten

Niedrigere Confidence bedeutet meistens:

- Beatmap-ID fehlt
- Max Combo fehlt
- kein Leaderboard-Anker
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
- Leaderboard-Anker, wenn weniger als 50 Scores verfuegbar sind

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
