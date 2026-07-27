import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const EnvBoolean = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  return value;
}, z.boolean());

const OptionalNonEmptyString = z.preprocess((value) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
}, z.string().min(1).optional());

const MonitorList = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .split(/[;,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}, z.array(z.email()).min(1));

const EnvSchema = z.object({
  DB_SERVER: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),
  DB_ENCRYPT: EnvBoolean.default(false),
  DB_TRUST_SERVER_CERTIFICATE: EnvBoolean.default(true),

  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),

  ADMIN_KEY: z.string().min(1),

  AUTH_API_BASE_URL: z.url().default("http://localhost:3000"),
  PUBLIC_WEB_BASE_URL: z.url().default("http://localhost:5173"),
  HEALTHCARE_TRANSFORM_BASE_URL: z.url().default("http://localhost:8081"),
  RABBITMQ_URL: z.url(),
  MONGODB_URI: z.url(),
  MONGODB_DATABASE: z.string().min(1).default("CMPlatformDocuments"),
  RESEND_WEBHOOK_SECRET: OptionalNonEmptyString,
  CM_PLATFORM_MONITORS: MonitorList,
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadLocalEnvFiles();

  const rawEnv = {
    ...process.env,
    CM_PLATFORM_MONITORS: process.env.CM_PLATFORM_MONITORS ?? process.env.CM_Platform_Monitors,
    PUBLIC_WEB_BASE_URL: process.env.PUBLIC_WEB_BASE_URL ?? process.env.PUBLISHER_WEB_BASE_URL,
  };
  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
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
