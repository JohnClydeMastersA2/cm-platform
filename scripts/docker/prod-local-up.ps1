$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.prod-local.yml"
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"
$infraUpScript = Join-Path $repoRoot "scripts\docker\infra-up.ps1"
$schemaScript = Join-Path $repoRoot "scripts\db\ensure-local-schema.ps1"

& $infraUpScript

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

& $schemaScript

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

docker compose --env-file $envFile -f $composeFile up -d public-web svc-core email-dispatcher widget-consumer-fast widget-consumer-slow
exit $LASTEXITCODE
