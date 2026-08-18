$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.dev.yml"
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"

Write-Host "Stopping containers only. Postgres, RabbitMQ, and MongoDB Docker volumes are preserved."
docker compose --env-file $envFile -f $composeFile down
exit $LASTEXITCODE
