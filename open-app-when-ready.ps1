param(
  [string]$AppUrl = "http://127.0.0.1:5173/"
)

$ErrorActionPreference = "SilentlyContinue"

try {
  $baseUri = [Uri]$AppUrl
  $statusUrl = [Uri]::new($baseUri, "api/status").AbsoluteUri
} catch {
  Start-Process $AppUrl
  exit 0
}

for ($attempt = 0; $attempt -lt 80; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $statusUrl
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      Start-Process $AppUrl
      exit 0
    }
  } catch {
  }

  Start-Sleep -Milliseconds 500
}

Start-Process $AppUrl
