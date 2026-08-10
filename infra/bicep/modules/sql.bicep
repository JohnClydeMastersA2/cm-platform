@description('Azure region for the SQL resources.')
param location string

@description('Globally unique Azure SQL logical server name.')
param serverName string

@description('Azure SQL database name.')
param databaseName string

@description('Bootstrap SQL administrator login.')
param administratorLogin string

@secure()
@description('Bootstrap SQL administrator password.')
param administratorLoginPassword string

@description('Common tags applied to Azure SQL resources.')
param tags object = {}

resource sqlServer 'Microsoft.Sql/servers@2023-08-01' = {
  name: serverName
  location: location
  tags: tags
  properties: {
    administratorLogin: administratorLogin
    administratorLoginPassword: administratorLoginPassword
    minimalTlsVersion: '1.2'
    publicNetworkAccess: 'Enabled'
    restrictOutboundNetworkAccess: 'Disabled'
    version: '12.0'
  }
}

resource sqlDatabase 'Microsoft.Sql/servers/databases@2023-08-01' = {
  parent: sqlServer
  name: databaseName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
    tier: 'Basic'
    capacity: 5
  }
  properties: {
    createMode: 'Default'
    maxSizeBytes: 2147483648
    readScale: 'Disabled'
    requestedBackupStorageRedundancy: 'Local'
    zoneRedundant: false
  }
}

output serverId string = sqlServer.id
output serverName string = sqlServer.name
output serverFullyQualifiedDomainName string = sqlServer.properties.fullyQualifiedDomainName
output databaseId string = sqlDatabase.id
output databaseName string = sqlDatabase.name
