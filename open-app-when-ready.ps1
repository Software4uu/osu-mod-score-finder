param(
  [string]$AppUrl = "http://127.0.0.1:5173/"
)

$ErrorActionPreference = "SilentlyContinue"

function Get-FreshAppUrl {
  param([Uri]$Uri)

  $builder = [UriBuilder]::new($Uri)
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
  $query = $builder.Query
  if ($query.StartsWith("?")) {
    $query = $query.Substring(1)
  }
  if ([string]::IsNullOrWhiteSpace($query)) {
    $builder.Query = "pf_t=$stamp"
  } else {
    $builder.Query = "$query&pf_t=$stamp"
  }
  return $builder.Uri.AbsoluteUri
}

try {
  $baseUri = [Uri]$AppUrl
  $statusUrl = [Uri]::new($baseUri, "api/status").AbsoluteUri
  $freshAppUrl = Get-FreshAppUrl $baseUri
} catch {
  Start-Process $AppUrl
  exit 0
}

for ($attempt = 0; $attempt -lt 80; $attempt++) {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -TimeoutSec 1 $statusUrl
    if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) {
      Start-Process $freshAppUrl
      exit 0
    }
  } catch {
  }

  Start-Sleep -Milliseconds 500
}

Start-Process $freshAppUrl
