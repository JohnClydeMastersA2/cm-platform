import { z } from "zod";

const EnvSchema = z.object({
  DB_SERVER: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),

  LOG_LEVEL: z.string().default("info"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),

  ADMIN_KEY: z.string().min(1),

  AUTH_API_BASE_URL: z.url().default("http://localhost:3000"),
  PUBLIC_WEB_BASE_URL: z.url().default("http://localhost:5173"),
  RABBITMQ_URL: z.url().default("amqp://cm_platform:cm_platform_dev@localhost:5672"),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const rawEnv = {
    ...process.env,
    PUBLIC_WEB_BASE_URL: process.env.PUBLIC_WEB_BASE_URL ?? process.env.PUBLISHER_WEB_BASE_URL,
  };
  const parsed = EnvSchema.safeParse(rawEnv);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}
