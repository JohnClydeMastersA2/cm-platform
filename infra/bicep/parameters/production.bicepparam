using '../main.bicep'

param location = 'eastus'
param environmentName = 'prod'
param logAnalyticsWorkspaceName = 'log-cm-platform-prod'
param containerAppsEnvironmentName = 'cae-cm-platform-prod'
param logRetentionInDays = 30
param tags = {
  project: 'cm-platform'
  purpose: 'portfolio-production'
  costControl: 'low-cost'
}
