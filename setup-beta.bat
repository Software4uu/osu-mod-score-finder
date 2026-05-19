@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"
set "RECOVERED_SETUP=0"
set "START_AFTER_SETUP=0"

echo Starte osu! Mod Score Finder Setup...
echo Dieses Fenster bleibt offen, falls das Setup einen Fehler meldet.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set "SETUP_EXIT=%ERRORLEVEL%"

echo.
if not "%SETUP_EXIT%"=="0" (
  echo Setup meldete Fehlercode %SETUP_EXIT%. Pruefe, ob die Kern-Abhaengigkeiten fehlen...
  if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
    where npm >nul 2>nul
    if not errorlevel 1 (
      echo Starte Fallback: npm install ohne optionale Erweiterungen.
      echo [%DATE% %TIME%] Fallback wird gestartet: npm install --no-audit --no-fund --omit=optional>>"%~dp0setup.log"
      call npm install --no-audit --no-fund --omit=optional >>"%~dp0setup.log" 2>&1
      set "NPM_FALLBACK_EXIT=%ERRORLEVEL%"
      echo Fallback npm Exit Code: !NPM_FALLBACK_EXIT!
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

if not "%SETUP_EXIT%"=="0" (
  echo Setup wurde mit Fehlercode %SETUP_EXIT% beendet.
  echo Falls vorhanden, folgen die letzten Zeilen aus setup.log:
  echo.
  if exist "%~dp0setup.log" (
    powershell -NoProfile -Command "Get-Content -LiteralPath '%~dp0setup.log' -Tail 35"
  ) else (
    echo setup.log wurde noch nicht erstellt.
  )
) else (
  echo Setup wurde erfolgreich beendet.
  echo Alles Notwendige wurde eingerichtet oder gespeichert.
  echo.
  if "!START_AFTER_SETUP!"=="1" if exist "%~dp0start-beta.bat" (
    if "!RECOVERED_SETUP!"=="1" (
      echo Starte die App nach erfolgreichem Fallback im selben Fenster...
    ) else (
      echo Starte die App im selben Fenster...
    )
    call "%~dp0start-beta.bat"
    set "SETUP_EXIT=!ERRORLEVEL!"
    if not "!SETUP_EXIT!"=="0" (
      echo.
      echo App-Start wurde mit Fehlercode !SETUP_EXIT! beendet.
    )
  ) else (
    echo Wenn du die App starten willst, nutze start-beta.bat.
  )
)
echo.
pause
exit /b !SETUP_EXIT!
