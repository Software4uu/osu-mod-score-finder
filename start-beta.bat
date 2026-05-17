@echo off
setlocal
cd /d "%~dp0"

where powershell >nul 2>nul
if errorlevel 1 (
  echo PowerShell wurde nicht gefunden. Das Setup kann nicht gestartet werden.
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
  where node >nul 2>nul
  if errorlevel 1 (
    echo Node.js wurde noch nicht gefunden. Bitte Setup abschliessen und erneut starten.
    pause
    exit /b 1
  )
)

if not exist "%~dp0.env" (
  powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
  if not exist "%~dp0.env" (
    echo Setup wurde nicht abgeschlossen. .env fehlt noch.
    pause
    exit /b 1
  )
)

if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
  powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
  if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
    echo Projekt-Abhaengigkeiten fehlen noch.
    pause
    exit /b 1
  )
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js wurde noch nicht gefunden. Bitte Setup erneut starten, nachdem Node.js installiert wurde.
  pause
  exit /b 1
)

start "" "http://localhost:5173/"
node --no-warnings server.js
pause
