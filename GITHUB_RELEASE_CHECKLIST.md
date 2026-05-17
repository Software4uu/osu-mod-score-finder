# GitHub Beta Checklist

Vor dem Upload:

- [ ] `.env` ist nicht vorhanden oder nicht zum Commit vorgemerkt.
- [ ] `data/` ist nicht vorhanden oder nicht zum Commit vorgemerkt.
- [ ] `node_modules/` ist nicht vorhanden oder nicht zum Commit vorgemerkt.
- [ ] Keine `*.log` Dateien committen.
- [ ] `setup-beta.bat` startet das Setup-Fenster.
- [ ] `start-beta.bat` startet Setup automatisch, wenn `.env` oder Abhaengigkeiten fehlen.
- [ ] `README.md` enthaelt keine echten API-Daten und keine lokalen privaten Pfade.

Empfohlene Kontrolle:

```powershell
rg -n "DEINE_CLIENT_ID|DEIN_OSU_NAME|DEIN_WINDOWS_USER|OSU_CLIENT_SECRET=.*[^= ]" .
git status --ignored
```

Treffer in Code fuer Platzhalter oder Variablennamen sind okay. Echte Werte oder private Pfade nicht.
