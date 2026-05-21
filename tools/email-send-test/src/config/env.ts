import { z } from "zod";

const EnvSchema = z.object({
  EMAIL_SEND_TEST_TO: z.string().min(1),
});

export interface Env {
  recipients: string[];
}

export function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(parsed.error.format());
    throw new Error("Invalid email send test environment variables");
  }

  const recipients = parsed.data.EMAIL_SEND_TEST_TO
    .split(",")
    .map((recipient) => recipient.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    throw new Error("EMAIL_SEND_TEST_TO must include at least one email address");
  }

  return { recipients };
}
