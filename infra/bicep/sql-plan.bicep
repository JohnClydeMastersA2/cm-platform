targetScope = 'resourceGroup'

@description('Azure region for CM Platform SQL resources.')
param location string = resourceGroup().location

@description('Deployment environment name.')
param environmentName string = 'prod'

@description('Azure SQL logical server name prefix.')
param sqlServerNamePrefix string = 'sql-cmplatform-prod'

@description('Azure SQL database name.')
param sqlDatabaseName string = 'CMPlatform'

@description('Bootstrap SQL administrator login.')
param sqlAdministratorLogin string

@secure()
@minLength(8)
@maxLength(128)
@description('Bootstrap SQL administrator password.')
param sqlAdministratorLoginPassword string

@description('Common tags applied to Azure SQL resources.')
param tags object = {}

var commonTags = union(tags, {
  application: 'cm-platform'
  environment: environmentName
  managedBy: 'bicep'
})

var sqlServerName = '${sqlServerNamePrefix}-${uniqueString(subscription().id, resourceGroup().id)}'

module sql 'modules/sql.bicep' = {
  name: 'cm-platform-sql'
  params: {
    location: location
    serverName: sqlServerName
    databaseName: sqlDatabaseName
    administratorLogin: sqlAdministratorLogin
    administratorLoginPassword: sqlAdministratorLoginPassword
    tags: commonTags
  }
}

output sqlServerName string = sql.outputs.serverName
output sqlServerFullyQualifiedDomainName string = sql.outputs.serverFullyQualifiedDomainName
output sqlServerId string = sql.outputs.serverId
output sqlDatabaseName string = sql.outputs.databaseName
output sqlDatabaseId string = sql.outputs.databaseId
