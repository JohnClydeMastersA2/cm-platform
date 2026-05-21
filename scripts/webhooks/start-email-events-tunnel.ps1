param(
  [string] $LocalUrl = "http://localhost:3000"
)

$ErrorActionPreference = "Stop"

function Resolve-Cloudflared {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue

  if ($command) {
    return $command.Source
  }

  $knownPaths = @(
    "C:\Program Files\cloudflared\cloudflared.exe",
    "C:\Program Files (x86)\cloudflared\cloudflared.exe"
  )

  foreach ($path in $knownPaths) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  throw "cloudflared.exe was not found. Install it with winget or download it from Cloudflare, then try again."
}

$cloudflared = Resolve-Cloudflared

Write-Host "Starting Cloudflare Tunnel for local email webhook development."
Write-Host "Local service: $LocalUrl"
Write-Host ""
Write-Host "When cloudflared prints the trycloudflare.com URL, configure Resend with:"
Write-Host "  https://<generated-name>.trycloudflare.com/webhooks/email-events"
Write-Host ""
Write-Host "Keep this window open while testing webhooks."
Write-Host ""

& $cloudflared tunnel --url $LocalUrl
