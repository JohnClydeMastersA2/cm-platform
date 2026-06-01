import { once } from "node:events";
import type { Channel, ConfirmChannel } from "amqplib";
import { z } from "zod";

export const topicRoutingExchangeName = "cm.topic-demo";

export const topicRoutingQueues = {
  audit: "cm.topic-demo.audit",
  email: "cm.topic-demo.email",
  widgets: "cm.topic-demo.widgets",
  important: "cm.topic-demo.important",
  v1: "cm.topic-demo.v1",
} as const;

export const topicRoutingBindings = [
  {
    key: "audit",
    queue: topicRoutingQueues.audit,
    bindingPattern: "#",
    description: "Receives every topic demo message.",
  },
  {
    key: "email",
    queue: topicRoutingQueues.email,
    bindingPattern: "email.#",
    description: "Receives messages whose routing key starts with email.",
  },
  {
    key: "widgets",
    queue: topicRoutingQueues.widgets,
    bindingPattern: "widget.#",
    description: "Receives messages whose routing key starts with widget.",
  },
  {
    key: "important",
    queue: topicRoutingQueues.important,
    bindingPattern: "*.important.v1",
    description: "Receives v1 important messages from one-word domains.",
  },
  {
    key: "v1",
    queue: topicRoutingQueues.v1,
    bindingPattern: "#.v1",
    description: "Receives messages whose routing key ends with v1.",
  },
] as const;

export const topicRoutingMessageTypes = {
  eventPublished: "topic_demo.event_published.v1",
} as const;

export const topicRoutingSampleRoutingKeys = [
  "email.verification.requested.v1",
  "email.password_reset.requested.v1",
  "widget.created.v1",
  "widget.important.v1",
  "billing.invoice.paid.v1",
] as const;

export const TopicRoutingDemoMessageSchema = z.object({
  messageType: z.literal(topicRoutingMessageTypes.eventPublished),
  messageId: z.uuid(),
  requestedAt: z.string().datetime(),
  source: z.string().min(1),
  routingKey: z.string().min(1),
  label: z.string().min(1),
});

export type TopicRoutingDemoMessage = z.infer<typeof TopicRoutingDemoMessageSchema>;

export async function assertTopicRoutingTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(topicRoutingExchangeName, "topic", { durable: true });

  for (const binding of topicRoutingBindings) {
    await channel.assertQueue(binding.queue, { durable: true });
    await channel.bindQueue(
      binding.queue,
      topicRoutingExchangeName,
      binding.bindingPattern,
    );
  }
}

export async function publishTopicRoutingDemoMessage(
  channel: ConfirmChannel,
  message: TopicRoutingDemoMessage,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const accepted = channel.publish(topicRoutingExchangeName, message.routingKey, payload, {
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
