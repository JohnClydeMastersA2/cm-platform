using '../container-apps.bicep'

param location = 'centralus'
param environmentName = 'prod'
param containerAppsEnvironmentName = 'cae-cm-platform-prod-cus'
param imageTag = readEnvironmentVariable('IMAGE_TAG')
param imagePrefix = 'ghcr.io/johnclydemastersa2/cm-platform'
param sqlServerFqdn = 'sql-cmplatform-prod-cus-qw3ws5xs6wfom.database.windows.net'
param sqlDatabaseName = 'CMPlatform'
param sqlApplicationUser = 'cmplatform_app'
param sqlApplicationPassword = readEnvironmentVariable('SQL_APP_PASSWORD')
param adminKey = readEnvironmentVariable('ADMIN_KEY')
param rabbitMqUrl = readEnvironmentVariable('RABBITMQ_URL')
param mongoDbUri = readEnvironmentVariable('MONGODB_URI')
param mongoDbDatabase = 'CMPlatformDocuments'
param publicBaseUrl = 'https://cmplatform.dev'
param tags = {
  project: 'cm-platform'
  purpose: 'portfolio-production'
  costControl: 'low-cost'
}
