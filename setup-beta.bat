@echo off
setlocal
cd /d "%~dp0"

echo Starte osu! Mod Score Finder Setup...
echo Dieses Fenster bleibt offen, falls das Setup einen Fehler meldet.
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
set "SETUP_EXIT=%ERRORLEVEL%"

echo.
if not "%SETUP_EXIT%"=="0" (
  echo Setup wurde mit Fehlercode %SETUP_EXIT% beendet.
  echo Falls vorhanden, pruefe setup.log im Projektordner.
) else (
  echo Setup-Fenster wurde geschlossen.
  echo Wenn das Setup fertig war, starte jetzt start-beta.bat.
)
echo.
pause
exit /b %SETUP_EXIT%
