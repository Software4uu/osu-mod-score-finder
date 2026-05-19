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
  echo Wenn die App nicht automatisch geoeffnet wurde, starte jetzt start-beta.bat.
)
echo.
pause
exit /b %SETUP_EXIT%
