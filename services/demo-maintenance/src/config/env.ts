import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const MonitorList = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value
    .split(/[;,]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}, z.array(z.email()).min(1));

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

const DateString = z.iso.date();

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  PGSSLMODE: z.string().min(1).default("require"),

  ADMIN_KEY: z.string().min(1),
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  RABBITMQ_URL: z.url(),
  DEMO_MAINTENANCE_API_BASE_URL: z.url().default("http://localhost:3000"),
  DEMO_MAINTENANCE_API_HOST_HEADER: z.string().min(1).optional(),
  CM_PLATFORM_MONITORS: MonitorList,
  DEMO_MAINTENANCE_RETENTION_HOURS: z.coerce.number().positive().default(24),
  COST_REPORTING_ENABLED: EnvBoolean.default(false),
  COST_REPORTING_RETENTION_DAYS: z.coerce.number().int().positive().default(60),
  COST_REPORTING_FROM_DATE: DateString.optional(),
  COST_REPORTING_TO_DATE: DateString.optional(),
  AZURE_SUBSCRIPTION_ID: z.string().min(1).optional(),
  AZURE_RESOURCE_GROUP_NAME: z.string().min(1).default("rg-cm-platform-prod"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadLocalEnvFiles();

  const parsed = EnvSchema.safeParse({
    ...process.env,
    CM_PLATFORM_MONITORS: process.env.CM_PLATFORM_MONITORS ?? process.env.CM_Platform_Monitors,
  });

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid demo maintenance environment variables");
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
