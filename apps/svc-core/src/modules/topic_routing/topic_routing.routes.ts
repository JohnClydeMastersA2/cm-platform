import { randomUUID } from "node:crypto";
import {
  topicRoutingMessageTypes,
  topicRoutingSampleRoutingKeys,
  type TopicRoutingDemoMessage,
} from "@cm/messaging/topic-routing";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const PublishTopicRoutingBodySchema = z.object({
  routingKey: z.enum(topicRoutingSampleRoutingKeys).or(z.string().min(1).max(200)),
});

export async function topicRoutingRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return buildOverview(app);
  });

  app.post("/", async (request, reply) => {
    const parsed = PublishTopicRoutingBodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid topic routing publish request",
        details: parsed.error.flatten(),
      });
      return;
    }

    const message: TopicRoutingDemoMessage = {
      messageType: topicRoutingMessageTypes.eventPublished,
      messageId: randomUUID(),
      requestedAt: new Date().toISOString(),
      source: "svc-core.topic-routing-demo",
      routingKey: parsed.data.routingKey,
      label: toEventLabel(parsed.data.routingKey),
    };

    await app.messaging.publishTopicRoutingDemoMessage(message);
    reply.code(201).send(await buildOverview(app));
  });

  app.delete("/", async () => {
    await app.messaging.purgeTopicRoutingQueues();
    return buildOverview(app);
  });
}

async function buildOverview(app: FastifyInstance) {
  return {
    sampleRoutingKeys: topicRoutingSampleRoutingKeys,
    queues: await app.messaging.getTopicRoutingQueueOverviews(),
  };
}

function toEventLabel(routingKey: string): string {
  return routingKey
    .split(".")
    .map((part) => part.replace(/_/g, " "))
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
