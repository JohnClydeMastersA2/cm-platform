import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const EnvSchema = z.object({
  DB_SERVER: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),
  DB_ENCRYPT: z.coerce.boolean().default(false),
  DB_TRUST_SERVER_CERTIFICATE: z.coerce.boolean().default(true),

  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  RABBITMQ_URL: z.url(),
  WIDGET_CONSUMER_NAME: z.string().min(1).default("widget-consumer"),
  WIDGET_CONSUMER_PROCESSING_SECONDS: z.coerce.number().int().nonnegative().default(1),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadLocalEnvFiles();

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid widget consumer environment variables");
  }

  return parsed.data;
}

function loadLocalEnvFiles(): void {
  const candidatePaths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "packages/secrets/cm-platform.env"),
    resolve(process.cwd(), "../../packages/secrets/cm-platform.env"),
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      loadDotenv({ path, quiet: true });
    }
  }
}
