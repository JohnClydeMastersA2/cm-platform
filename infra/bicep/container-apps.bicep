targetScope = 'resourceGroup'

@description('Azure region for CM Platform resources.')
param location string = resourceGroup().location

@description('Deployment environment name.')
param environmentName string = 'prod'

@description('Azure Container Apps managed environment name.')
param containerAppsEnvironmentName string

@description('SHA tag for immutable GHCR images.')
param imageTag string

@description('GHCR image prefix, for example ghcr.io/owner/cm-platform.')
param imagePrefix string

@description('Azure SQL server FQDN.')
param sqlServerFqdn string

@description('Azure SQL database name.')
param sqlDatabaseName string = 'CMPlatform'

@description('Azure SQL runtime application user.')
param sqlApplicationUser string = 'cmplatform_app'

@secure()
@description('Azure SQL runtime application password.')
param sqlApplicationPassword string

@secure()
@description('Application admin key.')
param adminKey string

@secure()
@description('RabbitMQ connection URL.')
param rabbitMqUrl string

@secure()
@description('MongoDB connection URI.')
param mongoDbUri string

@secure()
@description('SMTP user for Resend email delivery.')
param emailSmtpUser string

@secure()
@description('SMTP password/API key for Resend email delivery.')
param emailSmtpPass string

@description('MongoDB database name.')
param mongoDbDatabase string = 'CMPlatformDocuments'

@description('Public base URL.')
param publicBaseUrl string = 'https://cmplatform.dev'

@description('Optional custom domain for the public web Container App.')
param publicCustomDomainName string = ''

@description('Optional managed certificate resource ID for the public web custom domain.')
param publicCustomDomainCertificateId string = ''

@description('Common tags applied to Azure resources.')
param tags object = {}

var commonTags = union(tags, {
  application: 'cm-platform'
  environment: environmentName
  managedBy: 'bicep'
})

var publicWebImage = '${imagePrefix}/public-web:${imageTag}'
var svcCoreImage = '${imagePrefix}/svc-core:${imageTag}'
var emailDispatcherImage = '${imagePrefix}/email-dispatcher:${imageTag}'
var widgetConsumerImage = '${imagePrefix}/widget-consumer:${imageTag}'
var publicCustomDomains = !empty(publicCustomDomainName) && !empty(publicCustomDomainCertificateId) ? [
  {
    name: publicCustomDomainName
    bindingType: 'SniEnabled'
    certificateId: publicCustomDomainCertificateId
  }
] : []

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' existing = {
  name: containerAppsEnvironmentName
}

