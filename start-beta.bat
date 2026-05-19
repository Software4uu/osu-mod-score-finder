@echo off
setlocal
cd /d "%~dp0"
set "APP_PORT=5173"

if exist "%~dp0.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    if /I "%%A"=="PORT" set "APP_PORT=%%B"
  )
)
set "APP_URL=http://127.0.0.1:%APP_PORT%/"

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

call :CheckAppStatus
if "%APP_ALREADY_RUNNING%"=="1" (
  echo osu! Mod Score Finder laeuft bereits auf %APP_URL%.
  echo Es wird kein zweiter Server gestartet.
  start "" "%APP_URL%"
  ping -n 4 127.0.0.1 >nul
  exit /b 0
)

if "%PORT_BLOCKED%"=="1" (
  echo Port %APP_PORT% ist belegt, aber dort antwortet nicht osu! Mod Score Finder.
  echo Bitte schliesse das andere Programm oder aendere PORT in der .env.
  pause
  exit /b 1
)

start "" "%APP_URL%"
node --no-warnings server.js
set "SERVER_EXIT=%ERRORLEVEL%"
if not "%SERVER_EXIT%"=="0" (
  echo.
  echo Server wurde mit Fehlercode %SERVER_EXIT% beendet.
  pause
)
exit /b %SERVER_EXIT%

:CheckAppStatus
set "APP_ALREADY_RUNNING=0"
set "PORT_BLOCKED=0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%APP_URL%api/status'; if ($r.Content -match 'hasCredentials') { exit 0 } else { exit 2 } } catch { try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('127.0.0.1', [int]$env:APP_PORT); $client.Close(); exit 2 } catch { exit 1 } }"
set "APP_STATUS=%ERRORLEVEL%"
if "%APP_STATUS%"=="0" set "APP_ALREADY_RUNNING=1"
if "%APP_STATUS%"=="2" set "PORT_BLOCKED=1"
exit /b 0
