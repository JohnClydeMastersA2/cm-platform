import { once } from "node:events";
import type { Channel, ConfirmChannel } from "amqplib";
import { z } from "zod";

export const widgetExchangeName = "cm.widget";

export const widgetQueues = {
  processing: "cm.widget.processing",
  retry: "cm.widget.processing.retry",
  deadLetter: "cm.widget.processing.dlq",
} as const;

export const widgetRetryDelayMs = 10_000;

// RabbitMQ routing keys are broker-level addresses used to route published messages to queues.
export const widgetRoutingKeys = {
  processingRequested: "widget.processing_requested.v1",
} as const;

export const widgetMessageTypes = {
  processingRequested: "widget.processing_requested.v1",
} as const;

export const WidgetProcessingRequestedMessageSchema = z.object({
  messageType: z.literal(widgetMessageTypes.processingRequested),
  messageId: z.uuid(),
  requestedAt: z.string().datetime(),
  source: z.string().min(1),
  widget: z.object({
    widgetId: z.number().int().positive(),
    widgetName: z.string().min(1),
  }),
  attempt: z.number().int().positive().default(1),
  repairAttempt: z.boolean().optional(),
});

export type WidgetProcessingRequestedMessage = z.infer<
  typeof WidgetProcessingRequestedMessageSchema
>;

export async function assertWidgetTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(widgetExchangeName, "topic", { durable: true });

  await channel.assertQueue(widgetQueues.deadLetter, { durable: true });

  await channel.assertQueue(widgetQueues.retry, {
    durable: true,
    arguments: {
      "x-message-ttl": widgetRetryDelayMs,
      "x-dead-letter-exchange": widgetExchangeName,
      "x-dead-letter-routing-key": widgetRoutingKeys.processingRequested,
    },
  });

  await channel.assertQueue(widgetQueues.processing, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": widgetQueues.deadLetter,
    },
  });

  await channel.bindQueue(
    widgetQueues.processing,
    widgetExchangeName,
    widgetRoutingKeys.processingRequested,
  );
}

export async function publishWidgetProcessingRequested(
  channel: ConfirmChannel,
  message: WidgetProcessingRequestedMessage,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const accepted = channel.publish(
    widgetExchangeName,
    widgetRoutingKeys.processingRequested,
    payload,
    {
      appId: message.source,
      contentType: "application/json",
      contentEncoding: "utf-8",
      deliveryMode: 2,
      messageId: message.messageId,
      persistent: true,
      timestamp: Math.floor(Date.parse(message.requestedAt) / 1000),
      type: message.messageType,
    },
  );

  if (!accepted) {
    await once(channel, "drain");
  }

  await channel.waitForConfirms();
}

export async function publishWidgetProcessingRetry(
  channel: ConfirmChannel,
  message: WidgetProcessingRequestedMessage,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const accepted = channel.sendToQueue(widgetQueues.retry, payload, {
    appId: message.source,
    contentType: "application/json",
    contentEncoding: "utf-8",
    deliveryMode: 2,
    messageId: message.messageId,
    persistent: true,
    timestamp: Math.floor(Date.parse(message.requestedAt) / 1000),
    type: message.messageType,
  });

  if (!accepted) {
    await once(channel, "drain");
  }

  await channel.waitForConfirms();
}