resource publicApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-cmp-web-${environmentName}'
  location: location
  tags: commonTags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        targetPort: 8080
        transport: 'auto'
        allowInsecure: false
        customDomains: publicCustomDomains
      }
      secrets: [
        {
          name: 'sql-app-password'
          value: sqlApplicationPassword
        }
        {
          name: 'admin-key'
          value: adminKey
        }
        {
          name: 'rabbitmq-url'
          value: rabbitMqUrl
        }
        {
          name: 'mongodb-uri'
          value: mongoDbUri
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
      containers: [
        {
          name: 'public-web'
          image: publicWebImage
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
        {
          name: 'svc-core'
          image: svcCoreImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'HOST'
              value: '0.0.0.0'
            }
            {
              name: 'PORT'
              value: '3000'
            }
            {
              name: 'DB_SERVER'
              value: sqlServerFqdn
            }
            {
              name: 'DB_PORT'
              value: '1433'
            }
            {
              name: 'DB_USER'
              value: sqlApplicationUser
            }
            {
              name: 'DB_PASSWORD'
              secretRef: 'sql-app-password'
            }
            {
              name: 'DB_DATABASE'
              value: sqlDatabaseName
            }
            {
              name: 'DB_ENCRYPT'
              value: 'true'
            }
            {
              name: 'DB_TRUST_SERVER_CERTIFICATE'
              value: 'false'
            }
            {
              name: 'ADMIN_KEY'
              secretRef: 'admin-key'
            }
            {
              name: 'AUTH_API_BASE_URL'
              value: publicBaseUrl
            }
            {
              name: 'PUBLIC_WEB_BASE_URL'
              value: publicBaseUrl
            }
            {
              name: 'RABBITMQ_URL'
              secretRef: 'rabbitmq-url'
            }
            {
              name: 'MONGODB_URI'
              secretRef: 'mongodb-uri'
            }
            {
              name: 'MONGODB_DATABASE'
              value: mongoDbDatabase
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

resource emailDispatcherApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-cmp-email-${environmentName}'
  location: location
  tags: commonTags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        {
          name: 'rabbitmq-url'
          value: rabbitMqUrl
        }
        {
          name: 'email-smtp-user'
          value: emailSmtpUser
        }
        {
          name: 'email-smtp-pass'
          value: emailSmtpPass
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
      containers: [
        {
          name: 'email-dispatcher'
          image: emailDispatcherImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'RABBITMQ_URL'
              secretRef: 'rabbitmq-url'
            }
            {
              name: 'EMAIL_SMTP_USER'
              secretRef: 'email-smtp-user'
            }
            {
              name: 'EMAIL_SMTP_PASS'
              secretRef: 'email-smtp-pass'
            }
            {
              name: 'EMAIL_DISPATCHER_PREFETCH'
              value: '5'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

resource widgetConsumerFastApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-cmp-widget-fast-${environmentName}'
  location: location
  tags: commonTags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        {
          name: 'sql-app-password'
          value: sqlApplicationPassword
        }
        {
          name: 'rabbitmq-url'
          value: rabbitMqUrl
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
      containers: [
        {
          name: 'widget-consumer-fast'
          image: widgetConsumerImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'DB_SERVER'
              value: sqlServerFqdn
            }
            {
              name: 'DB_PORT'
              value: '1433'
            }
            {
              name: 'DB_USER'
              value: sqlApplicationUser
            }
            {
              name: 'DB_PASSWORD'
              secretRef: 'sql-app-password'
            }
            {
              name: 'DB_DATABASE'
              value: sqlDatabaseName
            }
            {
              name: 'DB_ENCRYPT'
              value: 'true'
            }
            {
              name: 'DB_TRUST_SERVER_CERTIFICATE'
              value: 'false'
            }
            {
              name: 'RABBITMQ_URL'
              secretRef: 'rabbitmq-url'
            }
            {
              name: 'WIDGET_CONSUMER_NAME'
              value: 'fast-consumer'
            }
            {
              name: 'WIDGET_CONSUMER_PROCESSING_SECONDS'
              value: '1'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

resource widgetConsumerSlowApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-cmp-widget-slow-${environmentName}'
  location: location
  tags: commonTags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      secrets: [
        {
          name: 'sql-app-password'
          value: sqlApplicationPassword
        }
        {
          name: 'rabbitmq-url'
          value: rabbitMqUrl
        }
      ]
    }
    template: {
      scale: {
        minReplicas: 0
        maxReplicas: 1
      }
      containers: [
        {
          name: 'widget-consumer-slow'
          image: widgetConsumerImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'LOG_LEVEL'
              value: 'info'
            }
            {
              name: 'DB_SERVER'
              value: sqlServerFqdn
            }
            {
              name: 'DB_PORT'
              value: '1433'
            }
            {
              name: 'DB_USER'
              value: sqlApplicationUser
            }
            {
              name: 'DB_PASSWORD'
              secretRef: 'sql-app-password'
            }
            {
              name: 'DB_DATABASE'
              value: sqlDatabaseName
            }
            {
              name: 'DB_ENCRYPT'
              value: 'true'
            }
            {
              name: 'DB_TRUST_SERVER_CERTIFICATE'
              value: 'false'
            }
            {
              name: 'RABBITMQ_URL'
              secretRef: 'rabbitmq-url'
            }
            {
              name: 'WIDGET_CONSUMER_NAME'
              value: 'slow-consumer'
            }
            {
              name: 'WIDGET_CONSUMER_PROCESSING_SECONDS'
              value: '5'
            }
          ]
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
        }
      ]
    }
  }
}

output publicAppName string = publicApp.name
output publicAppFqdn string = publicApp.properties.configuration.ingress.fqdn
output emailDispatcherAppName string = emailDispatcherApp.name
output widgetConsumerFastAppName string = widgetConsumerFastApp.name
output widgetConsumerSlowAppName string = widgetConsumerSlowApp.name
