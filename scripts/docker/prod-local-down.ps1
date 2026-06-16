$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.prod-local.yml"
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"

$services = @(
    "svc-core",
    "public-web",
    "email-dispatcher",
    "widget-consumer-fast",
    "widget-consumer-slow"
)

docker compose --env-file $envFile -f $composeFile stop $services

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

docker compose --env-file $envFile -f $composeFile rm -f $services
exit $LASTEXITCODE
