$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"
$serviceDirectory = Join-Path $repoRoot "services\healthcare-transform"
$mavenWrapper = Join-Path $serviceDirectory "mvnw.cmd"

function Get-LocalEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Test-Path -LiteralPath $envFile)) {
        throw "Missing local secrets file: $envFile"
    }

    $line = Get-Content -LiteralPath $envFile |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=" } |
        Select-Object -First 1

    if (-not $line) {
        throw "Missing required local setting '$Name' in $envFile"
    }

    $value = ($line -replace "^\s*$([regex]::Escape($Name))=", "").Trim()

    if (-not $value) {
        throw "Local setting '$Name' is empty in $envFile"
    }

    return $value
}

if (-not (Test-Path -LiteralPath $mavenWrapper)) {
    throw "Maven wrapper not found: $mavenWrapper"
}

$mongoAvailable = Test-NetConnection `
    -ComputerName "localhost" `
    -Port 27017 `
    -InformationLevel Quiet `
    -WarningAction SilentlyContinue

if (-not $mongoAvailable) {
    throw "MongoDB is not reachable at localhost:27017. Run 'npm run infra:up' first."
}

$mongoDatabase = Get-LocalEnvValue -Name "HEALTHCARE_TRANSFORM_MONGODB_DATABASE"
$env:HEALTHCARE_TRANSFORM_MONGODB_URI = Get-LocalEnvValue -Name "HEALTHCARE_TRANSFORM_MONGODB_URI"
$env:HEALTHCARE_TRANSFORM_MONGODB_DATABASE = $mongoDatabase

Write-Host "Starting healthcare-transform with the authenticated local MongoDB configuration."
Write-Host "MongoDB database: $mongoDatabase"
Write-Host "Service URL: http://localhost:8081"
Write-Host "Press Ctrl+C to stop the service."

Push-Location $serviceDirectory

try {
    & $mavenWrapper spring-boot:run

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
}
finally {
    Pop-Location
}
