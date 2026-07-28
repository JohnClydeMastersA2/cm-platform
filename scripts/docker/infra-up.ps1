$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.dev.yml"
$envFile = Join-Path $repoRoot "packages\secrets\cm-platform.env"
$volumeName = "docker_mssql_data"
$containerName = "cm-platform-db"
$rabbitMqContainerName = "cm-platform-rabbitmq"
$mongoContainerName = "cm-platform-mongodb"
$devDatabaseNames = @("CMPlatform")
$legacyDatabaseRenames = @{
    "Sandbox" = "CMPlatform"
}

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

$saPassword = Get-DevEnvValue -Name "MSSQL_SA_PASSWORD"
$dbUser = Get-DevEnvValue -Name "DB_USER"
$dbPassword = Get-DevEnvValue -Name "DB_PASSWORD"
$mongoRootUsername = Get-DevEnvValue -Name "MONGODB_ROOT_USERNAME"
$mongoRootPassword = Get-DevEnvValue -Name "MONGODB_ROOT_PASSWORD"
$mongoAppUsername = Get-DevEnvValue -Name "MONGODB_APP_USERNAME"
$mongoAppPassword = Get-DevEnvValue -Name "MONGODB_APP_PASSWORD"
$healthcareMongoAppUsername = Get-DevEnvValue -Name "HEALTHCARE_TRANSFORM_MONGODB_APP_USERNAME"
$healthcareMongoAppPassword = Get-DevEnvValue -Name "HEALTHCARE_TRANSFORM_MONGODB_APP_PASSWORD"
$mongoDatabaseName = "CMPlatformDocuments"
$healthcareMongoDatabaseName = "healthcare_transform"

function Invoke-SqlServerCommand {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Query
    )

    docker exec $containerName /opt/mssql-tools18/bin/sqlcmd `
        -S localhost `
        -U sa `
        -P $saPassword `
        -C `
        -b `
        -Q $Query
}

function Wait-ForSqlServer {
    $maxAttempts = 60

    for ($attempt = 1; $attempt -le $maxAttempts; $attempt++) {
        $previousErrorActionPreference = $ErrorActionPreference
        $ErrorActionPreference = "Continue"

        try {
            Invoke-SqlServerCommand -Query "select 1 as ok" *> $null
            $sqlServerPingExitCode = $LASTEXITCODE
        } finally {
            $ErrorActionPreference = $previousErrorActionPreference
        }

        if ($sqlServerPingExitCode -eq 0) {
            Write-Host "SQL Server is ready."
            return
        }

        Start-Sleep -Seconds 2
    }

    throw "SQL Server did not become ready after $($maxAttempts * 2) seconds."
}

function Ensure-DevDatabases {
    foreach ($legacyDatabaseName in $legacyDatabaseRenames.Keys) {
        $targetDatabaseName = $legacyDatabaseRenames[$legacyDatabaseName]
        $query = @"
declare @legacyDatabaseName sysname = N'$legacyDatabaseName';
declare @targetDatabaseName sysname = N'$targetDatabaseName';

if DB_ID(@legacyDatabaseName) is not null
   and DB_ID(@targetDatabaseName) is null
begin
    declare @sql nvarchar(max) =
        N'alter database ' + QUOTENAME(@legacyDatabaseName) + N' set single_user with rollback immediate;' +
        N'alter database ' + QUOTENAME(@legacyDatabaseName) + N' modify name = ' + QUOTENAME(@targetDatabaseName) + N';' +
        N'alter database ' + QUOTENAME(@targetDatabaseName) + N' set multi_user;';
    exec (@sql);
end
"@

        Invoke-SqlServerCommand -Query $query | Out-Null

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to rename SQL Server database '$legacyDatabaseName' to '$targetDatabaseName'."
        }
    }

    foreach ($databaseName in $devDatabaseNames) {
        $query = @"
declare @databaseName sysname = N'$databaseName';

if DB_ID(@databaseName) is null
begin
    declare @sql nvarchar(max) = N'create database ' + QUOTENAME(@databaseName);
    exec (@sql);
end
"@

        Invoke-SqlServerCommand -Query $query | Out-Null

        if ($LASTEXITCODE -ne 0) {
            throw "Failed to ensure SQL Server database '$databaseName'."
        }

        Write-Host "SQL Server database is available: $databaseName"
    }
}

function Ensure-SqlAppLogin {
    $escapedUser = $dbUser.Replace("'", "''")
    $escapedPassword = $dbPassword.Replace("'", "''")
    $query = @"
declare @loginName sysname = N'$escapedUser';
declare @password nvarchar(128) = N'$escapedPassword';
declare @sql nvarchar(max);

if not exists (select 1 from sys.server_principals where name = @loginName)
begin
    set @sql = N'create login ' + QUOTENAME(@loginName) +
        N' with password = ' + QUOTENAME(@password, '''') +
        N', check_policy = on;';
    exec (@sql);
end
else
begin
    set @sql = N'alter login ' + QUOTENAME(@loginName) +
        N' with password = ' + QUOTENAME(@password, '''') + N';';
    exec (@sql);
end

use [CMPlatform];

if not exists (select 1 from sys.database_principals where name = @loginName)
begin
    set @sql = N'create user ' + QUOTENAME(@loginName) +
        N' for login ' + QUOTENAME(@loginName) + N';';
    exec (@sql);
end

if IS_ROLEMEMBER(N'db_datareader', @loginName) <> 1
begin
    set @sql = N'alter role [db_datareader] add member ' + QUOTENAME(@loginName) + N';';
    exec (@sql);
end

if IS_ROLEMEMBER(N'db_datawriter', @loginName) <> 1
begin
    set @sql = N'alter role [db_datawriter] add member ' + QUOTENAME(@loginName) + N';';
    exec (@sql);
end
"@

    Invoke-SqlServerCommand -Query $query | Out-Null

    if ($LASTEXITCODE -ne 0) {
        throw "Failed to ensure the SQL Server application login."
    }

    Write-Host "SQL Server application login is available for CMPlatform."
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

Wait-ForSqlServer
Wait-ForRabbitMq
Wait-ForMongoDb
Ensure-MongoAppUser
Ensure-HealthcareTransformMongoAppUser
Ensure-DevDatabases
Ensure-SqlAppLogin

exit $LASTEXITCODE
