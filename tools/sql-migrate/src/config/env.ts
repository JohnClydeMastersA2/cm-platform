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

const EnvSchema = z.object({
  DB_SERVER: z.string().min(1).default("localhost"),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_MIGRATION_USER: z.string().min(1).optional(),
  DB_MIGRATION_PASSWORD: z.string().min(1).optional(),
  MSSQL_SA_PASSWORD: z.string().min(1).optional(),
  DB_DATABASE: z.string().min(1).default("CMPlatform"),
  DB_ENCRYPT: EnvBoolean.default(false),
  DB_TRUST_SERVER_CERTIFICATE: EnvBoolean.default(true),
  DB_MIGRATIONS_DIR: z.string().min(1).default("scripts/db/migrations"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadLocalEnvFiles();

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid SQL migration environment variables");
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
