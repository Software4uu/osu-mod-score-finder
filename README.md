# osu! Mod Score Finder Beta

Lokale Beta fuer eine osu!-Score-Webseite. Die App liest Score-Daten nur aus der lokalen osu!-Installation, aus der offiziellen osu!api und optional aus pp.huismetbenen, und speichert gefundene Ergebnisse lokal in `data/scores.sqlite`.

Zum bequemen Lesen gibt es zusaetzlich:

- `README.html` fuer den Browser
- `README.ipynb` als Notebook-Ansicht

## Datenschutz

- `.env` enthaelt Client ID, Client Secret und lokale Pfade. Diese Datei wird nicht committed.
- `data/` enthaelt lokale Score-Datenbanken und wird nicht committed.
- `node_modules/` und Logs werden nicht committed.
- Lokale osu!-Dateien werden gelesen, aber nicht in dieses Projekt kopiert.

Vor einem GitHub-Upload pruefen:

```powershell
git status --ignored
```

In der Ausgabe duerfen `.env`, `data/`, `node_modules/` und `*.log` nicht als zu committende Dateien auftauchen.

## Setup fuer Nutzer

1. `setup-beta.bat` starten.
2. Im Fenster pruefen, ob Node.js und Projekt-Abhaengigkeiten vorhanden sind.
3. Fehlende Punkte bleiben auswaehlbar, vorhandene Punkte sind ausgegraut.
4. `Client ID`, `Client Secret`, `osu! stable Ordner` und `osu!lazer Ordner` eintragen.
5. Speichern.
6. Danach `start-beta.bat` starten.

Die osu! OAuth Daten erstellt man unter:

<https://osu.ppy.sh/home/account/edit>

Callback URL:

```text
http://localhost:5173/callback
```

## Was die App macht

- Spieler per Namen suchen
- Stable und lazer Scores zusammen oder getrennt betrachten
- Mods filtern, inklusive osu!lazer Mods wie `CL`, `DA`, `RA`, `AL`
- UI-Sprache direkt oben rechts zwischen Deutsch und Englisch wechseln
- Scores lokal in SQLite speichern, damit spaeter nicht erneut alles online erreichbar sein muss
- PP aus API, pp.huismetbenen oder lokal neu berechnet anzeigen
- Optional nur den besten Try pro Map/Difficulty anzeigen
- PP-Rangfenster wie `1` bis `55` anzeigen
- Improvement-Ansicht fuer letzten Try, letzte Stunde oder heute

## Starten

```powershell
.\start-beta.bat
```

Oder manuell:

```powershell
npm install
npm start
```

Danach oeffnen:

<http://localhost:5173>
