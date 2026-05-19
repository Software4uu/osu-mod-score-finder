$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvPath = Join-Path $Root ".env"
$SetupLogPath = Join-Path $Root "setup.log"
$NpmCachePath = Join-Path $Root ".npm-cache"
$script:CurrentProcess = $null
$script:CancelRequested = $false
$script:SetupHadError = $false
$script:SetupMutex = $null

$createdSetupMutex = $false
$script:SetupMutex = New-Object System.Threading.Mutex($true, "Local\OsuModScoreFinderBetaSetup", [ref]$createdSetupMutex)
if (-not $createdSetupMutex) {
  [System.Windows.Forms.MessageBox]::Show(
    "Das Setup laeuft bereits. Bitte nutze das bereits geoeffnete Setup-Fenster.",
    "Setup laeuft bereits",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Information
  ) | Out-Null
  exit 0
}

function Close-SetupMutex {
  if (-not $script:SetupMutex) { return }
  try {
    $script:SetupMutex.ReleaseMutex()
  } catch {
    # The mutex may already be released during shutdown.
  }
  try {
    $script:SetupMutex.Dispose()
  } catch {
    # Nothing to clean up if dispose fails during shutdown.
  }
  $script:SetupMutex = $null
}

function Write-SetupLog($message) {
  try {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -LiteralPath $SetupLogPath -Value "[$timestamp] $message" -Encoding UTF8
  } catch {
    # Logging must never break setup.
  }
}

function Read-DotEnv {
  $values = @{}
  if (Test-Path $EnvPath) {
    foreach ($line in Get-Content $EnvPath) {
      $trimmed = $line.Trim()
      if (-not $trimmed -or $trimmed.StartsWith("#")) { continue }
      $index = $trimmed.IndexOf("=")
      if ($index -le 0) { continue }
      $key = $trimmed.Substring(0, $index).Trim()
      $value = $trimmed.Substring($index + 1).Trim()
      $values[$key] = $value
    }
  }
  return $values
}

