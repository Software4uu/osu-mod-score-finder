$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = Join-Path $Root "data"
$LogPath = Join-Path $DataDir "update.log"
$RepoZipUrl = "https://github.com/Software4uu/osu-mod-score-finder/archive/refs/heads/main.zip"
$TempRoot = Join-Path ([IO.Path]::GetTempPath()) ("osu-mod-score-finder-update-" + [guid]::NewGuid().ToString("N"))

function Get-SetupLanguage {
  $languagePath = Join-Path $Root ".setup-language"
  if (Test-Path -LiteralPath $languagePath) {
    $value = (Get-Content -LiteralPath $languagePath -Raw).Trim().ToLowerInvariant()
    if ($value -eq "de" -or $value -eq "en") {
      return $value
    }
  }
  return "en"
}

$Language = Get-SetupLanguage

function Write-Step {
  param(
    [Parameter(Mandatory = $true)][string]$English,
    [Parameter(Mandatory = $true)][string]$German
  )

  $message = if ($Language -eq "de") { $German } else { $English }
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host $message
  Add-Content -LiteralPath $LogPath -Value "[$stamp] $message"
}

function Invoke-LoggedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Step -English ("Running: " + $FilePath + " " + ($Arguments -join " ")) -German ("Fuehre aus: " + $FilePath + " " + ($Arguments -join " "))
  & $FilePath @Arguments 2>&1 | Tee-Object -FilePath $LogPath -Append
  if ($LASTEXITCODE -ne 0) {
    throw "$FilePath failed with exit code $LASTEXITCODE."
  }
}

function Assert-ProjectRoot {
  $packagePath = Join-Path $Root "package.json"
  $serverPath = Join-Path $Root "server.js"

  if (-not (Test-Path -LiteralPath $packagePath) -or -not (Test-Path -LiteralPath $serverPath)) {
    throw "This folder does not look like osu! Mod Score Finder. Update stopped."
  }
}

function Get-AppPort {
  $port = 5173
  $envPath = Join-Path $Root ".env"
  if (Test-Path -LiteralPath $envPath) {
    foreach ($line in Get-Content -LiteralPath $envPath) {
      if ($line -match "^\s*PORT\s*=\s*(\d+)\s*$") {
        $port = [int]$Matches[1]
        break
      }
    }
  }
  return $port
}

function Stop-AppServer {
  param([Parameter(Mandatory = $true)][int]$Port)

  $connections = @()
  try {
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  } catch {
    $connections = @()
  }

  foreach ($processId in ($connections | Select-Object -ExpandProperty OwningProcess -Unique)) {
    if (-not $processId) {
      continue
    }

    try {
      $process = Get-Process -Id $processId -ErrorAction Stop
      if ($process.ProcessName -like "node*") {
        Write-Step -English "Stopping the old app server before restart." -German "Stoppe den alten App-Server vor dem Neustart."
        Stop-Process -Id $processId -Force
      }
    } catch {
      # If the process has already ended, the restart can continue.
    }
  }
}

function Start-AppAfterUpdate {
  $startBat = Join-Path $Root "start-beta.bat"
  if (-not (Test-Path -LiteralPath $startBat)) {
    Write-Step -English "start-beta.bat was not found. Start the app manually after this update." -German "start-beta.bat wurde nicht gefunden. Starte die App nach dem Update manuell."
    return $false
  }

  $port = Get-AppPort
  Stop-AppServer -Port $port
  Start-Sleep -Milliseconds 800
  Write-Step -English "Restarting the app automatically." -German "Starte die App automatisch neu."
  Start-Process -FilePath $startBat -WorkingDirectory $Root
  return $true
}

function Copy-ProjectItem {
  param(
    [Parameter(Mandatory = $true)][string]$SourceRoot,
    [Parameter(Mandatory = $true)][string]$Item
  )

  $source = Join-Path $SourceRoot $Item
  if (-not (Test-Path -LiteralPath $source)) {
    return
  }

  $destination = Join-Path $Root $Item
  $parent = Split-Path -Parent $destination
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Path $parent | Out-Null
  }

  if (Test-Path -LiteralPath $source -PathType Container) {
    if (-not (Test-Path -LiteralPath $destination)) {
      New-Item -ItemType Directory -Path $destination | Out-Null
    }
    Get-ChildItem -LiteralPath $source -Force | Copy-Item -Destination $destination -Recurse -Force
  } else {
    Copy-Item -LiteralPath $source -Destination $destination -Force
  }
}

