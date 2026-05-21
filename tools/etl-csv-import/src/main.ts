import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { createLogger } from "@cm/logging";
import { loadEnv } from "./config/env.js";
import { createDbPool } from "./lib/db.js";
import { importIisLogs } from "./jobs/import-iis-logs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({
  path: resolve(__dirname, "..", ".env"),
  quiet: true,
});

async function main() {
  const env = loadEnv();

  const logger = createLogger({
    name: "etl-iis-import",
    level: env.LOG_LEVEL,
    logFilePath: resolve(__dirname, "..", "logs", "etl-iis-import.log"),
  });

  logger.info("Starting IIS log ETL...");

  const db = await createDbPool({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
  });

  const inputDir = resolve(__dirname, "..", env.LOG_INPUT_DIR);
  const archiveDir = resolve(__dirname, "..", env.LOG_ARCHIVE_DIR);

  logger.info(
    {
      inputDir,
      archiveDir,
      logLevel: env.LOG_LEVEL,
      database: env.DB_DATABASE,
      defaultSourceServerName: env.DEFAULT_SOURCE_SERVER_NAME,
    },
    "Resolved ETL configuration",
  );

  try {
    await importIisLogs({
      db,
      inputDir,
      archiveDir,
      logger,
      defaultSourceServerName: env.DEFAULT_SOURCE_SERVER_NAME,
    });

    logger.info("IIS log ETL completed successfully.");
  } catch (err) {
    logger.error({ err }, "IIS log ETL failed");
    throw err;
  } finally {
    await db.close();
    logger.info("Database connection closed.");
  }
}

main().catch(() => {
  process.exit(1);
});