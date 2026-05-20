$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvPath = Join-Path $Root ".env"
$SetupLogPath = Join-Path $Root "setup.log"
$NpmCachePath = Join-Path $Root ".npm-cache"
$StartAfterSetupPath = Join-Path $Root ".setup-start-app"
$SetupLanguagePath = Join-Path $Root ".setup-language"
$script:CurrentProcess = $null
$script:CancelRequested = $false
$script:SetupHadError = $false
$script:SetupMutex = $null

function Read-SetupLanguage {
  try {
    if (Test-Path $SetupLanguagePath) {
      $language = (Get-Content -LiteralPath $SetupLanguagePath -Raw).Trim().ToLowerInvariant()
      if ($language -eq "en") { return "en" }
    }
  } catch {
    # Invalid language files fall back to English for new beta users.
  }
  return "en"
}

$script:SetupLanguage = Read-SetupLanguage
$SetupTexts = @{
  de = @{
    "form.title" = "osu! Mod Score Finder - Beta Setup"
    "title" = "Lokales Beta-Setup"
    "subtitle" = "Alles bleibt auf diesem PC: .env, Datenbank und lokale osu!-Pfade werden nicht fuer GitHub vorbereitet."
    "language" = "Sprache"
    "group.install" = "Installation"
    "group.config" = "Lokale Konfiguration"
    "label.clientId" = "Client ID"
    "label.clientSecret" = "Client Secret"
    "label.stableDir" = "osu! stable Ordner"
    "label.lazerDir" = "osu!lazer Ordner"
    "label.port" = "Port"
    "link.osuApi" = "osu! API-Einstellungen"
    "button.choose" = "Auswaehlen"
    "button.cancel" = "Abbrechen"
    "button.save" = "Speichern"
    "button.installSave" = "Installieren / Speichern"
    "checkbox.startAfter" = "Nach dem Setup App in diesem CMD-Fenster starten"
    "status.ready" = "Bereit."
    "status.saved" = "Eingaben gespeichert. Installation laeuft jetzt Schritt fuer Schritt."
    "status.canceling" = "Installation wird abgebrochen..."
    "status.finished" = "Setup fertig. .env wurde lokal gespeichert. Du kannst dieses Fenster jetzt schliessen."
    "status.fallback" = "npm install hatte einen Fehler. Fallback wird versucht..."
    "status.depsPresent" = "Abhaengigkeiten sind vorhanden. Setup wird fortgesetzt."
    "status.error" = "Fehler: {message}"
    "status.processStart" = "{name} wird gestartet..."
    "status.processRunning" = "{name} laeuft seit {seconds}s: {line}"
    "status.processWaiting" = "{name} laeuft seit {seconds}s. Bitte warten, das kann einige Minuten dauern."
    "status.processDone" = "{name} abgeschlossen."
    "node.present" = "Node.js LTS ist vorhanden"
    "node.install" = "Node.js LTS installieren (via winget)"
    "deps.present" = "Projekt-Abhaengigkeiten sind vorhanden"
    "deps.install" = "Projekt-Abhaengigkeiten installieren (npm install)"
    "deps.waitNode" = "Projekt-Abhaengigkeiten installieren, sobald Node.js vorhanden ist"
    "folder.stable" = "Waehle den osu! stable Ordner aus"
    "folder.lazer" = "Waehle den osu!lazer Ordner aus"
    "msg.setupRunning" = "Das Setup laeuft bereits. Bitte nutze das bereits geoeffnete Setup-Fenster."
    "title.setupRunning" = "Setup laeuft bereits"
    "msg.waitInstall" = "Bitte warte, bis die laufende Installation fertig ist, oder nutze den Abbrechen-Button."
    "title.installRunning" = "Installation laeuft"
    "msg.cancelQuestion" = "Es laeuft gerade eine Installation. Moechtest du sie wirklich abbrechen?"
    "title.cancel" = "Installation abbrechen"
    "msg.noWinget" = "Node.js fehlt und winget wurde nicht gefunden. Bitte Node.js LTS manuell installieren: https://nodejs.org/"
    "msg.nodeInstallQuestion" = "Node.js LTS wird ueber winget installiert. Fortfahren?"
    "title.nodeInstall" = "Node.js installieren"
    "msg.noNpm" = "npm wurde nicht gefunden. Installiere zuerst Node.js LTS und starte dieses Setup danach neu."
    "msg.depsQuestion" = "Die Projekt-Abhaengigkeiten werden mit npm install geladen. Fortfahren?"
    "title.depsInstall" = "Abhaengigkeiten installieren"
    "msg.finished" = "Setup ist fertig. Dieses Fenster bleibt offen. Das CMD-Fenster startet danach die App, wenn der Haken aktiv ist."
    "title.finished" = "Fertig"
    "title.setupError" = "Setup-Fehler"
    "msg.fatal" = "Das Setup ist unerwartet abgestuerzt:`r`n{message}`r`n`r`nBitte setup.log im Projektordner pruefen."
    "title.fatal" = "Fataler Setup-Fehler"
    "process.node" = "Node.js Installation"
    "process.deps" = "Projekt-Abhaengigkeiten"
    "process.depsFallback" = "Projekt-Abhaengigkeiten Fallback"
    "log.started" = "Setup gestartet."
    "log.success" = "Setup erfolgreich abgeschlossen."
    "log.startFlag" = "App-Start nach Setup wurde fuer setup-beta.bat vorgemerkt."
    "log.fallback" = "npm install meldete einen Fehler, Fallback ohne eigenen Cache wird versucht."
    "log.depsContinue" = "npm meldete einen Fehler, aber die benoetigten Pakete sind vorhanden. Setup wird fortgesetzt."
    "log.processStart" = "{name} wird gestartet: {command}"
    "log.processFailed" = "{name} fehlgeschlagen mit Exit Code {code}."
    "log.processDone" = "{name} abgeschlossen."
    "log.setupError" = "Setup-Fehler: {message}"
    "log.fatal" = "Fataler Setup-Fehler: {message}"
    "error.commandMissing" = "{name} wurde nicht gefunden."
    "error.processCancelled" = "{name} wurde abgebrochen."
    "error.processFailed" = "{name} ist fehlgeschlagen (Exit Code {code}).`r`n{tail}"
  }
  en = @{
    "form.title" = "osu! Mod Score Finder - Beta Setup"
    "title" = "Local Beta Setup"
    "subtitle" = "Everything stays on this PC: .env, database and local osu! paths are not prepared for GitHub."
    "language" = "Language"
    "group.install" = "Installation"
    "group.config" = "Local configuration"
    "label.clientId" = "Client ID"
    "label.clientSecret" = "Client Secret"
    "label.stableDir" = "osu! stable folder"
    "label.lazerDir" = "osu!lazer folder"
    "label.port" = "Port"
    "link.osuApi" = "osu! API settings"
    "button.choose" = "Choose"
    "button.cancel" = "Cancel"
    "button.save" = "Save"
    "button.installSave" = "Install / Save"
    "checkbox.startAfter" = "Start the app in this CMD window after setup"
    "status.ready" = "Ready."
    "status.saved" = "Settings saved. Installation now runs step by step."
    "status.canceling" = "Cancelling installation..."
    "status.finished" = "Setup complete. .env was saved locally. You can close this window now."
    "status.fallback" = "npm install reported an error. Trying fallback..."
    "status.depsPresent" = "Dependencies are present. Setup continues."
    "status.error" = "Error: {message}"
    "status.processStart" = "Starting {name}..."
    "status.processRunning" = "{name} has been running for {seconds}s: {line}"
    "status.processWaiting" = "{name} has been running for {seconds}s. Please wait, this can take a few minutes."
    "status.processDone" = "{name} completed."
    "node.present" = "Node.js LTS is installed"
    "node.install" = "Install Node.js LTS (via winget)"
    "deps.present" = "Project dependencies are installed"
    "deps.install" = "Install project dependencies (npm install)"
    "deps.waitNode" = "Install project dependencies once Node.js is available"
    "folder.stable" = "Choose the osu! stable folder"
    "folder.lazer" = "Choose the osu!lazer folder"
    "msg.setupRunning" = "Setup is already running. Please use the setup window that is already open."
    "title.setupRunning" = "Setup already running"
    "msg.waitInstall" = "Please wait until the current installation is finished, or use the Cancel button."
    "title.installRunning" = "Installation running"
    "msg.cancelQuestion" = "An installation is currently running. Do you really want to cancel it?"
    "title.cancel" = "Cancel installation"
    "msg.noWinget" = "Node.js is missing and winget was not found. Please install Node.js LTS manually: https://nodejs.org/"
    "msg.nodeInstallQuestion" = "Node.js LTS will be installed with winget. Continue?"
    "title.nodeInstall" = "Install Node.js"
    "msg.noNpm" = "npm was not found. Install Node.js LTS first, then restart this setup."
    "msg.depsQuestion" = "Project dependencies will be downloaded with npm install. Continue?"
    "title.depsInstall" = "Install dependencies"
    "msg.finished" = "Setup is complete. This window stays open. The CMD window starts the app afterwards if the checkbox is enabled."
    "title.finished" = "Done"
    "title.setupError" = "Setup error"
    "msg.fatal" = "Setup crashed unexpectedly:`r`n{message}`r`n`r`nPlease check setup.log in the project folder."
    "title.fatal" = "Fatal setup error"
    "process.node" = "Node.js installation"
    "process.deps" = "Project dependencies"
    "process.depsFallback" = "Project dependencies fallback"
    "log.started" = "Setup started."
    "log.success" = "Setup completed successfully."
    "log.startFlag" = "App start after setup was queued for setup-beta.bat."
    "log.fallback" = "npm install reported an error; trying fallback without local cache."
    "log.depsContinue" = "npm reported an error, but the required packages are present. Setup continues."
    "log.processStart" = "Starting {name}: {command}"
    "log.processFailed" = "{name} failed with exit code {code}."
    "log.processDone" = "{name} completed."
    "log.setupError" = "Setup error: {message}"
    "log.fatal" = "Fatal setup error: {message}"
    "error.commandMissing" = "{name} was not found."
    "error.processCancelled" = "{name} was cancelled."
    "error.processFailed" = "{name} failed (exit code {code}).`r`n{tail}"
  }
}

