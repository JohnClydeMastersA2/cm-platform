import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { createLogger } from "@cm/logging";
import { dbPlugin } from "./plugins/db.js";
import { messagingPlugin } from "./plugins/messaging.js";
import { mongoPlugin } from "./plugins/mongo.js";
import { authAdminPlugin } from "./plugins/auth-admin.js";
import { csrfPlugin } from "./plugins/csrf.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { platformStatusRoutes } from "./modules/platform_status/platform_status.routes.js";
import { emailEventsWebhookRoutes } from "./routes/webhooks/email_events.js";
import { priorityQueueRoutes } from "./modules/priority_queue/priority_queue.routes.js";
import { topicRoutingRoutes } from "./modules/topic_routing/topic_routing.routes.js";
import { internalSurface } from "./surfaces/internal.surface.js";
import { widgetRoutes } from "./modules/widget/widget.routes.js";
import { widgetConsumerRoutes } from "./modules/widget_consumer/widget_consumer.routes.js";
import { emailWebhookEventRoutes } from "./modules/email_webhook_event/email_webhook_event.routes.js";
import { healthcareRoutes } from "./modules/healthcare/healthcare.routes.js";

const instanceRateLimitMax = 300;
const instanceRateLimitWindow = "1 minute";

type BuildAppOptions = {
  nodeEnv: string;
  logLevel: string;
  adminKey: string;
  databaseUrl: string;
  databaseSsl: boolean;
  authApiBaseUrl: string;
  publicWebBaseUrl: string;
  healthcareTransformBaseUrl: string;
  rabbitMqUrl: string;
  mongoDbUri: string;
  mongoDbDatabase: string;
  monitorEmails: string[];
  resendWebhookSecret?: string | undefined;
};

export function buildApp(opts: BuildAppOptions) {
  const logger = createLogger({
    name: "svc-core",
    level: opts.logLevel,
    ...(process.env.NODE_ENV ? { env: process.env.NODE_ENV } : {}),
  });

  const app = Fastify({
    loggerInstance: logger,
    pluginTimeout: 60_000,
  });

  app.register(rateLimit, {
    global: true,
    max: instanceRateLimitMax,
    timeWindow: instanceRateLimitWindow,
    keyGenerator: () => "svc-core-instance",
  });

  app.register(dbPlugin, {
    databaseUrl: opts.databaseUrl,
    ssl: opts.databaseSsl,
  });

  app.register(messagingPlugin, {
    rabbitMqUrl: opts.rabbitMqUrl,
  });

  app.register(mongoPlugin, {
    uri: opts.mongoDbUri,
    database: opts.mongoDbDatabase,
  });

  app.register(authAdminPlugin, {
    adminKey: opts.adminKey,
  });

  app.register(csrfPlugin);

  app.get("/", async () => {
    return {
      ok: true,
      service: "cm-platform svc-core",
      routes: {
        health: "/health",
        ready: "/ready",
        internal: "/internal",
        public: "/public",
      },
    };
  });

  app.get(
    "/health",
    {
      config: {
        rateLimit: false,
      },
    },
    async () => {
      return { ok: true };
    },
  );

  app.get(
    "/ready",
    {
      config: {
        rateLimit: false,
      },
    },
    async () => {
      await app.db.query("select 1 as ok");
      await app.mongoDb.command({ ping: 1 });
      return { ok: true };
    },
  );

  app.register(authRoutes, {
    prefix: "/auth",
    authApiBaseUrl: opts.authApiBaseUrl,
    publicWebBaseUrl: opts.publicWebBaseUrl,
  });
  app.register(emailEventsWebhookRoutes, {
    nodeEnv: opts.nodeEnv,
    ...(opts.resendWebhookSecret ? { webhookSecret: opts.resendWebhookSecret } : {}),
  });
  app.register(emailWebhookEventRoutes, { prefix: "/email-webhook-events" });
  app.register(widgetRoutes, { prefix: "/widgets" });
  app.register(widgetConsumerRoutes, { prefix: "/consumer-widgets" });
  app.register(topicRoutingRoutes, { prefix: "/topic-routing" });
  app.register(priorityQueueRoutes, { prefix: "/priority-queue" });
  app.register(platformStatusRoutes, {
    prefix: "/platform/status",
    monitorEmails: opts.monitorEmails,
  });
  app.register(healthcareRoutes, {
    prefix: "/healthcare",
    healthcareTransformBaseUrl: opts.healthcareTransformBaseUrl,
  });
  app.register(internalSurface);

  return app;
}
