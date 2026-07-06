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
param emailSmtpUser = readEnvironmentVariable('EMAIL_SMTP_USER')
param emailSmtpPass = readEnvironmentVariable('EMAIL_SMTP_PASS')
param mongoDbDatabase = 'CMPlatformDocuments'
param publicBaseUrl = 'https://cmplatform.dev'
param publicCustomDomainName = 'cmplatform.dev'
param publicCustomDomainCertificateId = '/subscriptions/d0b56c36-8b2c-4c25-8c3e-673fc84c0f46/resourceGroups/rg-cm-platform-prod/providers/Microsoft.App/managedEnvironments/cae-cm-platform-prod-cus/managedCertificates/mc-cae-cm-platfor-cmplatform-dev-1202'
param tags = {
  project: 'cm-platform'
  purpose: 'portfolio-production'
  costControl: 'low-cost'
}
