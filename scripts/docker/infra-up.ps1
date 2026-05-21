$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$composeFile = Join-Path $repoRoot "docker\compose.dev.yml"
$volumeName = "docker_mssql_data"
$containerName = "cm-platform-db"
$saPassword = "#Pop,6300"
$devDatabaseNames = @("CMPlatform")
$legacyDatabaseRenames = @{
    "Sandbox" = "CMPlatform"
}

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
        Invoke-SqlServerCommand -Query "select 1 as ok" *> $null

        if ($LASTEXITCODE -eq 0) {
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

$existingVolume = docker volume ls --quiet --filter "name=^$volumeName$"

if (-not $existingVolume) {
    Write-Host "Creating persistent Docker volume: $volumeName"
    docker volume create $volumeName | Out-Null
}

docker compose -f $composeFile up -d db

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}

Wait-ForSqlServer
Ensure-DevDatabases

exit $LASTEXITCODE
