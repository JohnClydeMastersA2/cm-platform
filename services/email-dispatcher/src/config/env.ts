import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";

const EnvSchema = z.object({
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  RABBITMQ_URL: z.url(),
  EMAIL_DISPATCHER_PREFETCH: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  loadLocalEnvFiles();

  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid email dispatcher environment variables");
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
