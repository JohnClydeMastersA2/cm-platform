param(
    [switch]$ConfirmProductionScan,
    [switch]$PullLatestImage
)

$ErrorActionPreference = "Stop"

if (-not $ConfirmProductionScan) {
    throw "This scan sends requests to https://cmplatform.dev. Rerun with -ConfirmProductionScan after confirming that you intend to scan the public site."
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$planPath = Join-Path $repoRoot "security\zap.yaml"
$reportDirectory = Join-Path $repoRoot "security-reports"

if (-not (Test-Path -LiteralPath $planPath -PathType Leaf)) {
    throw "ZAP automation plan not found: $planPath"
}

New-Item -ItemType Directory -Path $reportDirectory -Force | Out-Null

$pullPolicy = if ($PullLatestImage) { "always" } else { "missing" }
$planMount = "type=bind,source=$planPath,target=/zap/wrk/zap.yaml,readonly"
$reportMount = "type=bind,source=$reportDirectory,target=/zap/wrk/reports"

Write-Host "Running the non-destructive ZAP baseline scan against https://cmplatform.dev"
Write-Host "Reports will be written to $reportDirectory"

docker run `
    --rm `
    --pull $pullPolicy `
    --mount $planMount `
    --mount $reportMount `
    ghcr.io/zaproxy/zaproxy:stable `
    zap.sh -cmd -autorun /zap/wrk/zap.yaml

if ($LASTEXITCODE -ne 0) {
    throw "OWASP ZAP exited with code $LASTEXITCODE."
}

Write-Host "ZAP baseline scan completed."
