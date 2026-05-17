# GitHub Upload Anleitung

Diese Version ist die saubere Beta-Version ohne private Daten.

## Wichtig vor dem Hochladen

Diese Dateien und Ordner duerfen nicht in GitHub landen:

- `.env`
- `data/`
- `node_modules/`
- `*.log`
- `*.sqlite`
- lokale osu!-Score-Dateien
- API Client Secret oder echte persoenliche Zugangsdaten

In diesem Upload-Ordner sind nur Code, Setup-Dateien, Beispiel-Konfiguration und Dokumentation enthalten.

## GitHub-Repo per Webseite erstellen

1. Auf `https://github.com` anmelden.
2. Oben rechts auf `+` klicken und `New repository` waehlen.
3. Repository-Name: `osu-mod-score-finder-beta`.
4. Sichtbarkeit waehlen: `Public`, wenn andere es sehen duerfen, sonst `Private`.
5. Keine README, keine `.gitignore` und keine License bei GitHub automatisch erzeugen lassen, weil diese Dateien hier schon vorbereitet sind.
6. Repository erstellen.
7. Auf `uploading an existing file` oder `Add file -> Upload files` klicken.
8. Den Inhalt dieses Ordners hochladen, nicht deine lokale Testversion und nicht den Ordner mit `.env`.
9. Unten eine Commit-Nachricht eintragen, zum Beispiel `Initial beta release`.
10. Auf `Commit changes` klicken.

## Nach dem Upload testen

Ein anderer Nutzer sollte das Repo herunterladen, `setup-beta.bat` starten, eigene osu!-API-Daten und lokale osu!-Ordner eintragen und danach `start-beta.bat` starten koennen.

## ZIP-Hinweis

Die ZIP-Datei ist praktisch zum Teilen oder Sichern. Fuer GitHub ist es besser, den entpackten Ordnerinhalt hochzuladen, damit GitHub die Dateien direkt anzeigen kann.
