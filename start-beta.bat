@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

call :LoadLanguage
call :LoadConfig

where powershell >nul 2>nul
if errorlevel 1 (
  if /I "!SETUP_LANG!"=="en" (
    echo PowerShell was not found. Setup cannot start.
  ) else (
    echo PowerShell wurde nicht gefunden. Das Setup kann nicht gestartet werden.
  )
  call :PauseLocalized
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

if "!NEEDS_SETUP!"=="1" (
  powershell -ExecutionPolicy Bypass -File "%~dp0setup.ps1"
  if exist "%~dp0.setup-start-app" del "%~dp0.setup-start-app" >nul 2>nul
  call :LoadLanguage
  call :LoadConfig
)

where node >nul 2>nul
if errorlevel 1 (
  if /I "!SETUP_LANG!"=="en" (
    echo Node.js was not found yet. Run setup-beta.bat and install Node.js.
  ) else (
    echo Node.js wurde noch nicht gefunden. Bitte setup-beta.bat starten und Node.js installieren.
  )
  call :PauseLocalized
  exit /b 1
)

if not exist "%~dp0.env" (
  if /I "!SETUP_LANG!"=="en" (
    echo Setup is not complete. .env is missing. Run setup-beta.bat.
  ) else (
    echo Setup wurde nicht abgeschlossen. .env fehlt noch. Bitte setup-beta.bat starten.
  )
  call :PauseLocalized
  exit /b 1
)

if not exist "%~dp0node_modules\rosu-pp-js\package.json" (
  if /I "!SETUP_LANG!"=="en" (
    echo Project dependencies are missing. Run setup-beta.bat and install dependencies.
  ) else (
    echo Projekt-Abhaengigkeiten fehlen noch. Bitte setup-beta.bat starten und Abhaengigkeiten installieren.
  )
  call :PauseLocalized
  exit /b 1
)

call :CheckAppStatus
if "!APP_ALREADY_RUNNING!"=="1" (
  if /I "!SETUP_LANG!"=="en" (
    echo osu^! Mod Score Finder is already running on !APP_URL!.
    echo No second server will be started.
  ) else (
    echo osu^! Mod Score Finder laeuft bereits auf !APP_URL!.
    echo Es wird kein zweiter Server gestartet.
  )
  start "" "!APP_URL!"
  ping -n 4 127.0.0.1 >nul
  exit /b 0
)

if "!PORT_BLOCKED!"=="1" (
  if /I "!SETUP_LANG!"=="en" (
    echo Port !APP_PORT! is in use, but osu^! Mod Score Finder is not responding there.
    echo Close the other program or change PORT in .env.
  ) else (
    echo Port !APP_PORT! ist belegt, aber dort antwortet nicht osu^! Mod Score Finder.
    echo Bitte schliesse das andere Programm oder aendere PORT in der .env.
  )
  call :PauseLocalized
  exit /b 1
)

start "" "!APP_URL!"
node --no-warnings server.js
set "SERVER_EXIT=%ERRORLEVEL%"
if not "!SERVER_EXIT!"=="0" (
  echo.
  if /I "!SETUP_LANG!"=="en" (
    echo Server exited with code !SERVER_EXIT!.
  ) else (
    echo Server wurde mit Fehlercode !SERVER_EXIT! beendet.
  )
  call :PauseLocalized
)
exit /b !SERVER_EXIT!

:LoadLanguage
set "SETUP_LANG=en"
if exist "%~dp0.setup-language" (
  set /p SETUP_LANG=<"%~dp0.setup-language"
)
if /I not "!SETUP_LANG!"=="de" if /I not "!SETUP_LANG!"=="en" set "SETUP_LANG=en"
exit /b 0

:LoadConfig
set "APP_PORT=5173"
if exist "%~dp0.env" (
  for /f "usebackq tokens=1,* delims==" %%A in ("%~dp0.env") do (
    if /I "%%A"=="PORT" set "APP_PORT=%%B"
  )
)
set "APP_URL=http://127.0.0.1:!APP_PORT!/"
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

:CheckAppStatus
set "APP_ALREADY_RUNNING=0"
set "PORT_BLOCKED=0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "try { $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 '%APP_URL%api/status'; if ($r.Content -match 'hasCredentials') { exit 0 } else { exit 2 } } catch { try { $client = New-Object System.Net.Sockets.TcpClient; $client.Connect('127.0.0.1', [int]$env:APP_PORT); $client.Close(); exit 2 } catch { exit 1 } }"
set "APP_STATUS=%ERRORLEVEL%"
if "!APP_STATUS!"=="0" set "APP_ALREADY_RUNNING=1"
if "!APP_STATUS!"=="2" set "PORT_BLOCKED=1"
exit /b 0
