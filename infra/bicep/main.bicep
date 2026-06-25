targetScope = 'resourceGroup'

@description('Azure region for CM Platform resources.')
param location string = resourceGroup().location

@description('Deployment environment name.')
param environmentName string = 'prod'

@description('Log Analytics workspace name.')
param logAnalyticsWorkspaceName string

@description('Azure Container Apps managed environment name.')
param containerAppsEnvironmentName string

@description('Log Analytics retention in days.')
@minValue(30)
@maxValue(730)
param logRetentionInDays int = 30

@description('Common tags applied to Azure resources.')
param tags object = {}

var commonTags = union(tags, {
  application: 'cm-platform'
  environment: environmentName
  managedBy: 'bicep'
})

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: commonTags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: logRetentionInDays
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  tags: commonTags
  properties: {
    zoneRedundant: false
    peerAuthentication: {
      mtls: {
        enabled: false
      }
    }
    peerTrafficConfiguration: {
      encryption: {
        enabled: false
      }
    }
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
  }
}

output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id
output containerAppsEnvironmentId string = containerAppsEnvironment.id
