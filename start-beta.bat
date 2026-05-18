@echo off
setlocal
cd /d "%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
  echo PowerShell wurde nicht gefunden. Das Setup kann nicht gestartet werden.
  pause
  exit /b 1
)

set "NEEDS_SETUP=0"

where node >nul 2>nul
if errorlevel 1 (
  set "NEEDS_SETUP=1"
)

if not exist "%~dp0.env" (
  set "NEEDS_SETUP=1"
)

if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
  set "NEEDS_SETUP=1"
)

if "%NEEDS_SETUP%"=="1" (
  powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde noch nicht gefunden. Bitte setup-beta.bat starten und Node.js installieren.
  pause
  exit /b 1
)

if not exist "%~dp0.env" (
  echo Setup wurde nicht abgeschlossen. .env fehlt noch. Bitte setup-beta.bat starten.
  pause
  exit /b 1
)

if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
  echo Projekt-Abhaengigkeiten fehlen noch. Bitte setup-beta.bat starten und Abhaengigkeiten installieren.
  pause
  exit /b 1
)

start "" "http://127.0.0.1:5173/"
node --no-warnings server.js
pause
