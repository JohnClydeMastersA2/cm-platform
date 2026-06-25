using '../main.bicep'

// Retired after the protected Central US replacement on 2026-06-25.
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
