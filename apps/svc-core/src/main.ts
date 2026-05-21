import dotenv from "dotenv";
import { buildApp } from "./app.js";
import { loadEnv } from "./config/env.js";

dotenv.config({
  quiet: true,
});

async function start() {
  const env = loadEnv();

  const app = buildApp({
    logLevel: env.LOG_LEVEL,
    adminKey: env.ADMIN_KEY,
    dbServer: env.DB_SERVER,
    dbPort: env.DB_PORT,
    dbUser: env.DB_USER,
    dbPassword: env.DB_PASSWORD,
    dbDatabase: env.DB_DATABASE,
    authApiBaseUrl: env.AUTH_API_BASE_URL,
    publisherWebBaseUrl: env.PUBLISHER_WEB_BASE_URL,
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
