param(
  [int] $Tail = 20
)

$ErrorActionPreference = "Stop"

$logPath = Join-Path (Get-Location) "logs/email-events-webhook.jsonl"

if (-not (Test-Path -LiteralPath $logPath)) {
  $logDirectory = Split-Path -Parent $logPath
  New-Item -ItemType Directory -Force -Path $logDirectory | Out-Null
  New-Item -ItemType File -Force -Path $logPath | Out-Null
}

Write-Host "Watching email webhook events:"
Write-Host "  $logPath"
Write-Host ""
Write-Host "Press Ctrl+C to stop."
Write-Host ""

Get-Content -LiteralPath $logPath -Tail $Tail -Wait
