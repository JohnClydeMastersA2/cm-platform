import { randomUUID } from "node:crypto";
import { widgetMessageTypes, WidgetProcessingRequestedMessageSchema } from "@cm/messaging/widget";
import type { FastifyInstance } from "fastify";
import type { GetMessage } from "amqplib";
import {
  createWidget,
  deleteAllWidgets,
  listWidgets,
  markWidgetFailed,
  markWidgetProcessed,
  markWidgetQueued,
  markWidgetRetrying,
} from "./widget.repo.js";
import {
  CreateWidgetsBodySchema,
  DeadLetterMessageParamsSchema,
  ProcessWidgetsBodySchema,
  type Widget,
} from "./widget.schema.js";

type CreateWidgetsResponse = {
  widgets: Widget[];
  rabbitMqMessageCount: number;
  rabbitMqRetryMessageCount: number;
  rabbitMqDeadLetterMessageCount: number;
};

type ProcessWidgetsResponse = {
  requestedCount: number | null;
  processedCount: number;
  retryCount: number;
  failedCount: number;
  invalidCount: number;
  rabbitMqMessageCount: number;
  rabbitMqRetryMessageCount: number;
  rabbitMqDeadLetterMessageCount: number;
};

type WidgetDeadLetterMessage = {
  messageId: string;
  requestedAt: string;
  source: string;
  widgetId: number;
  widgetName: string;
  repairAttempt: boolean;
};

export async function widgetRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return {
      widgets: await listWidgets(app.db),
      rabbitMqMessageCount: await app.messaging.getWidgetProcessingMessageCount(),
      rabbitMqRetryMessageCount: await app.messaging.getWidgetRetryMessageCount(),
      rabbitMqDeadLetterMessageCount: await app.messaging.getWidgetDeadLetterMessageCount(),
      deadLetterMessages: await peekWidgetDeadLetterMessages(app),
    };
  });

  app.post("/", async (request, reply) => {
    const parsed = CreateWidgetsBodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid widget create request",
        details: parsed.error.flatten(),
      });
      return;
    }

    const widgets: Widget[] = [];

    for (let index = 0; index < parsed.data.count; index += 1) {
      const widget = await createWidget(app.db, buildWidgetName());
      const message = {
        messageType: widgetMessageTypes.processingRequested,
        messageId: randomUUID(),
        requestedAt: new Date().toISOString(),
        source: "svc-core.widgets",
        attempt: 1,
        widget: {
          widgetId: widget.widgetId,
          widgetName: widget.widgetName,
        },
      };

      await app.messaging.publishWidgetProcessingRequested(message);
      widgets.push(widget);
    }

    reply.code(201).send({
      widgets,
      rabbitMqMessageCount: await app.messaging.getWidgetProcessingMessageCount(),
      rabbitMqRetryMessageCount: await app.messaging.getWidgetRetryMessageCount(),
      rabbitMqDeadLetterMessageCount: await app.messaging.getWidgetDeadLetterMessageCount(),
    } satisfies CreateWidgetsResponse);
  });

  app.delete("/", async () => {
    await app.messaging.purgeWidgetQueues();
    await deleteAllWidgets(app.db);

    return {
      ok: true,
      widgets: await listWidgets(app.db),
      rabbitMqMessageCount: await app.messaging.getWidgetProcessingMessageCount(),
      rabbitMqRetryMessageCount: await app.messaging.getWidgetRetryMessageCount(),
      rabbitMqDeadLetterMessageCount: await app.messaging.getWidgetDeadLetterMessageCount(),
      deadLetterMessages: await peekWidgetDeadLetterMessages(app),
    };
  });

  app.post("/process", async (request, reply) => {
    const parsed = ProcessWidgetsBodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid widget process request",
        details: parsed.error.flatten(),
      });
      return;
    }

    const limit = parsed.data.count ?? null;
    let processedCount = 0;
    let retryCount = 0;
    let failedCount = 0;
    let invalidCount = 0;

    while (limit === null || processedCount + retryCount + failedCount + invalidCount < limit) {
      const message = await app.messaging.getNextWidgetProcessingMessage();

      if (!message) {
        break;
      }

      const parsedMessage = parseWidgetProcessingMessage(message.content);

      if (!parsedMessage) {
        invalidCount += 1;
        app.messaging.rejectWidgetProcessingMessage(message, false);
        continue;
      }

      try {
        if (shouldFailWidget(parsedMessage)) {
          const errorMessage = "Demo failure: widget IDs divisible by 3 fail unless repaired.";

          if (parsedMessage.attempt < 2) {
            const retryMessage = {
              ...parsedMessage,
              messageId: randomUUID(),
              requestedAt: new Date().toISOString(),
              source: "svc-core.widgets.retry",
              attempt: parsedMessage.attempt + 1,
            };

            await markWidgetRetrying(
              app.db,
              parsedMessage.widget.widgetId,
              retryMessage.messageId,
              `${errorMessage} Delayed retry scheduled.`,
            );
            await app.messaging.publishWidgetProcessingRetry(retryMessage);
            app.messaging.ackWidgetProcessingMessage(message);
            retryCount += 1;
            continue;
          }

          await markWidgetFailed(
            app.db,
            parsedMessage.widget.widgetId,
            parsedMessage.messageId,
            errorMessage,
          );
          failedCount += 1;
          app.messaging.rejectWidgetProcessingMessage(message, false);
          continue;
        }

        await markWidgetProcessed(
          app.db,
          parsedMessage.widget.widgetId,
          parsedMessage.messageId,
        );
        processedCount += 1;
        app.messaging.ackWidgetProcessingMessage(message);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown widget processing error";
        await markWidgetFailed(
          app.db,
          parsedMessage.widget.widgetId,
          parsedMessage.messageId,
          errorMessage,
        );
        app.messaging.rejectWidgetProcessingMessage(message, false);
        invalidCount += 1;
      }
    }

    return {
      requestedCount: limit,
      processedCount,
      retryCount,
      failedCount,
      invalidCount,
      rabbitMqMessageCount: await app.messaging.getWidgetProcessingMessageCount(),
      rabbitMqRetryMessageCount: await app.messaging.getWidgetRetryMessageCount(),
      rabbitMqDeadLetterMessageCount: await app.messaging.getWidgetDeadLetterMessageCount(),
    } satisfies ProcessWidgetsResponse;
  });

  app.post("/dead-letter/:messageId/replay", async (request, reply) => {
    const parsed = DeadLetterMessageParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid dead-letter message id",
        details: parsed.error.flatten(),
      });
      return;
    }

    const message = await takeWidgetDeadLetterMessage(app, parsed.data.messageId);

    if (!message) {
      reply.code(404).send({ error: "Dead-letter message not found" });
      return;
    }

    const replayMessage = {
      ...message,
      messageId: randomUUID(),
      requestedAt: new Date().toISOString(),
      source: "svc-core.widgets.replay",
      attempt: message.attempt,
      repairAttempt: false,
    };

    await markWidgetQueued(app.db, replayMessage.widget.widgetId, replayMessage.messageId);
    await app.messaging.publishWidgetProcessingRequested(replayMessage);

    return {
      ok: true,
      message: replayMessage,
      rabbitMqMessageCount: await app.messaging.getWidgetProcessingMessageCount(),
      rabbitMqRetryMessageCount: await app.messaging.getWidgetRetryMessageCount(),
      rabbitMqDeadLetterMessageCount: await app.messaging.getWidgetDeadLetterMessageCount(),
    };
  });

  app.post("/dead-letter/:messageId/repair", async (request, reply) => {
    const parsed = DeadLetterMessageParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid dead-letter message id",
        details: parsed.error.flatten(),
      });
      return;
    }

    const message = await takeWidgetDeadLetterMessage(app, parsed.data.messageId);

    if (!message) {
      reply.code(404).send({ error: "Dead-letter message not found" });
      return;
    }

    const repairedMessage = {
      ...message,
      messageId: randomUUID(),
      requestedAt: new Date().toISOString(),
      source: "svc-core.widgets.repair",
      attempt: 1,
      repairAttempt: true,
    };

    await markWidgetQueued(app.db, repairedMessage.widget.widgetId, repairedMessage.messageId);
    await app.messaging.publishWidgetProcessingRequested(repairedMessage);

    return {
      ok: true,
      message: repairedMessage,
      rabbitMqMessageCount: await app.messaging.getWidgetProcessingMessageCount(),
      rabbitMqRetryMessageCount: await app.messaging.getWidgetRetryMessageCount(),
      rabbitMqDeadLetterMessageCount: await app.messaging.getWidgetDeadLetterMessageCount(),
    };
  });
}

