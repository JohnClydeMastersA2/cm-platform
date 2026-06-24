using '../sql-plan.bicep'

param location = 'eastus'
param environmentName = 'prod'
param sqlServerNamePrefix = 'sql-cmplatform-prod'
param sqlDatabaseName = 'CMPlatform'
param sqlAdministratorLogin = 'cmplatformddl'
param sqlAdministratorLoginPassword = readEnvironmentVariable('SQL_ADMIN_PASSWORD')
param tags = {
  project: 'cm-platform'
  purpose: 'portfolio-production'
  costControl: 'free-offer'
}
