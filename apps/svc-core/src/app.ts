import Fastify from "fastify";
import { createLogger } from "@cm/logging";
import { dbPlugin } from "./plugins/db.js";
import { authAdminPlugin } from "./plugins/auth-admin.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { emailEventsWebhookRoutes } from "./routes/webhooks/email_events.js";
import { internalSurface } from "./surfaces/internal.surface.js";

type BuildAppOptions = {
  logLevel: string;
  adminKey: string;
  dbServer: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbDatabase: string;
  authApiBaseUrl: string;
  publisherWebBaseUrl: string;
};

export function buildApp(opts: BuildAppOptions) {
  const logger = createLogger({
    name: "svc-core",
    level: opts.logLevel,
    ...(process.env.NODE_ENV ? { env: process.env.NODE_ENV } : {}),
  });

  const app = Fastify({
    loggerInstance: logger,
  });

  app.register(dbPlugin, {
    server: opts.dbServer,
    port: opts.dbPort,
    user: opts.dbUser,
    password: opts.dbPassword,
    database: opts.dbDatabase,
  });

  app.register(authAdminPlugin, {
    adminKey: opts.adminKey,
  });

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

  app.get("/health", async () => {
    return { ok: true };
  });

  app.get("/ready", async () => {
    await app.db.request().query("select 1 as ok");
    return { ok: true };
  });

  app.register(authRoutes, {
    prefix: "/auth",
    authApiBaseUrl: opts.authApiBaseUrl,
    publisherWebBaseUrl: opts.publisherWebBaseUrl,
  });
  app.register(emailEventsWebhookRoutes);
  app.register(internalSurface);

  return app;
}
