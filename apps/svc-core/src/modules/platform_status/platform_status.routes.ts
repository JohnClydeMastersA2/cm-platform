import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import {
  emailMessageTypes,
  type SystemEmailRequestedMessage,
} from "@cm/messaging/email";
import { emailWebhookEvents } from "../email_webhook_event/email_webhook_event.repo.js";

const webhookTestEmailSubject = "Email Webhook Event Test";
const webhookTestEmailBody = "This is a test email from CM Platform. Sending this email should cause an event to be sent to the email-webhook handler.";

type Disposition = "online" | "degraded" | "offline" | "unknown";

type InfrastructureRequirement = {
  key: string;
  name: string;
  disposition: Disposition;
  detail: string;
  evidence: string;
  checkedAt: string;
};

type EmailWebhookSummary = {
  recentEventCount: number;
  lastReceivedAt: string | null;
};

type PlatformStatusRoutesOptions = {
  healthcareTransformBaseUrl: string;
  monitorEmails: string[];
};

export async function platformStatusRoutes(
  app: FastifyInstance,
  opts: PlatformStatusRoutesOptions,
): Promise<void> {
  app.get("/", async () => {
    const checkedAt = new Date().toISOString();
    const [
      api,
      database,
      documentDatabase,
      healthcareTransform,
      emailDispatcher,
      widgetConsumers,
      emailWebhook,
    ] = await Promise.all([
      getApiRequirement(app, checkedAt),
      getDatabaseRequirement(app, checkedAt),
      getDocumentDatabaseRequirement(app, checkedAt),
      getHealthcareTransformRequirement(opts.healthcareTransformBaseUrl, checkedAt),
      getEmailDispatcherRequirement(app, checkedAt),
      getWidgetConsumerRequirements(app, checkedAt),
      getEmailWebhookRequirement(app, checkedAt),
    ]);

    return {
      checkedAt,
      requirements: [
        api,
        database,
        documentDatabase,
        healthcareTransform,
        emailDispatcher,
        ...widgetConsumers,
        emailWebhook,
      ],
      notes: [
        "Local background services are Docker-managed by default. Use npm run infra:workers:up to start the email dispatcher and the fast/slow widget consumers.",
        "RabbitMQ consumer counts confirm that consumers are attached to a queue, but this first status page does not yet identify individual consumer process names from the broker.",
        "fast-consumer and slow-consumer are shown as healthy when the competing-consumer queue has at least two attached consumers.",
        "The local Cloudflare Tunnel for email webhooks is an operator-started process and is not directly observed by svc-core. Email webhook status reflects route availability and stored webhook event history, not current tunnel uptime.",
      ],
    };
  });

  app.post(
    "/email-webhook-test",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "15 minutes",
        },
      },
    },
    async (_request, reply) => {
      const message: SystemEmailRequestedMessage = {
        messageType: emailMessageTypes.systemEmailRequested,
        messageId: randomUUID(),
        requestedAt: new Date().toISOString(),
        source: "svc-core.platform-status",
        email: {
          to: opts.monitorEmails,
          subject: webhookTestEmailSubject,
          html: `<p>${webhookTestEmailBody}</p>`,
          text: webhookTestEmailBody,
        },
      };

      await app.messaging.publishSystemEmailRequested(message);

      reply.code(202).send({
        ok: true,
        messageId: message.messageId,
        recipientCount: opts.monitorEmails.length,
      });
    },
  );
}

async function getApiRequirement(
  app: FastifyInstance,
  checkedAt: string,
): Promise<InfrastructureRequirement> {
  try {
    const databaseName = await queryDatabaseName(app);

    return {
      key: "api-service",
      name: "API Service",
      disposition: "online",
      detail: "svc-core generated this infrastructure status response and completed its readiness check.",
      evidence: `GET /platform/status responded; readiness query reached ${databaseName}.`,
      checkedAt,
    };
  } catch (err) {
    return {
      key: "api-service",
      name: "API Service",
      disposition: "degraded",
      detail: "svc-core generated this infrastructure status response, but its readiness dependency check failed.",
      evidence: err instanceof Error ? err.message : "Unknown readiness error",
      checkedAt,
    };
  }
}

