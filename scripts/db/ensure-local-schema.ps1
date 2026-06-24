$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")

Push-Location $repoRoot

try {
    npm run db:migrate
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
