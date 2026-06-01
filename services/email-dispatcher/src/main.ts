import "dotenv/config";
import amqp from "amqplib";
import { createLogger } from "@cm/logging";
import { sendEmail } from "@cm/email";
import type { SendEmailRequest } from "@cm/email";
import { loadEnv } from "./config/env.js";
import {
  assertEmailTopology,
  EmailVerificationRequestedMessageSchema,
  emailQueues,
} from "@cm/messaging/email";

const env = loadEnv();
const logger = createLogger({
  name: "email-dispatcher",
  level: env.LOG_LEVEL,
  env: env.NODE_ENV,
});

async function main(): Promise<void> {
  const connection = await amqp.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await assertEmailTopology(channel);
  await channel.prefetch(env.EMAIL_DISPATCHER_PREFETCH);

  logger.info(
    {
      queue: emailQueues.dispatch,
      deadLetterQueue: emailQueues.deadLetter,
    },
    "Email dispatcher topology is ready",
  );

  await channel.consume(emailQueues.dispatch, async (message) => {
    if (!message) {
      return;
    }

    const parsed = parseEmailVerificationRequested(message.content);

    if (!parsed) {
      channel.reject(message, false);
      return;
    }

    try {
      const result = await sendEmail(toSendEmailRequest(parsed.email));

      logger.info(
        {
          messageId: parsed.messageId,
          providerMessageId: result.messageId,
          accepted: result.accepted,
          rejected: result.rejected,
        },
        "Email send request dispatched",
      );

      channel.ack(message);
    } catch (err) {
      logger.error(
        {
          err,
          messageId: parsed.messageId,
        },
        "Email send request failed",
      );

      channel.nack(message, false, false);
    }
  });

  const shutdown = async () => {
    logger.info("Email dispatcher shutting down");
    await channel.close();
    await connection.close();
  };

  process.once("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });
}

function parseEmailVerificationRequested(content: Buffer) {
  try {
    const parsedJson = JSON.parse(content.toString("utf8")) as unknown;
    const parsed = EmailVerificationRequestedMessageSchema.safeParse(parsedJson);

    if (!parsed.success) {
      logger.warn(
        {
          details: parsed.error.flatten(),
        },
        "Rejecting invalid email send request",
      );
      return null;
    }

    return parsed.data;
  } catch (err) {
    logger.warn({ err }, "Rejecting malformed email send request");
    return null;
  }
}

function toSendEmailRequest(
  email: NonNullable<ReturnType<typeof parseEmailVerificationRequested>>["email"],
): SendEmailRequest {
  return {
    to: email.to,
    subject: email.subject,
    html: email.html,
    ...(email.text ? { text: email.text } : {}),
    ...(email.from ? { from: email.from } : {}),
    ...(email.replyTo ? { replyTo: email.replyTo } : {}),
    ...(email.cc ? { cc: email.cc } : {}),
    ...(email.bcc ? { bcc: email.bcc } : {}),
  };
}

main().catch((err: unknown) => {
  logger.error({ err }, "Email dispatcher failed to start");
  process.exitCode = 1;
});
