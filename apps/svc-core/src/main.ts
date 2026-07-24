import dotenv from "dotenv";
import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

dotenv.config({
  quiet: true,
});

async function start() {
  const env = loadEnv();

  const app = buildApp({
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    adminKey: env.ADMIN_KEY,
    dbServer: env.DB_SERVER,
    dbPort: env.DB_PORT,
    dbUser: env.DB_USER,
    dbPassword: env.DB_PASSWORD,
    dbDatabase: env.DB_DATABASE,
    dbEncrypt: env.DB_ENCRYPT,
    dbTrustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    authApiBaseUrl: env.AUTH_API_BASE_URL,
    publicWebBaseUrl: env.PUBLIC_WEB_BASE_URL,
    rabbitMqUrl: env.RABBITMQ_URL,
    mongoDbUri: env.MONGODB_URI,
    mongoDbDatabase: env.MONGODB_DATABASE,
    monitorEmails: env.CM_PLATFORM_MONITORS,
    resendWebhookSecret: env.RESEND_WEBHOOK_SECRET,
  });

  try {
    await app.ready();
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://localhost:${env.PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
