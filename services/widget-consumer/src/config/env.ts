import { z } from "zod";

const EnvSchema = z.object({
  DB_SERVER: z.string().min(1),
  DB_PORT: z.coerce.number().int().positive().default(1433),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_DATABASE: z.string().min(1),

  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  RABBITMQ_URL: z.url().default("amqp://cm_platform:cm_platform_dev@localhost:5672"),
  WIDGET_CONSUMER_NAME: z.string().min(1).default("widget-consumer"),
  WIDGET_CONSUMER_PROCESSING_SECONDS: z.coerce.number().int().nonnegative().default(1),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid widget consumer environment variables");
  }

  return parsed.data;
}
