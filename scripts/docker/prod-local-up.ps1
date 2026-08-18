$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.prod-local.yml"
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"
$infraUpScript = Join-Path $repoRoot "scripts\docker\infra-up.ps1"

& $infraUpScript

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

npm run db:migrate

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

docker compose --env-file $envFile -f $composeFile up -d public-web svc-core healthcare-transform email-dispatcher widget-consumer-fast widget-consumer-slow
exit $LASTEXITCODE
