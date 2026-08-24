@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

call :LoadLanguage

if /I "!SETUP_LANG!"=="en" (
  echo Starting osu^! Mod Score Finder update...
  echo This window stays open so you can read the result.
) else (
  echo Starte osu^! Mod Score Finder Update...
  echo Dieses Fenster bleibt offen, damit du das Ergebnis lesen kannst.
)
echo.

where powershell >nul 2>nul
if errorlevel 1 (
  if /I "!SETUP_LANG!"=="en" (
    echo PowerShell was not found. Update cannot start.
  ) else (
    echo PowerShell wurde nicht gefunden. Das Update kann nicht gestartet werden.
  )
  call :PauseLocalized
  exit /b 1
)

if not exist "%~dp0update.ps1" (
  if /I "!SETUP_LANG!"=="en" (
    echo update.ps1 was not found in this folder.
  ) else (
    echo update.ps1 wurde in diesem Ordner nicht gefunden.
  )
  call :PauseLocalized
  exit /b 1
)

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0update.ps1"
set "UPDATE_EXIT=%ERRORLEVEL%"
call :LoadLanguage

echo.
if "!UPDATE_EXIT!"=="0" (
  if /I "!SETUP_LANG!"=="en" (
    echo Update completed successfully.
    echo The app was restarted automatically.
  ) else (
    echo Update wurde erfolgreich abgeschlossen.
    echo Die App wurde automatisch neu gestartet.
  )
) else (
  if /I "!SETUP_LANG!"=="en" (
    echo Update ended with error code !UPDATE_EXIT!.
    echo If available, the last lines from data\update.log follow:
  ) else (
    echo Update wurde mit Fehlercode !UPDATE_EXIT! beendet.
    echo Falls vorhanden, folgen die letzten Zeilen aus data\update.log:
  )
  echo.
  if exist "%~dp0data\update.log" (
    powershell -NoProfile -Command "Get-Content -LiteralPath '%~dp0data\update.log' -Tail 35"
  )
)

call :PauseLocalized
exit /b !UPDATE_EXIT!

:LoadLanguage
set "SETUP_LANG=en"
if exist "%~dp0.setup-language" (
  set /p SETUP_LANG=<"%~dp0.setup-language"
)
if /I not "!SETUP_LANG!"=="de" if /I not "!SETUP_LANG!"=="en" set "SETUP_LANG=en"
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
