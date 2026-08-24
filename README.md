# osu! Mod Score Finder Beta

## English

Local beta for an osu! score website. The app reads score data only from the local osu! installation, from the official osu! API, and optionally from pp.huismetbenen, then stores found results locally in `data/scores.sqlite`.

For easier viewing, there are also:

- `README.html` for the browser
- `README.ipynb` as a notebook view

## Privacy

- `.env` contains Client ID, Client Secret, and local paths. This file is not committed.
- `data/` contains local score databases and is not committed.
- `node_modules/` and log files are not committed.
- Local osu! files are read, but not copied into this project.

Before a GitHub upload, check with:

```bash
git status --ignored
```

In the output, `.env`, `data/`, `node_modules/`, and `*.log` must not appear as files to be committed.

## Setup for users

1. Run `setup-beta.bat`.
2. In the window, check whether Node.js and project dependencies are available.
3. Missing items remain selectable, available items are grayed out.
4. Enter `Client ID`, `Client Secret`, `osu! stable folder`, and `osu!lazer folder`.
5. Save.
6. Then run `start-beta.bat`.

You can create the osu! OAuth data here:

https://osu.ppy.sh/home/account/edit

Callback URL:

```text
http://localhost:5173/callback
```

## What the app does

- Search for players by name
- View stable and lazer score collections separately
- Filter mods, including osu!lazer mods such as `CL`, `DA`, `RA`, `AL`
- Switch the UI language directly between German and English in the top right
- Store scores locally in SQLite so results do not always need to be fetched online again
- Show PP from the API, pp.huismetbenen, or local recalculation
- Local PP recalculation uses `rosu-pp-js`; setup/start try to refresh it to `latest`, and the UI shows the PP engine version used
- Optionally show only the best try for each map/difficulty
- Display PP rank windows such as `1` to `100`
- Improvement view for the latest try, the last hour, or today
- Live scanner for newly saved local scores after a search
- Calendar tab with a month grid, played days, and all stored scores for a selected day
- Calendar PP range filter plus orange highlight for the day with the month's top PP play
- Map detail view with all stored tries on the same map difficulty
- Built-in GitHub update check that can start the local updater without touching `.env`, `data/`, local score databases, or osu! folders

## Start

```bash
./start-beta.bat
```

Or manually:

```bash
npm install
npm start
```

Then open:

http://127.0.0.1:5173

## Updates

The app checks the GitHub repository for a newer version and shows the result in the top-right status area.

- `Up to date` means the local version matches the newest known GitHub version.
- `Update available` means the version on GitHub is newer. Click the update pill to start `update-beta.bat`.
- If the folder is a Git clone, the updater uses `git pull --ff-only origin main`.
- If the folder is a downloaded GitHub ZIP, the updater downloads the newest ZIP and copies only project files.
- Local files are preserved: `.env`, `data/`, `node_modules/`, `.npm-cache`, logs, and local osu! folders are not uploaded or overwritten.
- The update prompt shows a short "what's new" list from the newest GitHub commits.

After a successful update, the updater stops the old local server and starts `start-beta.bat` again automatically.

For future releases, increase the `version` in `package.json`. This is what ZIP users rely on for reliable update detection.

---

## Deutsch

Lokale Beta für eine osu!-Score-Webseite. Die App liest Score-Daten nur aus der lokalen osu!-Installation, aus der offiziellen osu! API und optional aus pp.huismetbenen, und speichert gefundene Ergebnisse lokal in `data/scores.sqlite`.

Zum bequemen Lesen gibt es zusätzlich:

- `README.html` für den Browser
- `README.ipynb` als Notebook-Ansicht

## Datenschutz

- `.env` enthält Client ID, Client Secret und lokale Pfade. Diese Datei wird nicht committed.
- `data/` enthält lokale Score-Datenbanken und wird nicht committed.
- `node_modules/` und Logs werden nicht committed.
- Lokale osu!-Dateien werden gelesen, aber nicht in dieses Projekt kopiert.

