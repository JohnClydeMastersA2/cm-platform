import { once } from "node:events";
import type { Channel, ConfirmChannel } from "amqplib";
import { z } from "zod";

export const priorityQueueExchangeName = "cm.priority-demo";

export const priorityQueueQueues = {
  processing: "cm.priority-demo.processing",
} as const;

export const priorityQueueRoutingKeys = {
  processingRequested: "priority_demo.processing_requested.v1",
} as const;

export const priorityQueueMessageTypes = {
  processingRequested: "priority_demo.processing_requested.v1",
} as const;

export const priorityQueueMaxPriority = 10;

export const priorityQueueLevels = [
  { label: "Normal", priority: 1 },
  { label: "High", priority: 5 },
  { label: "Urgent", priority: 9 },
] as const;

export const PriorityQueueProcessingRequestedMessageSchema = z.object({
  messageType: z.literal(priorityQueueMessageTypes.processingRequested),
  messageId: z.uuid(),
  requestedAt: z.string().datetime(),
  source: z.string().min(1),
  jobName: z.string().min(1),
  publishSequence: z.number().int().positive(),
  priority: z.number().int().min(0).max(priorityQueueMaxPriority),
});

export type PriorityQueueProcessingRequestedMessage = z.infer<
  typeof PriorityQueueProcessingRequestedMessageSchema
>;

export async function assertPriorityQueueTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(priorityQueueExchangeName, "direct", { durable: true });

  await channel.assertQueue(priorityQueueQueues.processing, {
    durable: true,
    arguments: {
      "x-max-priority": priorityQueueMaxPriority,
    },
  });

  await channel.bindQueue(
    priorityQueueQueues.processing,
    priorityQueueExchangeName,
    priorityQueueRoutingKeys.processingRequested,
  );
}

export async function publishPriorityQueueProcessingRequested(
  channel: ConfirmChannel,
  message: PriorityQueueProcessingRequestedMessage,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const accepted = channel.publish(
    priorityQueueExchangeName,
    priorityQueueRoutingKeys.processingRequested,
    payload,
    {
      appId: message.source,
      contentType: "application/json",
      contentEncoding: "utf-8",
      deliveryMode: 2,
      messageId: message.messageId,
      persistent: true,
      priority: message.priority,
      timestamp: Math.floor(Date.parse(message.requestedAt) / 1000),
      type: message.messageType,
    },
  );

  if (!accepted) {
    await once(channel, "drain");
  }

  await channel.waitForConfirms();
}