function buildWidgetName(): string {
  return `Widget ${new Date().toISOString()}`;
}

function parseWidgetProcessingMessage(content: Buffer) {
  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(content.toString("utf8")) as unknown;
  } catch {
    return null;
  }

  const parsed = WidgetProcessingRequestedMessageSchema.safeParse(parsedJson);

  return parsed.success ? parsed.data : null;
}

function shouldFailWidget(message: ReturnType<typeof parseWidgetProcessingMessage>): boolean {
  return Boolean(
    message
      && message.widget.widgetId % 3 === 0
      && !message.repairAttempt,
  );
}

async function peekWidgetDeadLetterMessages(
  app: FastifyInstance,
): Promise<WidgetDeadLetterMessage[]> {
  const pendingMessages: GetMessage[] = [];
  const deadLetterMessages: WidgetDeadLetterMessage[] = [];

  try {
    for (let index = 0; index < 50; index += 1) {
      const message = await app.messaging.getNextWidgetDeadLetterMessage();

      if (!message) {
        break;
      }

      pendingMessages.push(message);
      const parsed = parseWidgetProcessingMessage(message.content);

      if (parsed) {
        deadLetterMessages.push(toDeadLetterMessage(parsed));
      }
    }
  } finally {
    for (const message of pendingMessages) {
      app.messaging.rejectWidgetDeadLetterMessage(message, true);
    }
  }

  return deadLetterMessages;
}

async function takeWidgetDeadLetterMessage(
  app: FastifyInstance,
  messageId: string,
) {
  const pendingMessages: GetMessage[] = [];

  try {
    for (let index = 0; index < 200; index += 1) {
      const message = await app.messaging.getNextWidgetDeadLetterMessage();

      if (!message) {
        return null;
      }

      const parsed = parseWidgetProcessingMessage(message.content);

      if (parsed?.messageId === messageId) {
        app.messaging.ackWidgetDeadLetterMessage(message);
        return parsed;
      }

      pendingMessages.push(message);
    }

    return null;
  } finally {
    for (const message of pendingMessages) {
      app.messaging.rejectWidgetDeadLetterMessage(message, true);
    }
  }
}

function toDeadLetterMessage(
  message: NonNullable<ReturnType<typeof parseWidgetProcessingMessage>>,
): WidgetDeadLetterMessage {
  return {
    messageId: message.messageId,
    requestedAt: message.requestedAt,
    source: message.source,
    widgetId: message.widget.widgetId,
    widgetName: message.widget.widgetName,
    repairAttempt: message.repairAttempt ?? false,
  };
}