Vor einem GitHub-Upload prüfen:

```bash
git status --ignored
```

In der Ausgabe dürfen `.env`, `data/`, `node_modules/` und `*.log` nicht als zu commitende Dateien auftauchen.

## Setup für Nutzer

1. `setup-beta.bat` starten.
2. Im Fenster prüfen, ob Node.js und Projekt-Abhängigkeiten vorhanden sind.
3. Fehlende Punkte bleiben auswählbar, vorhandene Punkte sind ausgegraut.
4. `Client ID`, `Client Secret`, `osu! stable Ordner` und `osu!lazer Ordner` eintragen.
5. Speichern.
6. Danach `start-beta.bat` starten.

Die osu! OAuth Daten erstellt man unter:

https://osu.ppy.sh/home/account/edit

Callback URL:

```text
http://localhost:5173/callback
```

## Was die App macht

- Spieler per Namen suchen
- Stable und lazer Scores auseinander getrennt betrachten
- Mods filtern, inklusive osu!lazer Mods wie `CL`, `DA`, `RA`, `AL`
- UI-Sprache direkt oben rechts zwischen Deutsch und Englisch wechseln
- Scores lokal in SQLite speichern, damit später nicht erneut alles online erreichbar sein muss
- PP aus API, pp.huismetbenen oder lokal neu berechnet anzeigen
- Lokale PP-Neuberechnung nutzt `rosu-pp-js`; Setup/Start versuchen diese Engine auf `latest` zu aktualisieren, und die UI zeigt die genutzte PP-Engine-Version
- Optional nur den besten Try pro Map/Difficulty anzeigen
- PP-Rangfenster wie `1` bis `100` anzeigen
- Improvement-Ansicht für letzten Try, letzte Stunde oder heute
- Live-Scanner für neu gespeicherte lokale Scores nach einer Suche
- Kalender-Tab mit Monatsraster, gespielten Tagen und allen gespeicherten Scores eines Tages
- Kalender-PP-Range-Filter plus orange Markierung fuer den Tag mit dem Top-PP-Play des Monats
- Map-Detailansicht mit allen gespeicherten Tries auf derselben Difficulty
- Eingebauter GitHub-Update-Check, der den lokalen Updater starten kann, ohne `.env`, `data/`, lokale Score-Datenbanken oder osu!-Ordner anzufassen

## Starten

```bash
./start-beta.bat
```

Oder manuell:

```bash
npm install
npm start
```

Danach öffnen:

http://127.0.0.1:5173

## Updates

Die App prueft das GitHub-Repository auf eine neuere Version und zeigt das Ergebnis oben rechts im Statusbereich.

- `Aktuell` bedeutet: deine lokale Version entspricht der neuesten bekannten GitHub-Version.
- `Update verfuegbar` bedeutet: auf GitHub liegt eine neuere Version. Klicke auf den Update-Status, um `update-beta.bat` zu starten.
- Wenn der Ordner ein Git-Clone ist, nutzt der Updater `git pull --ff-only origin main`.
- Wenn der Ordner ein heruntergeladenes GitHub-ZIP ist, laedt der Updater das neueste ZIP herunter und kopiert nur Projektdateien.
- Lokale Dateien bleiben erhalten: `.env`, `data/`, `node_modules/`, `.npm-cache`, Logs und lokale osu!-Ordner werden nicht hochgeladen und nicht ueberschrieben.
- Die Update-Abfrage zeigt kurz, was neu ist, basierend auf den neuesten GitHub-Commits.

Nach einem erfolgreichen Update stoppt der Updater den alten lokalen Server und startet `start-beta.bat` automatisch neu.

Fuer neue Releases sollte die `version` in `package.json` erhoeht werden. Darauf verlassen sich ZIP-Nutzer fuer eine saubere Update-Erkennung.
