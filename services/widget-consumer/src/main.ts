import "dotenv/config";
import { setTimeout as delay } from "node:timers/promises";
import amqp from "amqplib";
import dotenv from "dotenv";
import { createLogger } from "@cm/logging";
import {
  assertWidgetConsumerTopology,
  WidgetConsumerProcessingRequestedMessageSchema,
  widgetConsumerQueues,
} from "@cm/messaging/widget-consumer";
import { loadEnv } from "./config/env.js";
import { connectDb } from "./db.js";
import {
  markWidgetFailed,
  markWidgetProcessed,
  markWidgetProcessing,
} from "./widget-consumer.repo.js";

dotenv.config({ path: "../../apps/svc-core/.env" });

const env = loadEnv();
const logger = createLogger({
  name: env.WIDGET_CONSUMER_NAME,
  level: env.LOG_LEVEL,
  env: env.NODE_ENV,
});

async function main(): Promise<void> {
  const db = await connectDb(env);
  const connection = await amqp.connect(env.RABBITMQ_URL);
  const channel = await connection.createChannel();

  await assertWidgetConsumerTopology(channel);
  await channel.prefetch(1);

  logger.info(
    {
      queue: widgetConsumerQueues.processing,
      consumerName: env.WIDGET_CONSUMER_NAME,
      processingSeconds: env.WIDGET_CONSUMER_PROCESSING_SECONDS,
    },
    "Widget consumer is ready",
  );

  await channel.consume(widgetConsumerQueues.processing, async (message) => {
    if (!message) {
      return;
    }

    const parsed = parseWidgetConsumerMessage(message.content);

    if (!parsed) {
      channel.reject(message, false);
      return;
    }

    const processingContext = {
      widgetId: parsed.widget.widgetId,
      consumerName: env.WIDGET_CONSUMER_NAME,
      processingSeconds: env.WIDGET_CONSUMER_PROCESSING_SECONDS,
      messageId: parsed.messageId,
    };

    try {
      await markWidgetProcessing(db, processingContext);

      if (env.WIDGET_CONSUMER_PROCESSING_SECONDS > 0) {
        await delay(env.WIDGET_CONSUMER_PROCESSING_SECONDS * 1000);
      }

      await markWidgetProcessed(db, processingContext);

      logger.info(
        {
          messageId: parsed.messageId,
          widgetId: parsed.widget.widgetId,
          widgetName: parsed.widget.widgetName,
        },
        "Widget processed",
      );

      channel.ack(message);
    } catch (err) {
      logger.error(
        {
          err,
          messageId: parsed.messageId,
          widgetId: parsed.widget.widgetId,
        },
        "Widget processing failed",
      );

      await markWidgetFailed(db, {
        ...processingContext,
        error: err instanceof Error ? err.message : "Unknown processing error",
      });
      channel.nack(message, false, false);
    }
  });

  const shutdown = async () => {
    logger.info("Widget consumer shutting down");
    await channel.close();
    await connection.close();
    await db.end();
  };

  process.once("SIGINT", () => {
    void shutdown().then(() => process.exit(0));
  });

  process.once("SIGTERM", () => {
    void shutdown().then(() => process.exit(0));
  });
}

function parseWidgetConsumerMessage(content: Buffer) {
  try {
    const parsedJson = JSON.parse(content.toString("utf8")) as unknown;
    const parsed = WidgetConsumerProcessingRequestedMessageSchema.safeParse(parsedJson);

    if (!parsed.success) {
      logger.warn(
        {
          details: parsed.error.flatten(),
        },
        "Rejecting invalid widget consumer request",
      );
      return null;
    }

    return parsed.data;
  } catch (err) {
    logger.warn({ err }, "Rejecting malformed widget consumer request");
    return null;
  }
}

main().catch((err: unknown) => {
  logger.error({ err }, "Widget consumer failed to start");
  process.exitCode = 1;
});
