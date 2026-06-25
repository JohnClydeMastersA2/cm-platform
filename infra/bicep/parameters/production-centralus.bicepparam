using '../main.bicep'

param location = 'centralus'
param environmentName = 'prod'
param logAnalyticsWorkspaceName = 'log-cm-platform-prod-cus'
param containerAppsEnvironmentName = 'cae-cm-platform-prod-cus'
param logRetentionInDays = 30
param tags = {
  project: 'cm-platform'
  purpose: 'portfolio-production'
  costControl: 'low-cost'
}