function T($key) {
  if ($SetupTexts.ContainsKey($script:SetupLanguage) -and $SetupTexts[$script:SetupLanguage].ContainsKey($key)) {
    return $SetupTexts[$script:SetupLanguage][$key]
  }
  if ($SetupTexts["de"].ContainsKey($key)) { return $SetupTexts["de"][$key] }
  return $key
}

function TFormat($key, $values) {
  $text = T $key
  foreach ($entry in $values.GetEnumerator()) {
    $text = $text.Replace("{$($entry.Key)}", [string]$entry.Value)
  }
  return $text
}

function Save-SetupLanguage($language) {
  $normalized = if ($language -eq "en") { "en" } else { "de" }
  Set-Content -LiteralPath $SetupLanguagePath -Value $normalized -Encoding ASCII
}

$createdSetupMutex = $false
$script:SetupMutex = New-Object System.Threading.Mutex($true, "Local\OsuModScoreFinderBetaSetup", [ref]$createdSetupMutex)
if (-not $createdSetupMutex) {
  [System.Windows.Forms.MessageBox]::Show(
    (T "msg.setupRunning"),
    (T "title.setupRunning"),
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

try {
  if (Test-Path $StartAfterSetupPath) {
    Remove-Item -LiteralPath $StartAfterSetupPath -Force
  }
} catch {
  # The start flag is optional; stale cleanup must not block setup.
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
  return Test-Path (Join-Path $Root "node_modules\rosu-pp-js\package.json")
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
    throw (TFormat "error.commandMissing" @{ name = $fileName })
  }

  Write-SetupLog (TFormat "log.processStart" @{ name = $friendlyName; command = "$fileName $arguments" })
  $status.Text = TFormat "status.processStart" @{ name = $friendlyName }
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
      TFormat "status.processRunning" @{ name = $friendlyName; seconds = $elapsed; line = $lastLine }
    } else {
      TFormat "status.processWaiting" @{ name = $friendlyName; seconds = $elapsed }
    }
    [System.Windows.Forms.Application]::DoEvents()

    if ($script:CancelRequested) {
      Stop-CurrentProcessTree
      throw (TFormat "error.processCancelled" @{ name = $friendlyName })
    }
  }

  $process.WaitForExit()
  $script:CurrentProcess = $null
  $process.remove_OutputDataReceived($outputHandler)
  $process.remove_ErrorDataReceived($errorHandler)

  if ($script:CancelRequested) {
    throw (TFormat "error.processCancelled" @{ name = $friendlyName })
  }

  if ($process.ExitCode -ne 0) {
    $tail = ($lines | Select-Object -Last 18) -join "`r`n"
    Write-SetupLog (TFormat "log.processFailed" @{ name = $friendlyName; code = $process.ExitCode })
    throw (TFormat "error.processFailed" @{ name = $friendlyName; code = $process.ExitCode; tail = $tail })
  }

  Write-SetupLog (TFormat "log.processDone" @{ name = $friendlyName })
  $status.Text = TFormat "status.processDone" @{ name = $friendlyName }
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