function Test-CommandExists($name) {
  return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Resolve-CommandPath($name) {
  $command = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1
  if (-not $command) { return $null }

  $source = $command.Source
  if (-not $source) { return $name }

  if ($source.EndsWith(".ps1", [System.StringComparison]::OrdinalIgnoreCase)) {
    $cmdShim = [System.IO.Path]::ChangeExtension($source, ".cmd")
    if (Test-Path $cmdShim) { return $cmdShim }
  }

  return $source
}

function Refresh-ProcessPath {
  $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
  $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
  $parts = @($machinePath, $userPath)
  $nodePath = Join-Path $env:ProgramFiles "nodejs"
  if (Test-Path $nodePath) {
    $parts += $nodePath
  }
  $env:Path = ($parts | Where-Object { $_ }) -join ";"
}

function Test-DependenciesInstalled {
  return (Test-Path (Join-Path $Root "node_modules\realm\package.json")) -and
    (Test-Path (Join-Path $Root "node_modules\rosu-pp-js\package.json"))
}

function Stop-CurrentProcessTree {
  if (-not $script:CurrentProcess -or $script:CurrentProcess.HasExited) { return }

  try {
    & taskkill.exe /PID $script:CurrentProcess.Id /T /F | Out-Null
  } catch {
    try { $script:CurrentProcess.Kill() } catch { }
  }
}

function Run-CheckedProcess($fileName, $arguments, $workingDirectory, $friendlyName, $useLocalCache = $true) {
  $resolvedFile = Resolve-CommandPath $fileName
  if (-not $resolvedFile) {
    throw "$fileName wurde nicht gefunden."
  }

  Write-SetupLog "$friendlyName wird gestartet: $fileName $arguments"
  $status.Text = "$friendlyName wird gestartet..."
  [System.Windows.Forms.Application]::DoEvents()

  $processInfo = New-Object System.Diagnostics.ProcessStartInfo
  if ($resolvedFile.EndsWith(".cmd", [System.StringComparison]::OrdinalIgnoreCase) -or
      $resolvedFile.EndsWith(".bat", [System.StringComparison]::OrdinalIgnoreCase)) {
    $processInfo.FileName = $env:ComSpec
    $processInfo.Arguments = "/d /s /c " + '"' + '"' + $resolvedFile + '"' + " $arguments" + '"'
  } else {
    $processInfo.FileName = $resolvedFile
    $processInfo.Arguments = $arguments
  }
  $processInfo.WorkingDirectory = $workingDirectory
  $processInfo.UseShellExecute = $false
  $processInfo.RedirectStandardOutput = $true
  $processInfo.RedirectStandardError = $true
  $processInfo.CreateNoWindow = $true
  if ($useLocalCache) {
    $processInfo.EnvironmentVariables["NPM_CONFIG_CACHE"] = $NpmCachePath
  }
  $processInfo.EnvironmentVariables["NPM_CONFIG_UPDATE_NOTIFIER"] = "false"

  $lines = [System.Collections.ArrayList]::Synchronized((New-Object System.Collections.ArrayList))
  $outputHandler = [System.Diagnostics.DataReceivedEventHandler] {
    param($sender, $eventArgs)
    if ($eventArgs.Data) {
      [void]$lines.Add($eventArgs.Data)
      Write-SetupLog $eventArgs.Data
    }
  }
  $errorHandler = [System.Diagnostics.DataReceivedEventHandler] {
    param($sender, $eventArgs)
    if ($eventArgs.Data) {
      [void]$lines.Add($eventArgs.Data)
      Write-SetupLog $eventArgs.Data
    }
  }

  $process = New-Object System.Diagnostics.Process
  $process.StartInfo = $processInfo
  $process.add_OutputDataReceived($outputHandler)
  $process.add_ErrorDataReceived($errorHandler)

  $script:CurrentProcess = $process
  $script:CancelRequested = $false

  [void]$process.Start()
  $process.BeginOutputReadLine()
  $process.BeginErrorReadLine()

  $startedAt = Get-Date
  while (-not $process.WaitForExit(250)) {
    $elapsed = [Math]::Max(1, [int]((Get-Date) - $startedAt).TotalSeconds)
    $lastLine = if ($lines.Count -gt 0) { [string]$lines[$lines.Count - 1] } else { "" }
    if ($lastLine.Length -gt 95) { $lastLine = $lastLine.Substring(0, 95) + "..." }
    $status.Text = if ($lastLine) {
      "$friendlyName laeuft seit ${elapsed}s: $lastLine"
    } else {
      "$friendlyName laeuft seit ${elapsed}s. Bitte warten, das kann einige Minuten dauern."
    }
    [System.Windows.Forms.Application]::DoEvents()

    if ($script:CancelRequested) {
      Stop-CurrentProcessTree
      throw "$friendlyName wurde abgebrochen."
    }
  }

  $process.WaitForExit()
  $script:CurrentProcess = $null
  $process.remove_OutputDataReceived($outputHandler)
  $process.remove_ErrorDataReceived($errorHandler)

  if ($script:CancelRequested) {
    throw "$friendlyName wurde abgebrochen."
  }

  if ($process.ExitCode -ne 0) {
    $tail = ($lines | Select-Object -Last 18) -join "`r`n"
    Write-SetupLog "$friendlyName fehlgeschlagen mit Exit Code $($process.ExitCode)."
    throw "$friendlyName ist fehlgeschlagen (Exit Code $($process.ExitCode)).`r`n$tail"
  }

  Write-SetupLog "$friendlyName abgeschlossen."
  $status.Text = "$friendlyName abgeschlossen."
  [System.Windows.Forms.Application]::DoEvents()
}

function Save-DotEnv($clientId, $clientSecret, $stableDir, $lazerDir, $port) {
  $content = @(
    "OSU_CLIENT_ID=$clientId",
    "OSU_CLIENT_SECRET=$clientSecret",
    "OSU_STABLE_DIR=$stableDir",
    "OSU_LAZER_DIR=$lazerDir",
    "PORT=$port"
  ) -join [Environment]::NewLine

  Set-Content -LiteralPath $EnvPath -Value $content -Encoding UTF8
}

function Pick-Folder($textBox, $description) {
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = $description
  $dialog.ShowNewFolderButton = $false
  if ($textBox.Text) {
    $expanded = [Environment]::ExpandEnvironmentVariables($textBox.Text)
    if (Test-Path $expanded) { $dialog.SelectedPath = $expanded }
  }
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    $textBox.Text = $dialog.SelectedPath
  }
}

$config = Read-DotEnv
$nodeInstalled = Test-CommandExists "node"
$npmInstalled = Test-CommandExists "npm"
$depsInstalled = Test-DependenciesInstalled

function Get-ConfigValue($key, $fallback) {
  if ($config.ContainsKey($key) -and $config[$key]) { return $config[$key] }
  return $fallback
}

