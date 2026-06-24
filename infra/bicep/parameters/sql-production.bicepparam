using '../sql-plan.bicep'

param location = 'eastus'
param environmentName = 'prod'
param sqlServerNamePrefix = 'sql-cmplatform-prod'
param sqlDatabaseName = 'CMPlatform'
param sqlAdministratorLogin = 'cmplatformddl'
// Validation and deployment commands must override this value with a secret.
param sqlAdministratorLoginPassword = ''
param tags = {
  project: 'cm-platform'
  purpose: 'portfolio-production'
  costControl: 'free-offer'
}
