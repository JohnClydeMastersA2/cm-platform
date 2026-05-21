$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.dev.yml"

Write-Host "Stopping containers only. The docker_mssql_data Docker volume is preserved."
docker compose -f $composeFile down
exit $LASTEXITCODE