async function getDatabaseRequirement(
  app: FastifyInstance,
  checkedAt: string,
): Promise<InfrastructureRequirement> {
  try {
    const databaseName = await queryDatabaseName(app);

    return {
      key: "database",
      name: "Postgres Database",
      disposition: "online",
      detail: "Postgres accepted a readiness query.",
      evidence: `Connected to ${databaseName}.`,
      checkedAt,
    };
  } catch (err) {
    return failedRequirement(
      "database",
      "Postgres Database",
      "Postgres readiness query failed.",
      err,
      checkedAt,
    );
  }
}

async function queryDatabaseName(app: FastifyInstance): Promise<string> {
  const result = await app.db.query<{ ok: number; databaseName: string }>(`
    select
      1 as ok,
      current_database() as "databaseName";
  `);

  return result.rows[0]?.databaseName ?? "unknown";
}

async function getHealthcareTransformRequirement(
  baseUrl: string,
  checkedAt: string,
): Promise<InfrastructureRequirement> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/health`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return {
        key: "healthcare-transform",
        name: "Healthcare Transform",
        disposition: "degraded",
        detail: "The healthcare-transform service responded, but its health check was not OK.",
        evidence: `GET /health returned ${response.status}.`,
        checkedAt,
      };
    }

    const health = await response.json() as { service?: string; status?: string };
    const status = health.status ?? "unknown";
    const service = health.service ?? "healthcare-transform";

    return {
      key: "healthcare-transform",
      name: "Healthcare Transform",
      disposition: status.toUpperCase() === "UP" ? "online" : "degraded",
      detail: "The Java healthcare-transform microservice accepted a direct health check.",
      evidence: `${service} reported ${status}.`,
      checkedAt,
    };
  } catch (err) {
    return failedRequirement(
      "healthcare-transform",
      "Healthcare Transform",
      "Unable to reach the healthcare-transform health endpoint.",
      err,
      checkedAt,
    );
  }
}

async function getDocumentDatabaseRequirement(
  app: FastifyInstance,
  checkedAt: string,
): Promise<InfrastructureRequirement> {
  try {
    await app.mongoDb.command({ ping: 1 });

    return {
      key: "document-database",
      name: "MongoDB",
      disposition: "online",
      detail: "MongoDB accepted a readiness query.",
      evidence: `Connected to MongoDB database ${app.mongoDb.databaseName}.`,
      checkedAt,
    };
  } catch (err) {
    return failedRequirement(
      "document-database",
      "MongoDB",
      "MongoDB readiness query failed.",
      err,
      checkedAt,
    );
  }
}

async function getEmailDispatcherRequirement(
  app: FastifyInstance,
  checkedAt: string,
): Promise<InfrastructureRequirement> {
  try {
    const queue = await app.messaging.getEmailDispatchQueueOverview();
    const hasConsumer = queue.consumerCount > 0;

    return {
      key: "rabbitmq-email-dispatcher",
      name: "RabbitMQ - Email Dispatcher",
      disposition: hasConsumer ? "online" : "degraded",
      detail: hasConsumer
        ? "The email dispatch queue has an attached consumer."
        : "The email dispatch queue exists, but no dispatcher consumer is attached.",
      evidence: `${queue.queue}: ${queue.messageCount} waiting, ${queue.consumerCount} consumer${queue.consumerCount === 1 ? "" : "s"}.`,
      checkedAt,
    };
  } catch (err) {
    return failedRequirement(
      "rabbitmq-email-dispatcher",
      "RabbitMQ - Email Dispatcher",
      "Unable to inspect the email dispatch queue.",
      err,
      checkedAt,
    );
  }
}

async function getWidgetConsumerRequirements(
  app: FastifyInstance,
  checkedAt: string,
): Promise<InfrastructureRequirement[]> {
  try {
    const queue = await app.messaging.getWidgetConsumerQueueOverview();
    const expectedConsumers = [
      {
        key: "rabbitmq-slow-consumer",
        name: "RabbitMQ - slow-consumer",
      },
      {
        key: "rabbitmq-fast-consumer",
        name: "RabbitMQ - fast-consumer",
      },
    ];
    const hasExpectedConsumerCount = queue.consumerCount >= expectedConsumers.length;

    return expectedConsumers.map((consumer) => ({
      ...consumer,
      disposition: hasExpectedConsumerCount ? "online" : "degraded",
      detail: hasExpectedConsumerCount
        ? "The competing-consumer queue has enough attached consumers for the demo pair."
        : "The competing-consumer queue exists, but fewer than two consumers are attached.",
      evidence: `${queue.queue}: ${queue.messageCount} waiting, ${queue.consumerCount} attached consumer${queue.consumerCount === 1 ? "" : "s"}.`,
      checkedAt,
    }));
  } catch (err) {
    return [
      failedRequirement(
        "rabbitmq-slow-consumer",
        "RabbitMQ - slow-consumer",
        "Unable to inspect the competing-consumer queue.",
        err,
        checkedAt,
      ),
      failedRequirement(
        "rabbitmq-fast-consumer",
        "RabbitMQ - fast-consumer",
        "Unable to inspect the competing-consumer queue.",
        err,
        checkedAt,
      ),
    ];
  }
}

async function getEmailWebhookRequirement(
  app: FastifyInstance,
  checkedAt: string,
): Promise<InfrastructureRequirement> {
  try {
    const summary = await getEmailWebhookSummary(app);
    const hasRecentEvent = summary.recentEventCount > 0;
    const hasStoredEvent = Boolean(summary.lastReceivedAt);

    return {
      key: "email-webhook",
      name: "Email Webhook",
      disposition: hasRecentEvent ? "online" : "unknown",
      detail: hasRecentEvent
        ? "Email webhook events have been received and stored in the last 24 hours."
        : hasStoredEvent
          ? "The webhook route is registered, but no events were stored in the last 24 hours."
          : "The webhook route is registered, but no stored events were found.",
      evidence: hasRecentEvent
        ? `${summary.recentEventCount} event${summary.recentEventCount === 1 ? "" : "s"} stored in the last 24 hours. Last event: ${summary.lastReceivedAt}.`
        : hasStoredEvent
          ? `Last stored event: ${summary.lastReceivedAt}. Start the Cloudflare Tunnel and send a provider event to prove live ingestion.`
          : "POST /webhooks/email-events is available; start the Cloudflare Tunnel and send a provider event to populate history.",
      checkedAt,
    };
  } catch (err) {
    return failedRequirement(
      "email-webhook",
      "Email Webhook",
      "Unable to inspect stored email webhook events.",
      err,
      checkedAt,
    );
  }
}

async function getEmailWebhookSummary(app: FastifyInstance): Promise<EmailWebhookSummary> {
  const collection = emailWebhookEvents(app.mongoDb);
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [recentEventCount, latestEvent] = await Promise.all([
    collection.countDocuments({ receivedAt: { $gte: since } }),
    collection.findOne({}, {
      projection: { receivedAt: 1 },
      sort: { receivedAt: -1 },
    }),
  ]);

  return {
    recentEventCount,
    lastReceivedAt: latestEvent?.receivedAt.toISOString() ?? null,
  };
}

function failedRequirement(
  key: string,
  name: string,
  detail: string,
  err: unknown,
  checkedAt: string,
): InfrastructureRequirement {
  return {
    key,
    name,
    disposition: "offline",
    detail,
    evidence: err instanceof Error ? err.message : "Unknown error",
    checkedAt,
  };
}
