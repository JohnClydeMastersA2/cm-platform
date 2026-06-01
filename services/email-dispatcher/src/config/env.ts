import { z } from "zod";

const EnvSchema = z.object({
  LOG_LEVEL: z.string().default("info"),
  NODE_ENV: z.string().default("development"),
  RABBITMQ_URL: z.url().default("amqp://cm_platform:cm_platform_dev@localhost:5672"),
  EMAIL_DISPATCHER_PREFETCH: z.coerce.number().int().positive().default(5),
});

export type Env = z.infer<typeof EnvSchema>;

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(z.treeifyError(parsed.error));
    throw new Error("Invalid email dispatcher environment variables");
  }

  return parsed.data;
}
