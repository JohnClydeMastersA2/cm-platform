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

  LOG_LEVEL: z.string().default("info"),

  LOG_INPUT_DIR: z.string().min(1),
  LOG_ARCHIVE_DIR: z.string().min(1),

  DEFAULT_SOURCE_SERVER_NAME: z.string().min(1).default("WEB01"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadLocalEnvFiles();

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(parsed.error.format());
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
