$containerName = "cm-platform-db"
$containerBackupPath = "/var/opt/mssql/data"
$localBackupPath = "C:\sql-backups"

New-Item -ItemType Directory -Force -Path $localBackupPath | Out-Null

docker cp "${containerName}:${containerBackupPath}/CMPlatform.bak" "${localBackupPath}\CMPlatform.bak"
if ($?) {
    docker exec $containerName rm "${containerBackupPath}/CMPlatform.bak"
}
