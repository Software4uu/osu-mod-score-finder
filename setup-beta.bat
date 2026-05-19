@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "RECOVERED_SETUP=0"
set "START_AFTER_SETUP=0"

call :LoadLanguage

if /I "!SETUP_LANG!"=="en" (
  echo Starting osu^! Mod Score Finder setup...
  echo This window stays open if setup reports an error.
) else (
  echo Starte osu^! Mod Score Finder Setup...
  echo Dieses Fenster bleibt offen, falls das Setup einen Fehler meldet.
)
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set "SETUP_EXIT=%ERRORLEVEL%"
call :LoadLanguage

echo.
if not "!SETUP_EXIT!"=="0" (
  if /I "!SETUP_LANG!"=="en" (
    echo Setup reported error code !SETUP_EXIT!. Checking whether core dependencies are missing...
  ) else (
    echo Setup meldete Fehlercode !SETUP_EXIT!. Pruefe, ob die Kern-Abhaengigkeiten fehlen...
  )
  if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
    where npm >nul 2>nul
    if not errorlevel 1 (
      if /I "!SETUP_LANG!"=="en" (
        echo Starting fallback: npm install without optional extensions.
        echo [%DATE% %TIME%] Fallback started: npm install --no-audit --no-fund --omit=optional>>"%~dp0setup.log"
      ) else (
        echo Starte Fallback: npm install ohne optionale Erweiterungen.
        echo [%DATE% %TIME%] Fallback wird gestartet: npm install --no-audit --no-fund --omit=optional>>"%~dp0setup.log"
      )
      call npm install --no-audit --no-fund --omit=optional >>"%~dp0setup.log" 2>&1
      set "NPM_FALLBACK_EXIT=%ERRORLEVEL%"
      if /I "!SETUP_LANG!"=="en" (
        echo Fallback npm exit code: !NPM_FALLBACK_EXIT!
      ) else (
        echo Fallback npm Exit Code: !NPM_FALLBACK_EXIT!
      )
    )
  )
  if exist "%~dp0node_modules\rosu-pp-js\package.json" if exist "%~dp0.env" (
    set "SETUP_EXIT=0"
    set "RECOVERED_SETUP=1"
    set "START_AFTER_SETUP=1"
  )
)

if exist "%~dp0.setup-start-app" (
  set "START_AFTER_SETUP=1"
  del "%~dp0.setup-start-app" >nul 2>nul
)

if not "!SETUP_EXIT!"=="0" (
  if /I "!SETUP_LANG!"=="en" (
    echo Setup ended with error code !SETUP_EXIT!.
    echo If available, the last lines from setup.log follow:
  ) else (
    echo Setup wurde mit Fehlercode !SETUP_EXIT! beendet.
    echo Falls vorhanden, folgen die letzten Zeilen aus setup.log:
  )
  echo.
  if exist "%~dp0setup.log" (
    powershell -NoProfile -Command "Get-Content -LiteralPath '%~dp0setup.log' -Tail 35"
  ) else (
    if /I "!SETUP_LANG!"=="en" (
      echo setup.log has not been created yet.
    ) else (
      echo setup.log wurde noch nicht erstellt.
    )
  )
) else (
  if /I "!SETUP_LANG!"=="en" (
    echo Setup completed successfully.
    echo Everything required was installed or saved.
  ) else (
    echo Setup wurde erfolgreich beendet.
    echo Alles Notwendige wurde eingerichtet oder gespeichert.
  )
  echo.
  if "!START_AFTER_SETUP!"=="1" if exist "%~dp0start-beta.bat" (
    if "!RECOVERED_SETUP!"=="1" (
      if /I "!SETUP_LANG!"=="en" (
        echo Starting the app after successful fallback in the same window...
      ) else (
        echo Starte die App nach erfolgreichem Fallback im selben Fenster...
      )
    ) else (
      if /I "!SETUP_LANG!"=="en" (
        echo Starting the app in the same window...
      ) else (
        echo Starte die App im selben Fenster...
      )
    )
    call "%~dp0start-beta.bat"
    set "SETUP_EXIT=!ERRORLEVEL!"
    call :LoadLanguage
    if not "!SETUP_EXIT!"=="0" (
      echo.
      if /I "!SETUP_LANG!"=="en" (
        echo App start ended with error code !SETUP_EXIT!.
      ) else (
        echo App-Start wurde mit Fehlercode !SETUP_EXIT! beendet.
      )
    )
  ) else (
    if /I "!SETUP_LANG!"=="en" (
      echo To start the app, use start-beta.bat.
    ) else (
      echo Wenn du die App starten willst, nutze start-beta.bat.
    )
  )
)

call :PauseLocalized
exit /b !SETUP_EXIT!

:LoadLanguage
set "SETUP_LANG=de"
if exist "%~dp0.setup-language" (
  set /p SETUP_LANG=<"%~dp0.setup-language"
)
if /I not "!SETUP_LANG!"=="en" set "SETUP_LANG=de"
exit /b 0

:PauseLocalized
echo.
if /I "!SETUP_LANG!"=="en" (
  echo Press any key to continue . . .
  pause >nul
) else (
  pause
)
exit /b 0
