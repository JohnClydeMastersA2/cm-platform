import { once } from "node:events";
import type { Channel, ConfirmChannel } from "amqplib";
import { z } from "zod";

export const widgetConsumerExchangeName = "cm.widget.consumer-demo";

export const widgetConsumerQueues = {
  processing: "cm.widget.consumer-demo.processing",
} as const;

// RabbitMQ routing keys are broker-level addresses used to route published messages to queues.
export const widgetConsumerRoutingKeys = {
  processingRequested: "widget.consumer_demo.processing_requested.v1",
} as const;

export const widgetConsumerMessageTypes = {
  processingRequested: "widget.consumer_demo.processing_requested.v1",
} as const;

export const WidgetConsumerProcessingRequestedMessageSchema = z.object({
  messageType: z.literal(widgetConsumerMessageTypes.processingRequested),
  messageId: z.uuid(),
  requestedAt: z.string().datetime(),
  source: z.string().min(1),
  widget: z.object({
    widgetId: z.number().int().positive(),
    widgetName: z.string().min(1),
  }),
});

export type WidgetConsumerProcessingRequestedMessage = z.infer<
  typeof WidgetConsumerProcessingRequestedMessageSchema
>;

export async function assertWidgetConsumerTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(widgetConsumerExchangeName, "topic", { durable: true });

  await channel.assertQueue(widgetConsumerQueues.processing, {
    durable: true,
  });

  await channel.bindQueue(
    widgetConsumerQueues.processing,
    widgetConsumerExchangeName,
    widgetConsumerRoutingKeys.processingRequested,
  );
}

export async function publishWidgetConsumerProcessingRequested(
  channel: ConfirmChannel,
  message: WidgetConsumerProcessingRequestedMessage,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const accepted = channel.publish(
    widgetConsumerExchangeName,
    widgetConsumerRoutingKeys.processingRequested,
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
