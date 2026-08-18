$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.dev.yml"
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"
$volumeName = "cm_platform_postgres_data"
$containerName = "cm-platform-db"
$rabbitMqContainerName = "cm-platform-rabbitmq"
$mongoContainerName = "cm-platform-mongodb"

function Get-DevEnvValue {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    if (-not (Test-Path $envFile)) {
        throw "Missing local secrets file: $envFile"
    }

    $line = Get-Content $envFile |
        Where-Object { $_ -match "^\s*$([regex]::Escape($Name))=" } |
        Select-Object -First 1

    if (-not $line) {
        throw "Missing required local secret '$Name' in $envFile"
    }

    return ($line -replace "^\s*$([regex]::Escape($Name))=", "").Trim()
}

$postgresUser = Get-DevEnvValue -Name "POSTGRES_USER"
$mongoRootUsername = Get-DevEnvValue -Name "MONGODB_ROOT_USERNAME"
$mongoRootPassword = Get-DevEnvValue -Name "MONGODB_ROOT_PASSWORD"
$mongoAppUsername = Get-DevEnvValue -Name "MONGODB_APP_USERNAME"
$mongoAppPassword = Get-DevEnvValue -Name "MONGODB_APP_PASSWORD"
$healthcareMongoAppUsername = Get-DevEnvValue -Name "HEALTHCARE_TRANSFORM_MONGODB_APP_USERNAME"
$healthcareMongoAppPassword = Get-DevEnvValue -Name "HEALTHCARE_TRANSFORM_MONGODB_APP_PASSWORD"
$mongoDatabaseName = "CMPlatformDocuments"
$healthcareMongoDatabaseName = "healthcare_transform"

function Wait-ForPostgres {
    $maxAttempts = 60

    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"

        try {
            docker exec $containerName pg_isready -U $postgresUser *> $null
            $postgresPingExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        if ($postgresPingExitCode -eq 0) {
            Write-Host "Postgres is ready."
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "Postgres did not become ready after $($maxAttempts * 2) seconds."
}

function Wait-ForRabbitMq {
    $maxAttempts = 60

    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"

        try {
            docker exec $rabbitMqContainerName rabbitmq-diagnostics -q ping *> $null
            $rabbitMqPingExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        if ($rabbitMqPingExitCode -eq 0) {
            Write-Host "RabbitMQ is ready."
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "RabbitMQ did not become ready after $($maxAttempts * 2) seconds."
}

function Wait-ForMongoDb {
    $maxAttempts = 60

    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"

        try {
            docker exec $mongoContainerName mongosh `
                --quiet `
                --username $mongoRootUsername `
                --password $mongoRootPassword `
                --authenticationDatabase admin `
                --eval "db.adminCommand({ ping: 1 }).ok" *> $null
            $mongoPingExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        if ($mongoPingExitCode -eq 0) {
            Write-Host "MongoDB is ready."
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "MongoDB did not become ready after $($maxAttempts * 2) seconds."
}

function Ensure-MongoAppUser {
    $escapedUsername = $mongoAppUsername.Replace("\", "\\").Replace("'", "\'")
    $escapedPassword = $mongoAppPassword.Replace("\", "\\").Replace("'", "\'")
    $escapedDatabaseName = $mongoDatabaseName.Replace("\", "\\").Replace("'", "\'")
    $script = @"
const appDb = db.getSiblingDB('$escapedDatabaseName');
const username = '$escapedUsername';
const password = '$escapedPassword';
const roles = [{ role: 'readWrite', db: '$escapedDatabaseName' }];

if (appDb.getUser(username)) {
    appDb.updateUser(username, { pwd: password, roles });
} else {
    appDb.createUser({ user: username, pwd: password, roles });
}
"@

    docker exec $mongoContainerName mongosh `
        --quiet `
        --username $mongoRootUsername `
        --password $mongoRootPassword `
        --authenticationDatabase admin `
        --eval $script | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to ensure the MongoDB application user."
    }

    Write-Host "MongoDB application user is available for $mongoDatabaseName."
}

function Ensure-HealthcareTransformMongoAppUser {
    $escapedUsername = $healthcareMongoAppUsername.Replace("\", "\\").Replace("'", "\'")
    $escapedPassword = $healthcareMongoAppPassword.Replace("\", "\\").Replace("'", "\'")
    $escapedDatabaseName = $healthcareMongoDatabaseName.Replace("\", "\\").Replace("'", "\'")
    $script = @"
const appDb = db.getSiblingDB('$escapedDatabaseName');
const username = '$escapedUsername';
const password = '$escapedPassword';
const roles = [{ role: 'readWrite', db: '$escapedDatabaseName' }];

if (appDb.getUser(username)) {
    appDb.updateUser(username, { pwd: password, roles });
} else {
    appDb.createUser({ user: username, pwd: password, roles });
}
"@

    docker exec $mongoContainerName mongosh `
        --quiet `
        --username $mongoRootUsername `
        --password $mongoRootPassword `
        --authenticationDatabase admin `
        --eval $script | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to ensure the healthcare-transform MongoDB application user."
    }

    Write-Host "MongoDB application user is available for $healthcareMongoDatabaseName."
}

$existingVolume = docker volume ls --quiet --filter "name=^$volumeName$"

if (-not $existingVolume) {
    Write-Host "Creating persistent Docker volume: $volumeName"
    docker volume create $volumeName | Out-Null
}

docker compose --env-file $envFile -f $composeFile up -d db rabbitmq mongodb

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Wait-ForPostgres
Wait-ForRabbitMq
Wait-ForMongoDb
Ensure-MongoAppUser
Ensure-HealthcareTransformMongoAppUser

exit $LASTEXITCODE
