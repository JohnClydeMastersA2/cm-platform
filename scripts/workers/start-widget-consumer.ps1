param(
    [Parameter(Mandatory = $true)]
    [string] $Name,

    [Parameter(Mandatory = $true)]
    [int] $ProcessingSeconds,

    [switch] $SkipBuild
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
Set-Location $repoRoot

if (-not $SkipBuild) {
    npm run widget-consumer:deps:build
}

$env:WIDGET_CONSUMER_NAME = $Name
$env:WIDGET_CONSUMER_PROCESSING_SECONDS = [string] $ProcessingSeconds

Write-Host "Starting widget consumer '$Name' with $ProcessingSeconds second processing time."
npm --workspace services/widget-consumer run dev
