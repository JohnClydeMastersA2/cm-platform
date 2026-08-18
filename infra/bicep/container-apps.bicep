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

@secure()
@description('Postgres connection URL.')
param databaseUrl string

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
@description('Healthcare-transform MongoDB connection URI.')
param healthcareTransformMongoDbUri string

@secure()
@description('SMTP user for Resend email delivery.')
param emailSmtpUser string

@secure()
@description('SMTP password/API key for Resend email delivery.')
param emailSmtpPass string

@secure()
@description('Resend webhook signing secret used to verify email webhook callbacks.')
param resendWebhookSecret string

@description('MongoDB database name.')
param mongoDbDatabase string = 'CMPlatformDocuments'

@description('Healthcare-transform MongoDB database name.')
param healthcareTransformMongoDbDatabase string = 'healthcare_transform'

@description('Public base URL.')
param publicBaseUrl string = 'https://cmplatform.dev'

@description('Comma- or semicolon-separated monitor recipients for system emails.')
param demoMaintenanceMonitors string

@description('Retention threshold in hours for shared public demo cleanup.')
param demoMaintenanceRetentionHours int = 24

@description('UTC cron expression for the demo maintenance scheduled job.')
param demoMaintenanceCronExpression string = '0 5 * * *'

@description('Whether the demo maintenance job captures cached Azure cost snapshots.')
param costReportingEnabled bool = true

@description('Number of days of Azure cost snapshots to retain in Postgres.')
param costReportingRetentionDays int = 60

@description('Number of days to refresh from Azure Cost Management on each scheduled run.')
param costReportingLookbackDays int = 60

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
var demoMaintenanceImage = '${imagePrefix}/demo-maintenance:${imageTag}'
var healthcareTransformImage = '${imagePrefix}/healthcare-transform:${imageTag}'
var costManagementReaderRoleDefinitionId = '72fafb9e-0641-4937-9268-a91bfd8191a3'
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
          name: 'database-url'
          value: databaseUrl
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
        {
          name: 'resend-webhook-secret'
          value: resendWebhookSecret
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
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'PGSSLMODE'
              value: 'require'
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
              name: 'HEALTHCARE_TRANSFORM_BASE_URL'
              value: 'https://${healthcareTransformApp.properties.configuration.ingress.fqdn}'
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
            {
              name: 'CM_PLATFORM_MONITORS'
              value: demoMaintenanceMonitors
            }
            {
              name: 'RESEND_WEBHOOK_SECRET'
              secretRef: 'resend-webhook-secret'
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
        rules: [
          {
            name: 'email-dispatch-queue'
            custom: {
              type: 'rabbitmq'
              metadata: {
                queueName: 'cm.email.dispatch'
                mode: 'QueueLength'
                value: '1'
                protocol: 'auto'
              }
              auth: [
                {
                  secretRef: 'rabbitmq-url'
                  triggerParameter: 'host'
                }
              ]
            }
          }
        ]
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

resource healthcareTransformApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'ca-cmp-healthcare-${environmentName}'
  location: location
  tags: commonTags
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: false
        targetPort: 8081
        transport: 'auto'
        allowInsecure: false
      }
      secrets: [
        {
          name: 'healthcare-mongodb-uri'
          value: healthcareTransformMongoDbUri
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
          name: 'healthcare-transform'
          image: healthcareTransformImage
          env: [
            {
              name: 'SERVER_PORT'
              value: '8081'
            }
            {
              name: 'HEALTHCARE_TRANSFORM_MONGODB_URI'
              secretRef: 'healthcare-mongodb-uri'
            }
            {
              name: 'HEALTHCARE_TRANSFORM_MONGODB_DATABASE'
              value: healthcareTransformMongoDbDatabase
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
          name: 'database-url'
          value: databaseUrl
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
        rules: [
          {
            name: 'widget-processing-queue'
            custom: {
              type: 'rabbitmq'
              metadata: {
                queueName: 'cm.widget.consumer-demo.processing'
                mode: 'QueueLength'
                value: '1'
                protocol: 'auto'
              }
              auth: [
                {
                  secretRef: 'rabbitmq-url'
                  triggerParameter: 'host'
                }
              ]
            }
          }
        ]
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
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'PGSSLMODE'
              value: 'require'
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
          name: 'database-url'
          value: databaseUrl
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
        rules: [
          {
            name: 'widget-processing-queue'
            custom: {
              type: 'rabbitmq'
              metadata: {
                queueName: 'cm.widget.consumer-demo.processing'
                mode: 'QueueLength'
                value: '1'
                protocol: 'auto'
              }
              auth: [
                {
                  secretRef: 'rabbitmq-url'
                  triggerParameter: 'host'
                }
              ]
            }
          }
        ]
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
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'PGSSLMODE'
              value: 'require'
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

resource demoMaintenanceJob 'Microsoft.App/jobs@2024-03-01' = {
  name: 'job-cmp-demo-maint-${environmentName}'
  location: location
  tags: commonTags
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    environmentId: containerAppsEnvironment.id
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 1800
      replicaRetryLimit: 1
      scheduleTriggerConfig: {
        cronExpression: demoMaintenanceCronExpression
        parallelism: 1
        replicaCompletionCount: 1
      }
      secrets: [
        {
          name: 'database-url'
          value: databaseUrl
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
      containers: [
        {
          name: 'demo-maintenance'
          image: demoMaintenanceImage
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
              name: 'DATABASE_URL'
              secretRef: 'database-url'
            }
            {
              name: 'PGSSLMODE'
              value: 'require'
            }
            {
              name: 'ADMIN_KEY'
              secretRef: 'admin-key'
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
              name: 'CM_PLATFORM_MONITORS'
              value: demoMaintenanceMonitors
            }
            {
              name: 'DEMO_MAINTENANCE_RETENTION_HOURS'
              value: string(demoMaintenanceRetentionHours)
            }
            {
              name: 'DEMO_MAINTENANCE_API_BASE_URL'
              value: 'https://${publicApp.properties.configuration.ingress.fqdn}'
            }
            {
              name: 'DEMO_MAINTENANCE_API_HOST_HEADER'
              value: publicCustomDomainName
            }
            {
              name: 'COST_REPORTING_ENABLED'
              value: string(costReportingEnabled)
            }
            {
              name: 'COST_REPORTING_RETENTION_DAYS'
              value: string(costReportingRetentionDays)
            }
            {
              name: 'COST_REPORTING_LOOKBACK_DAYS'
              value: string(costReportingLookbackDays)
            }
            {
              name: 'AZURE_SUBSCRIPTION_ID'
              value: subscription().subscriptionId
            }
            {
              name: 'AZURE_RESOURCE_GROUP_NAME'
              value: resourceGroup().name
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

resource demoMaintenanceCostReaderRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(resourceGroup().id, demoMaintenanceJob.name, costManagementReaderRoleDefinitionId)
  scope: resourceGroup()
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', costManagementReaderRoleDefinitionId)
    principalId: demoMaintenanceJob.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output publicAppName string = publicApp.name
output publicAppFqdn string = publicApp.properties.configuration.ingress.fqdn
output emailDispatcherAppName string = emailDispatcherApp.name
output widgetConsumerFastAppName string = widgetConsumerFastApp.name
output widgetConsumerSlowAppName string = widgetConsumerSlowApp.name
output demoMaintenanceJobName string = demoMaintenanceJob.name
output healthcareTransformAppName string = healthcareTransformApp.name