New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
Set-Content -LiteralPath $LogPath -Value ("[" + (Get-Date -Format "yyyy-MM-dd HH:mm:ss") + "] Update started.")

Assert-ProjectRoot

try {
  $gitCommand = Get-Command git -ErrorAction SilentlyContinue
  $hasGitFolder = (Test-Path -LiteralPath (Join-Path $Root ".git"))

  if ($gitCommand -and $hasGitFolder) {
    Write-Step -English "Git repository found. Updating with git pull." -German "Git-Repository gefunden. Update laeuft mit git pull."
    Push-Location $Root
    try {
      Invoke-LoggedCommand -FilePath "git" -Arguments @("fetch", "--tags", "origin")
      Invoke-LoggedCommand -FilePath "git" -Arguments @("pull", "--ff-only", "origin", "main")
    } finally {
      Pop-Location
    }
  } else {
    Write-Step -English "No Git clone found. Downloading the latest GitHub ZIP." -German "Kein Git-Clone gefunden. Lade das aktuelle GitHub-ZIP herunter."
    New-Item -ItemType Directory -Path $TempRoot -Force | Out-Null
    $zipPath = Join-Path $TempRoot "source.zip"
    $extractPath = Join-Path $TempRoot "source"

    Invoke-WebRequest -UseBasicParsing -Uri $RepoZipUrl -OutFile $zipPath
    Expand-Archive -LiteralPath $zipPath -DestinationPath $extractPath -Force

    $sourceRoot = Get-ChildItem -LiteralPath $extractPath -Directory | Select-Object -First 1
    if (-not $sourceRoot) {
      throw "Downloaded ZIP did not contain a project folder."
    }

    $items = @(
      ".env.example",
      ".github",
      ".gitignore",
      "LICENSE",
      "README.html",
      "README.ipynb",
      "README.md",
      "SECURITY.md",
      "localImport.js",
      "package-lock.json",
      "package.json",
      "ppCalculator.js",
      "public",
      "scoreStore.js",
      "server.js",
      "setup-beta.bat",
      "setup.ps1",
      "start-beta.bat",
      "update-beta.bat",
      "update.ps1"
    )

    foreach ($item in $items) {
      Copy-ProjectItem -SourceRoot $sourceRoot.FullName -Item $item
    }

    Write-Step -English "Project files updated. Local .env, data, node_modules, cache, and logs were kept." -German "Projektdateien aktualisiert. Lokale .env, data, node_modules, Cache und Logs wurden behalten."
  }

  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  if ($npmCommand) {
    Push-Location $Root
    try {
      try {
        Invoke-LoggedCommand -FilePath "npm" -Arguments @("install", "--no-audit", "--no-fund", "--prefer-online")
      } catch {
        Write-Step -English "Normal npm install failed. Trying without optional dependencies." -German "Normales npm install fehlgeschlagen. Versuche es ohne optionale Abhaengigkeiten."
        Invoke-LoggedCommand -FilePath "npm" -Arguments @("install", "--no-audit", "--no-fund", "--omit=optional")
      }
    } finally {
      Pop-Location
    }
  } else {
    Write-Step -English "npm was not found. Run setup-beta.bat after this update." -German "npm wurde nicht gefunden. Starte nach dem Update setup-beta.bat."
  }

  $restarted = Start-AppAfterUpdate
  if ($restarted) {
    Write-Step -English "Update finished. The app was restarted automatically." -German "Update fertig. Die App wurde automatisch neu gestartet."
  } else {
    Write-Step -English "Update finished. Restart start-beta.bat to use the new files." -German "Update fertig. Starte start-beta.bat neu, um die neuen Dateien zu nutzen."
  }
  exit 0
} catch {
  Write-Step -English ("Update failed: " + $_.Exception.Message) -German ("Update fehlgeschlagen: " + $_.Exception.Message)
  exit 1
} finally {
  if (Test-Path -LiteralPath $TempRoot) {
    Remove-Item -LiteralPath $TempRoot -Recurse -Force -ErrorAction SilentlyContinue
  }
}