$defaultStable = if ($env:LOCALAPPDATA) { Join-Path $env:LOCALAPPDATA "osu!" } else { "%LOCALAPPDATA%\osu!" }
$defaultLazer = if ($env:APPDATA) { Join-Path $env:APPDATA "osu" } else { "%APPDATA%\osu" }

$form = New-Object System.Windows.Forms.Form
$form.Text = "osu! Mod Score Finder - Beta Setup"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(760, 640)
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Add_FormClosing({
  param($sender, $eventArgs)
  if ($script:CurrentProcess -and -not $script:CurrentProcess.HasExited) {
    $eventArgs.Cancel = $true
    [System.Windows.Forms.MessageBox]::Show(
      "Bitte warte, bis die laufende Installation fertig ist, oder nutze den Abbrechen-Button.",
      "Installation laeuft",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
  }
})

$font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Font = $font

$title = New-Object System.Windows.Forms.Label
$title.Text = "Lokales Beta-Setup"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(18, 16)
$title.Size = New-Object System.Drawing.Size(700, 34)
$form.Controls.Add($title)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = "Alles bleibt auf diesem PC: .env, Datenbank und lokale osu!-Pfade werden nicht fuer GitHub vorbereitet."
$subtitle.Location = New-Object System.Drawing.Point(20, 55)
$subtitle.Size = New-Object System.Drawing.Size(705, 22)
$form.Controls.Add($subtitle)

$requirements = New-Object System.Windows.Forms.GroupBox
$requirements.Text = "Installation"
$requirements.Location = New-Object System.Drawing.Point(20, 90)
$requirements.Size = New-Object System.Drawing.Size(705, 112)
$form.Controls.Add($requirements)

$nodeCheck = New-Object System.Windows.Forms.CheckBox
$nodeCheck.Location = New-Object System.Drawing.Point(18, 28)
$nodeCheck.Size = New-Object System.Drawing.Size(650, 24)
$nodeCheck.Checked = $true
if ($nodeInstalled) {
  $nodeCheck.Text = "Node.js LTS ist vorhanden"
  $nodeCheck.Enabled = $false
} else {
  $nodeCheck.Text = "Node.js LTS installieren (via winget)"
}
$requirements.Controls.Add($nodeCheck)

$depsCheck = New-Object System.Windows.Forms.CheckBox
$depsCheck.Location = New-Object System.Drawing.Point(18, 62)
$depsCheck.Size = New-Object System.Drawing.Size(650, 24)
$depsCheck.Checked = $true
if ($depsInstalled) {
  $depsCheck.Text = "Projekt-Abhaengigkeiten sind vorhanden"
  $depsCheck.Enabled = $false
} else {
  $depsCheck.Text = "Projekt-Abhaengigkeiten installieren (npm install)"
}
$requirements.Controls.Add($depsCheck)

$settings = New-Object System.Windows.Forms.GroupBox
$settings.Text = "Lokale Konfiguration"
$settings.Location = New-Object System.Drawing.Point(20, 216)
$settings.Size = New-Object System.Drawing.Size(705, 270)
$form.Controls.Add($settings)

function Add-Label($text, $x, $y) {
  $label = New-Object System.Windows.Forms.Label
  $label.Text = $text
  $label.Location = New-Object System.Drawing.Point($x, $y)
  $label.Size = New-Object System.Drawing.Size(150, 22)
  $settings.Controls.Add($label)
  return $label
}

function Add-TextBox($text, $x, $y, $width, $password = $false) {
  $box = New-Object System.Windows.Forms.TextBox
  $box.Text = $text
  $box.Location = New-Object System.Drawing.Point($x, $y)
  $box.Size = New-Object System.Drawing.Size($width, 24)
  $box.UseSystemPasswordChar = $password
  $settings.Controls.Add($box)
  return $box
}

Add-Label "Client ID" 18 34 | Out-Null
$clientIdBox = Add-TextBox (Get-ConfigValue "OSU_CLIENT_ID" "") 165 31 490

Add-Label "Client Secret" 18 75 | Out-Null
$clientSecretBox = Add-TextBox (Get-ConfigValue "OSU_CLIENT_SECRET" "") 165 72 490 $true

Add-Label "osu! stable Ordner" 18 116 | Out-Null
$stableBox = Add-TextBox (Get-ConfigValue "OSU_STABLE_DIR" $defaultStable) 165 113 405
$stableButton = New-Object System.Windows.Forms.Button
$stableButton.Text = "Auswaehlen"
$stableButton.Location = New-Object System.Drawing.Point(582, 111)
$stableButton.Size = New-Object System.Drawing.Size(98, 28)
$stableButton.Add_Click({ Pick-Folder $stableBox "Waehle den osu! stable Ordner aus" })
$settings.Controls.Add($stableButton)

Add-Label "osu!lazer Ordner" 18 157 | Out-Null
$lazerBox = Add-TextBox (Get-ConfigValue "OSU_LAZER_DIR" $defaultLazer) 165 154 405
$lazerButton = New-Object System.Windows.Forms.Button
$lazerButton.Text = "Auswaehlen"
$lazerButton.Location = New-Object System.Drawing.Point(582, 152)
$lazerButton.Size = New-Object System.Drawing.Size(98, 28)
$lazerButton.Add_Click({ Pick-Folder $lazerBox "Waehle den osu!lazer Ordner aus" })
$settings.Controls.Add($lazerButton)

Add-Label "Port" 18 198 | Out-Null
$portBox = Add-TextBox (Get-ConfigValue "PORT" "5173") 165 195 120

$openAfter = New-Object System.Windows.Forms.CheckBox
$openAfter.Text = "Nach dem Setup App starten und im Browser oeffnen"
$openAfter.Location = New-Object System.Drawing.Point(165, 228)
$openAfter.Size = New-Object System.Drawing.Size(360, 24)
$openAfter.Checked = $true
$settings.Controls.Add($openAfter)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(22, 500)
$status.Size = New-Object System.Drawing.Size(700, 38)
$status.Text = "Bereit."
$form.Controls.Add($status)

$saveButton = New-Object System.Windows.Forms.Button
$saveButton.Text = "Installieren / Speichern"
$saveButton.Location = New-Object System.Drawing.Point(430, 548)
$saveButton.Size = New-Object System.Drawing.Size(170, 34)
$form.Controls.Add($saveButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = "Abbrechen"
$cancelButton.Location = New-Object System.Drawing.Point(615, 548)
$cancelButton.Size = New-Object System.Drawing.Size(110, 34)
$cancelButton.Add_Click({
  if ($script:CurrentProcess -and -not $script:CurrentProcess.HasExited) {
    $answer = [System.Windows.Forms.MessageBox]::Show(
      "Es laeuft gerade eine Installation. Moechtest du sie wirklich abbrechen?",
      "Installation abbrechen",
      [System.Windows.Forms.MessageBoxButtons]::YesNo,
      [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
      $script:CancelRequested = $true
      Stop-CurrentProcessTree
      $status.Text = "Installation wird abgebrochen..."
    }
    return
  }

  $form.Close()
})
$form.Controls.Add($cancelButton)

function Update-InstallState {
  Refresh-ProcessPath

  $nodeNow = Test-CommandExists "node"
  $npmNow = Test-CommandExists "npm"
  $depsNow = Test-DependenciesInstalled

  if ($nodeNow) {
    $nodeCheck.Text = "Node.js LTS ist vorhanden"
    $nodeCheck.Checked = $true
    $nodeCheck.Enabled = $false
  } else {
    $nodeCheck.Text = "Node.js LTS installieren (via winget)"
    $nodeCheck.Enabled = $true
  }

  if ($depsNow) {
    $depsCheck.Text = "Projekt-Abhaengigkeiten sind vorhanden"
    $depsCheck.Checked = $true
    $depsCheck.Enabled = $false
  } else {
    $depsCheck.Text = if ($npmNow) {
      "Projekt-Abhaengigkeiten installieren (npm install)"
    } else {
      "Projekt-Abhaengigkeiten installieren, sobald Node.js vorhanden ist"
    }
    $depsCheck.Enabled = $true
  }

  if ($nodeNow -and $depsNow) {
    $saveButton.Text = "Speichern"
  } else {
    $saveButton.Text = "Installieren / Speichern"
  }
}

Update-InstallState

$saveButton.Add_Click({
  try {
    $saveButton.Enabled = $false
    Write-SetupLog "Setup gestartet."
    Save-DotEnv $clientIdBox.Text.Trim() $clientSecretBox.Text.Trim() $stableBox.Text.Trim() $lazerBox.Text.Trim() $portBox.Text.Trim()
    $status.Text = "Eingaben gespeichert. Installation laeuft jetzt Schritt fuer Schritt."
    [System.Windows.Forms.Application]::DoEvents()

    if ($nodeCheck.Enabled -and $nodeCheck.Checked) {
      if (-not (Test-CommandExists "winget")) {
        throw "Node.js fehlt und winget wurde nicht gefunden. Bitte Node.js LTS manuell installieren: https://nodejs.org/"
      }
      $answer = [System.Windows.Forms.MessageBox]::Show(
        "Node.js LTS wird ueber winget installiert. Fortfahren?",
        "Node.js installieren",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
      )
      if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        Run-CheckedProcess "winget" "install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements" $Root "Node.js Installation"
        Refresh-ProcessPath
        Update-InstallState
      }
    }

    if ($depsCheck.Enabled -and $depsCheck.Checked) {
      Refresh-ProcessPath
      if (-not (Test-CommandExists "npm")) {
        throw "npm wurde nicht gefunden. Installiere zuerst Node.js LTS und starte dieses Setup danach neu."
      }
      if (-not (Test-Path $NpmCachePath)) {
        New-Item -ItemType Directory -Path $NpmCachePath -Force | Out-Null
      }
      $answer = [System.Windows.Forms.MessageBox]::Show(
        "Die Projekt-Abhaengigkeiten werden mit npm install geladen. Fortfahren?",
        "Abhaengigkeiten installieren",
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
      )
      if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        $npmArgs = "install --no-audit --no-fund --prefer-online --cache `"$NpmCachePath`""
        $installError = $null
        try {
          Run-CheckedProcess "npm" $npmArgs $Root "Projekt-Abhaengigkeiten"
        } catch {
          $installError = $_.Exception.Message
          Write-SetupLog "npm install meldete einen Fehler, Fallback ohne eigenen Cache wird versucht."
          $status.Text = "npm install hatte einen Fehler. Fallback wird versucht..."
          [System.Windows.Forms.Application]::DoEvents()
          try {
            Run-CheckedProcess "npm" "install --no-audit --no-fund" $Root "Projekt-Abhaengigkeiten Fallback" $false
            $installError = $null
          } catch {
            $installError = "$installError`r`n`r`nFallback: $($_.Exception.Message)"
          }
        }

        Update-InstallState
        if (-not (Test-DependenciesInstalled)) {
          throw $installError
        }
        if ($installError) {
          Write-SetupLog "npm meldete einen Fehler, aber die benoetigten Pakete sind vorhanden. Setup wird fortgesetzt."
          $status.Text = "Abhaengigkeiten sind vorhanden. Setup wird fortgesetzt."
        }
      }
    }

    $status.Text = "Setup fertig. .env wurde lokal gespeichert. Du kannst dieses Fenster jetzt schliessen."
    Write-SetupLog "Setup erfolgreich abgeschlossen."

    if ($openAfter.Checked) {
      $startPath = Join-Path $Root "start-beta.bat"
      if (Test-Path $startPath) {
        Start-Process -FilePath $startPath -WorkingDirectory $Root
        Write-SetupLog "start-beta.bat wurde gestartet."
      } else {
        $port = if ($portBox.Text.Trim()) { $portBox.Text.Trim() } else { "5173" }
        Start-Process -FilePath "http://127.0.0.1:$port/"
        Write-SetupLog "Browser wurde geoeffnet."
      }
      $form.WindowState = [System.Windows.Forms.FormWindowState]::Normal
      $form.Activate()
    }

    [System.Windows.Forms.MessageBox]::Show(
      "Setup ist fertig. Dieses Fenster bleibt offen. Wenn der Browser nicht automatisch aufgeht, starte start-beta.bat.",
      "Fertig",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
  } catch {
    $script:SetupHadError = $true
    Write-SetupLog "Setup-Fehler: $($_.Exception.Message)"
    [System.Windows.Forms.MessageBox]::Show(
      $_.Exception.Message,
      "Setup-Fehler",
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    $message = $_.Exception.Message
    if ($message.Length -gt 180) { $message = $message.Substring(0, 180) + "..." }
    $status.Text = "Fehler: $message"
  } finally {
    $script:CurrentProcess = $null
    $script:CancelRequested = $false
    Update-InstallState
    $saveButton.Enabled = $true
  }
})

try {
  [void]$form.ShowDialog()
  Close-SetupMutex
  if ($script:SetupHadError) { exit 1 }
  exit 0
} catch {
  Close-SetupMutex
  Write-SetupLog "Fataler Setup-Fehler: $($_.Exception.Message)"
  [System.Windows.Forms.MessageBox]::Show(
    "Das Setup ist unerwartet abgestuerzt:`r`n$($_.Exception.Message)`r`n`r`nBitte setup.log im Projektordner pruefen.",
    "Fataler Setup-Fehler",
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
  exit 1
}