function Open-ExternalLink($url) {
  try {
    Start-Process $url
  } catch {
    [System.Windows.Forms.MessageBox]::Show(
      $url,
      (T "link.osuApi"),
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
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
$form.Text = T "form.title"
$form.StartPosition = "CenterScreen"
$form.Size = New-Object System.Drawing.Size(760, 640)
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.Add_FormClosing({
  param($sender, $eventArgs)
  if ($script:CurrentProcess -and -not $script:CurrentProcess.HasExited) {
    $eventArgs.Cancel = $true
    [System.Windows.Forms.MessageBox]::Show(
      (T "msg.waitInstall"),
      (T "title.installRunning"),
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
  }
})

$font = New-Object System.Drawing.Font("Segoe UI", 9)
$form.Font = $font

$title = New-Object System.Windows.Forms.Label
$title.Text = T "title"
$title.Font = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Bold)
$title.Location = New-Object System.Drawing.Point(18, 16)
$title.Size = New-Object System.Drawing.Size(500, 34)
$form.Controls.Add($title)

$languageLabel = New-Object System.Windows.Forms.Label
$languageLabel.Text = T "language"
$languageLabel.Location = New-Object System.Drawing.Point(535, 22)
$languageLabel.Size = New-Object System.Drawing.Size(75, 22)
$form.Controls.Add($languageLabel)

$languageSelect = New-Object System.Windows.Forms.ComboBox
$languageSelect.DropDownStyle = [System.Windows.Forms.ComboBoxStyle]::DropDownList
$languageSelect.Location = New-Object System.Drawing.Point(615, 18)
$languageSelect.Size = New-Object System.Drawing.Size(110, 24)
[void]$languageSelect.Items.Add("Deutsch")
[void]$languageSelect.Items.Add("English")
$languageSelect.SelectedIndex = if ($script:SetupLanguage -eq "en") { 1 } else { 0 }
$form.Controls.Add($languageSelect)

$subtitle = New-Object System.Windows.Forms.Label
$subtitle.Text = T "subtitle"
$subtitle.Location = New-Object System.Drawing.Point(20, 55)
$subtitle.Size = New-Object System.Drawing.Size(705, 22)
$form.Controls.Add($subtitle)

$requirements = New-Object System.Windows.Forms.GroupBox
$requirements.Text = T "group.install"
$requirements.Location = New-Object System.Drawing.Point(20, 90)
$requirements.Size = New-Object System.Drawing.Size(705, 112)
$form.Controls.Add($requirements)

$nodeCheck = New-Object System.Windows.Forms.CheckBox
$nodeCheck.Location = New-Object System.Drawing.Point(18, 28)
$nodeCheck.Size = New-Object System.Drawing.Size(650, 24)
$nodeCheck.Checked = $true
if ($nodeInstalled) {
  $nodeCheck.Text = T "node.present"
  $nodeCheck.Enabled = $false
} else {
  $nodeCheck.Text = T "node.install"
}
$requirements.Controls.Add($nodeCheck)

$depsCheck = New-Object System.Windows.Forms.CheckBox
$depsCheck.Location = New-Object System.Drawing.Point(18, 62)
$depsCheck.Size = New-Object System.Drawing.Size(650, 24)
$depsCheck.Checked = $true
if ($depsInstalled) {
  $depsCheck.Text = T "deps.present"
  $depsCheck.Enabled = $false
} else {
  $depsCheck.Text = T "deps.install"
}
$requirements.Controls.Add($depsCheck)

$settings = New-Object System.Windows.Forms.GroupBox
$settings.Text = T "group.config"
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

$osuApiLink = New-Object System.Windows.Forms.LinkLabel
$osuApiLink.Text = T "link.osuApi"
$osuApiLink.Location = New-Object System.Drawing.Point(500, 12)
$osuApiLink.Size = New-Object System.Drawing.Size(180, 20)
$osuApiLink.TextAlign = [System.Drawing.ContentAlignment]::MiddleRight
$osuApiLink.Add_Click({ Open-ExternalLink "https://osu.ppy.sh/home/account/edit" })
$settings.Controls.Add($osuApiLink)

$clientIdLabel = Add-Label (T "label.clientId") 18 34
$clientIdBox = Add-TextBox (Get-ConfigValue "OSU_CLIENT_ID" "") 165 31 490

$clientSecretLabel = Add-Label (T "label.clientSecret") 18 75
$clientSecretBox = Add-TextBox (Get-ConfigValue "OSU_CLIENT_SECRET" "") 165 72 490 $true

$stableLabel = Add-Label (T "label.stableDir") 18 116
$stableBox = Add-TextBox (Get-ConfigValue "OSU_STABLE_DIR" $defaultStable) 165 113 405
$stableButton = New-Object System.Windows.Forms.Button
$stableButton.Text = T "button.choose"
$stableButton.Location = New-Object System.Drawing.Point(582, 111)
$stableButton.Size = New-Object System.Drawing.Size(98, 28)
$stableButton.Add_Click({ Pick-Folder $stableBox (T "folder.stable") })
$settings.Controls.Add($stableButton)

$lazerLabel = Add-Label (T "label.lazerDir") 18 157
$lazerBox = Add-TextBox (Get-ConfigValue "OSU_LAZER_DIR" $defaultLazer) 165 154 405
$lazerButton = New-Object System.Windows.Forms.Button
$lazerButton.Text = T "button.choose"
$lazerButton.Location = New-Object System.Drawing.Point(582, 152)
$lazerButton.Size = New-Object System.Drawing.Size(98, 28)
$lazerButton.Add_Click({ Pick-Folder $lazerBox (T "folder.lazer") })
$settings.Controls.Add($lazerButton)

$portLabel = Add-Label (T "label.port") 18 198
$portBox = Add-TextBox (Get-ConfigValue "PORT" "5173") 165 195 120

$openAfter = New-Object System.Windows.Forms.CheckBox
$openAfter.Text = T "checkbox.startAfter"
$openAfter.Location = New-Object System.Drawing.Point(165, 228)
$openAfter.Size = New-Object System.Drawing.Size(360, 24)
$openAfter.Checked = $true
$settings.Controls.Add($openAfter)

$status = New-Object System.Windows.Forms.Label
$status.Location = New-Object System.Drawing.Point(22, 500)
$status.Size = New-Object System.Drawing.Size(700, 38)
$status.Text = T "status.ready"
$form.Controls.Add($status)

$saveButton = New-Object System.Windows.Forms.Button
$saveButton.Text = T "button.installSave"
$saveButton.Location = New-Object System.Drawing.Point(430, 548)
$saveButton.Size = New-Object System.Drawing.Size(170, 34)
$form.Controls.Add($saveButton)

$cancelButton = New-Object System.Windows.Forms.Button
$cancelButton.Text = T "button.cancel"
$cancelButton.Location = New-Object System.Drawing.Point(615, 548)
$cancelButton.Size = New-Object System.Drawing.Size(110, 34)
$cancelButton.Add_Click({
  if ($script:CurrentProcess -and -not $script:CurrentProcess.HasExited) {
    $answer = [System.Windows.Forms.MessageBox]::Show(
      (T "msg.cancelQuestion"),
      (T "title.cancel"),
      [System.Windows.Forms.MessageBoxButtons]::YesNo,
      [System.Windows.Forms.MessageBoxIcon]::Question
    )
    if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
      $script:CancelRequested = $true
      Stop-CurrentProcessTree
      $status.Text = T "status.canceling"
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
    $nodeCheck.Text = T "node.present"
    $nodeCheck.Checked = $true
    $nodeCheck.Enabled = $false
  } else {
    $nodeCheck.Text = T "node.install"
    $nodeCheck.Enabled = $true
  }

  if ($depsNow) {
    $depsCheck.Text = T "deps.present"
    $depsCheck.Checked = $true
    $depsCheck.Enabled = $false
  } else {
    $depsCheck.Text = if ($npmNow) {
      T "deps.install"
    } else {
      T "deps.waitNode"
    }
    $depsCheck.Enabled = $true
  }

  if ($nodeNow -and $depsNow) {
    $saveButton.Text = T "button.save"
  } else {
    $saveButton.Text = T "button.installSave"
  }
}

function Apply-SetupLanguage {
  $form.Text = T "form.title"
  $title.Text = T "title"
  $subtitle.Text = T "subtitle"
  $languageLabel.Text = T "language"
  $requirements.Text = T "group.install"
  $settings.Text = T "group.config"
  $clientIdLabel.Text = T "label.clientId"
  $clientSecretLabel.Text = T "label.clientSecret"
  $stableLabel.Text = T "label.stableDir"
  $lazerLabel.Text = T "label.lazerDir"
  $portLabel.Text = T "label.port"
  $osuApiLink.Text = T "link.osuApi"
  $stableButton.Text = T "button.choose"
  $lazerButton.Text = T "button.choose"
  $openAfter.Text = T "checkbox.startAfter"
  $cancelButton.Text = T "button.cancel"
  if ($status.Text -eq "Bereit." -or $status.Text -eq "Ready.") {
    $status.Text = T "status.ready"
  }
  Update-InstallState
}

$languageSelect.Add_SelectedIndexChanged({
  $selectedLanguage = if ($languageSelect.SelectedIndex -eq 1) { "en" } else { "de" }
  if ($script:SetupLanguage -ne $selectedLanguage) {
    $script:SetupLanguage = $selectedLanguage
    Save-SetupLanguage $selectedLanguage
    Apply-SetupLanguage
  }
})

Apply-SetupLanguage

$saveButton.Add_Click({
  try {
    $saveButton.Enabled = $false
    Write-SetupLog (T "log.started")
    Save-SetupLanguage $script:SetupLanguage
    Save-DotEnv $clientIdBox.Text.Trim() $clientSecretBox.Text.Trim() $stableBox.Text.Trim() $lazerBox.Text.Trim() $portBox.Text.Trim()
    $status.Text = T "status.saved"
    [System.Windows.Forms.Application]::DoEvents()

    if ($nodeCheck.Enabled -and $nodeCheck.Checked) {
      if (-not (Test-CommandExists "winget")) {
        throw (T "msg.noWinget")
      }
      $answer = [System.Windows.Forms.MessageBox]::Show(
        (T "msg.nodeInstallQuestion"),
        (T "title.nodeInstall"),
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
      )
      if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        Run-CheckedProcess "winget" "install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements" $Root (T "process.node")
        Refresh-ProcessPath
        Update-InstallState
      }
    }

    if ($depsCheck.Enabled -and $depsCheck.Checked) {
      Refresh-ProcessPath
      if (-not (Test-CommandExists "npm")) {
        throw (T "msg.noNpm")
      }
      if (-not (Test-Path $NpmCachePath)) {
        New-Item -ItemType Directory -Path $NpmCachePath -Force | Out-Null
      }
      $answer = [System.Windows.Forms.MessageBox]::Show(
        (T "msg.depsQuestion"),
        (T "title.depsInstall"),
        [System.Windows.Forms.MessageBoxButtons]::YesNo,
        [System.Windows.Forms.MessageBoxIcon]::Question
      )
      if ($answer -eq [System.Windows.Forms.DialogResult]::Yes) {
        $npmArgs = "install --no-audit --no-fund --prefer-online --cache `"$NpmCachePath`""
        $installError = $null
        try {
          Run-CheckedProcess "npm" $npmArgs $Root (T "process.deps")
        } catch {
          $installError = $_.Exception.Message
          Write-SetupLog (T "log.fallback")
          $status.Text = T "status.fallback"
          [System.Windows.Forms.Application]::DoEvents()
          try {
            Run-CheckedProcess "npm" "install --no-audit --no-fund --omit=optional" $Root (T "process.depsFallback") $false
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
          Write-SetupLog (T "log.depsContinue")
          $status.Text = T "status.depsPresent"
        }
      }
    }

    $status.Text = T "status.finished"
    Write-SetupLog (T "log.success")

    if ($openAfter.Checked) {
      Set-Content -LiteralPath $StartAfterSetupPath -Value "1" -Encoding ASCII
      Write-SetupLog (T "log.startFlag")
    }

    [System.Windows.Forms.MessageBox]::Show(
      (T "msg.finished"),
      (T "title.finished"),
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
  } catch {
    $script:SetupHadError = $true
    Write-SetupLog (TFormat "log.setupError" @{ message = $_.Exception.Message })
    [System.Windows.Forms.MessageBox]::Show(
      $_.Exception.Message,
      (T "title.setupError"),
      [System.Windows.Forms.MessageBoxButtons]::OK,
      [System.Windows.Forms.MessageBoxIcon]::Error
    ) | Out-Null
    $message = $_.Exception.Message
    if ($message.Length -gt 180) { $message = $message.Substring(0, 180) + "..." }
    $status.Text = TFormat "status.error" @{ message = $message }
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
  Write-SetupLog (TFormat "log.fatal" @{ message = $_.Exception.Message })
  [System.Windows.Forms.MessageBox]::Show(
    (TFormat "msg.fatal" @{ message = $_.Exception.Message }),
    (T "title.fatal"),
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Error
  ) | Out-Null
  exit 1
}
