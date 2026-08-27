param(
  [switch]$SkipAppRestart
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DataDir = Join-Path $Root "data"
$LogPath = Join-Path $DataDir "update.log"
$RepoZipBaseUrl = "https://github.com/Software4uu/osu-mod-score-finder/archive/refs/heads/main.zip"
$RemotePackageUrl = "https://raw.githubusercontent.com/Software4uu/osu-mod-score-finder/main/package.json"
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

function Get-PackageVersion {
  param([Parameter(Mandatory = $true)][string]$PackagePath)

  if (-not (Test-Path -LiteralPath $PackagePath)) {
    return ""
  }

  try {
    $package = Get-Content -LiteralPath $PackagePath -Raw | ConvertFrom-Json
    return [string]$package.version
  } catch {
    return ""
  }
}

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

function Write-LogOutput {
  param([object[]]$Output)

  foreach ($line in $Output) {
    $text = if ($line -is [System.Management.Automation.ErrorRecord]) { $line.ToString() } else { [string]$line }
    if (-not $text) { continue }
    Write-Host $text
    Add-Content -LiteralPath $LogPath -Value $text
  }
}

function Invoke-LoggedCommandResult {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  Write-Step -English ("Running: " + $FilePath + " " + ($Arguments -join " ")) -German ("Fuehre aus: " + $FilePath + " " + ($Arguments -join " "))
  $oldPreference = $ErrorActionPreference
  $oldNativePreference = $null
  $hasNativePreference = $false
  $nativePreferenceVariable = Get-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -ErrorAction SilentlyContinue
  if ($null -ne $nativePreferenceVariable) {
    $hasNativePreference = $true
    $oldNativePreference = $nativePreferenceVariable.Value
    Set-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -Value $false
  }

  $output = @()
  $exitCode = 1
  try {
    $ErrorActionPreference = "Continue"
    $output = & $FilePath @Arguments 2>&1
    $exitCode = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldPreference
    if ($hasNativePreference) {
      Set-Variable -Name PSNativeCommandUseErrorActionPreference -Scope Global -Value $oldNativePreference
    }
  }

  Write-LogOutput -Output $output

  return [pscustomobject]@{
    ExitCode = $exitCode
    Output = @($output)
  }
}

function Invoke-LoggedCommand {
  param(
    [Parameter(Mandatory = $true)][string]$FilePath,
    [Parameter(Mandatory = $true)][string[]]$Arguments
  )

  $result = Invoke-LoggedCommandResult -FilePath $FilePath -Arguments $Arguments
  if ($result.ExitCode -ne 0) {
    throw "$FilePath failed with exit code $($result.ExitCode)."
  }
}

function Test-RequiredDependencies {
  $nodeCommand = Get-Command node -ErrorAction SilentlyContinue
  if (-not $nodeCommand) {
    Write-Step -English "Node.js was not found, so dependency validation cannot run." -German "Node.js wurde nicht gefunden, daher kann die Abhaengigkeitspruefung nicht laufen."
    return $false
  }

  Push-Location $Root
  try {
    $result = Invoke-LoggedCommandResult -FilePath "node" -Arguments @("--input-type=module", "-e", "await import('rosu-pp-js'); console.log('Required dependencies are available.');")
    return ($result.ExitCode -eq 0)
  } finally {
    Pop-Location
  }
}

function Install-ProjectDependencies {
  $npmCommand = Get-Command npm -ErrorAction SilentlyContinue
  if (-not $npmCommand) {
    Write-Step -English "npm was not found. Run setup-beta.bat after this update." -German "npm wurde nicht gefunden. Starte nach dem Update setup-beta.bat."
    return
  }

  Push-Location $Root
  try {
    $normalInstall = Invoke-LoggedCommandResult -FilePath "npm" -Arguments @("install", "--no-audit", "--no-fund", "--prefer-online")
    if ($normalInstall.ExitCode -eq 0) {
      Write-Step -English "Project dependencies are ready." -German "Projekt-Abhaengigkeiten sind bereit."
      return
    }

    Write-Step -English "Normal npm install failed. Trying without optional dependencies." -German "Normales npm install fehlgeschlagen. Versuche es ohne optionale Abhaengigkeiten."
    $fallbackInstall = Invoke-LoggedCommandResult -FilePath "npm" -Arguments @("install", "--no-audit", "--no-fund", "--omit=optional")
    if ($fallbackInstall.ExitCode -eq 0) {
      Write-Step -English "Project dependencies are ready without optional packages." -German "Projekt-Abhaengigkeiten sind ohne optionale Pakete bereit."
      return
    }

    if (Test-RequiredDependencies) {
      Write-Step -English "npm reported an install or cleanup warning, but the required dependencies are available. Continuing." -German "npm meldete eine Installations- oder Cleanup-Warnung, aber die benoetigten Abhaengigkeiten sind vorhanden. Update wird fortgesetzt."
      return
    }

    throw "npm install failed and required dependencies are missing. Check data\update.log."
  } finally {
    Pop-Location
  }
}

function Get-RemoteVersion {
  try {
    $uri = $RemotePackageUrl + "?cacheBust=" + [uri]::EscapeDataString((Get-Date).ToUniversalTime().Ticks.ToString())
    $packageText = Invoke-WebRequest -UseBasicParsing -Uri $uri -Headers @{ "Cache-Control" = "no-cache" } | Select-Object -ExpandProperty Content
    $package = $packageText | ConvertFrom-Json
    return [string]$package.version
  } catch {
    Write-Step -English "Could not read the remote version before updating. Continuing with file replacement." -German "Remote-Version konnte vor dem Update nicht gelesen werden. Dateiersetzung laeuft trotzdem weiter."
    return ""
  }
}

function Stop-AppBeforeUpdate {
  $port = Get-AppPort
  Stop-AppServer -Port $port
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

  $processIds = @()
  try {
    $processIds = @(
      Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop |
        Select-Object -ExpandProperty OwningProcess -Unique
    )
  } catch {
    Write-Step -English "Windows port lookup was unavailable. Falling back to netstat." -German "Die Windows-Portabfrage war nicht verfuegbar. Nutze netstat als Fallback."
  }

  if (-not $processIds.Count) {
    $escapedPort = [regex]::Escape([string]$Port)
    foreach ($line in (& netstat -ano -p tcp 2>$null)) {
      if ($line -match ("^\s*TCP\s+\S+:" + $escapedPort + "\s+\S+\s+\S+\s+(\d+)\s*$")) {
        $processIds += [int]$Matches[1]
      }
    }
    $processIds = @($processIds | Sort-Object -Unique)
  }

  foreach ($processId in $processIds) {
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
  $packagePath = Join-Path $Root "package.json"
  $beforeVersion = Get-PackageVersion -PackagePath $packagePath
  $expectedVersion = Get-RemoteVersion
  if ($expectedVersion) {
    Write-Step -English "Latest GitHub version is $expectedVersion. Installed version is $beforeVersion." -German "Aktuelle GitHub-Version ist $expectedVersion. Installierte Version ist $beforeVersion."
  } else {
    Write-Step -English "Installed version is $beforeVersion." -German "Installierte Version ist $beforeVersion."
  }

  Stop-AppBeforeUpdate

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
    $repoZipUrl = $RepoZipBaseUrl + "?cacheBust=" + [uri]::EscapeDataString((Get-Date).ToUniversalTime().Ticks.ToString())

    Invoke-WebRequest -UseBasicParsing -Uri $repoZipUrl -OutFile $zipPath -Headers @{ "Cache-Control" = "no-cache" }
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

  Install-ProjectDependencies

  $afterVersion = Get-PackageVersion -PackagePath $packagePath
  if ($expectedVersion -and $afterVersion -ne $expectedVersion) {
    throw "Update verification failed. Expected version $expectedVersion, but installed version is $afterVersion."
  }
  if ($afterVersion -and $afterVersion -ne $beforeVersion) {
    Write-Step -English "Version check passed: $beforeVersion -> $afterVersion." -German "Versionspruefung erfolgreich: $beforeVersion -> $afterVersion."
  } elseif ($afterVersion) {
    Write-Step -English "Version check passed: already on $afterVersion." -German "Versionspruefung erfolgreich: bereits auf $afterVersion."
  }

  if ($SkipAppRestart) {
    Write-Step -English "Update finished. The launcher will start the app in this CMD window." -German "Update fertig. Der Starter startet die App in diesem CMD-Fenster."
    exit 0
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
