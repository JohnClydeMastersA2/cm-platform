$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$consumerScript = Join-Path $PSScriptRoot "start-widget-consumer.ps1"

Set-Location $repoRoot
npm run widget-consumer:deps:build

function Start-WidgetConsumerWindow {
    param(
        [Parameter(Mandatory = $true)]
        [string] $Name,

        [Parameter(Mandatory = $true)]
        [int] $ProcessingSeconds
    )

    $command = "& '$consumerScript' -Name '$Name' -ProcessingSeconds $ProcessingSeconds -SkipBuild"
    Start-Process powershell -WorkingDirectory $repoRoot -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        $command
    )
}

Start-WidgetConsumerWindow -Name "fast-consumer" -ProcessingSeconds 1
Start-WidgetConsumerWindow -Name "slow-consumer" -ProcessingSeconds 5

Write-Host "Started fast-consumer and slow-consumer in separate PowerShell windows."
