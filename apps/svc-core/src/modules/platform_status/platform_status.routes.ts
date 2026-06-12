import type { FastifyInstance } from "fastify";
import { emailWebhookEvents } from "../email_webhook_event/email_webhook_event.repo.js";

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

export async function platformStatusRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    const checkedAt = new Date().toISOString();
    const [
      api,
      database,
      documentDatabase,
      emailDispatcher,
      widgetConsumers,
      emailWebhook,
    ] = await Promise.all([
      getApiRequirement(app, checkedAt),
      getDatabaseRequirement(app, checkedAt),
      getDocumentDatabaseRequirement(app, checkedAt),
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
        emailDispatcher,
        ...widgetConsumers,
        emailWebhook,
      ],
      notes: [
        "Local background services are Docker-managed by default. Use npm run infra:workers:up to start the email dispatcher and the fast/slow widget consumers.",
        "RabbitMQ consumer counts confirm that consumers are attached to a queue, but this first status page does not yet identify individual consumer process names from the broker.",
        "fast-consumer and slow-consumer are shown as healthy when the competing-consumer queue has at least two attached consumers.",
      ],
    };
  });
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
      name: "Database",
      disposition: "online",
      detail: "SQL Server accepted a readiness query.",
      evidence: `Connected to ${databaseName}.`,
      checkedAt,
    };
  } catch (err) {
    return failedRequirement(
      "database",
      "Database",
      "SQL Server readiness query failed.",
      err,
      checkedAt,
    );
  }
}

async function queryDatabaseName(app: FastifyInstance): Promise<string> {
  const result = await app.db.request().query<{ ok: number; databaseName: string }>(`
    select
      1 as ok,
      db_name() as databaseName;
  `);

  return result.recordset[0]?.databaseName ?? "unknown";
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
    const hasRecentEvent = Boolean(summary.lastReceivedAt);

    return {
      key: "email-webhook",
      name: "Email Webhook",
      disposition: hasRecentEvent ? "online" : "unknown",
      detail: hasRecentEvent
        ? "Email webhook events have been received and stored."
        : "The webhook route is registered, but no stored events were found.",
      evidence: hasRecentEvent
        ? `${summary.recentEventCount} event${summary.recentEventCount === 1 ? "" : "s"} stored in the last 24 hours. Last event: ${summary.lastReceivedAt}.`
        : "POST /webhooks/email-events is available; send a provider event to populate history.",
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
