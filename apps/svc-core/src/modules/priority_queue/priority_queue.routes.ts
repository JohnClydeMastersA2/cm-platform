import { randomUUID } from "node:crypto";
import {
  priorityQueueLevels,
  priorityQueueMessageTypes,
  PriorityQueueProcessingRequestedMessageSchema,
  type PriorityQueueProcessingRequestedMessage,
} from "@cm/messaging/priority-queue";
import type { GetMessage } from "amqplib";
import type { FastifyInstance } from "fastify";
import { z } from "zod";

const PublishPriorityQueueBodySchema = z.object({
  priority: z.number().int().min(0).max(10),
  count: z.number().int().positive().max(25).default(1),
});

const ProcessPriorityQueueBodySchema = z.object({
  count: z.number().int().positive().max(25).default(1),
});

type ProcessedPriorityQueueMessage = PriorityQueueProcessingRequestedMessage & {
  processedSequence: number;
  processedAt: string;
};

let publishSequence = 0;
let processedSequence = 0;
const publishedMessages: PriorityQueueProcessingRequestedMessage[] = [];
const processedMessages: ProcessedPriorityQueueMessage[] = [];

export async function priorityQueueRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return buildOverview(app);
  });

  app.post("/", async (request, reply) => {
    const parsed = PublishPriorityQueueBodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid priority queue publish request",
        details: parsed.error.flatten(),
      });
      return;
    }

    for (let index = 0; index < parsed.data.count; index += 1) {
      publishSequence += 1;
      const requestedAt = new Date().toISOString();
      const message: PriorityQueueProcessingRequestedMessage = {
        messageType: priorityQueueMessageTypes.processingRequested,
        messageId: randomUUID(),
        requestedAt,
        source: "svc-core.priority-queue-demo",
        jobName: `${priorityLabel(parsed.data.priority)} Job #${publishSequence}`,
        publishSequence,
        priority: parsed.data.priority,
      };

      await app.messaging.publishPriorityQueueProcessingRequested(message);
      publishedMessages.push(message);

      if (publishedMessages.length > 25) {
        publishedMessages.shift();
      }
    }

    reply.code(201).send(await buildOverview(app));
  });

  app.post("/process", async (request, reply) => {
    const parsed = ProcessPriorityQueueBodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid priority queue process request",
        details: parsed.error.flatten(),
      });
      return;
    }

    let processedCount = 0;

    for (let index = 0; index < parsed.data.count; index += 1) {
      const message = await app.messaging.getNextPriorityQueueMessage();

      if (!message) {
        break;
      }

      const parsedMessage = parsePriorityQueueMessage(message);

      if (!parsedMessage) {
        app.messaging.rejectPriorityQueueMessage(message, false);
        continue;
      }

      app.messaging.ackPriorityQueueMessage(message);
      processedSequence += 1;
      processedMessages.push({
        ...parsedMessage,
        processedSequence,
        processedAt: new Date().toISOString(),
      });

      if (processedMessages.length > 25) {
        processedMessages.shift();
      }

      processedCount += 1;
    }

    reply.send({
      processedCount,
      ...(await buildOverview(app)),
    });
  });

  app.delete("/", async () => {
    await app.messaging.purgePriorityQueue();
    publishSequence = 0;
    processedSequence = 0;
    publishedMessages.splice(0);
    processedMessages.splice(0);
    return buildOverview(app);
  });
}

async function buildOverview(app: FastifyInstance) {
  return {
    levels: priorityQueueLevels,
    queue: await app.messaging.getPriorityQueueOverview(),
    publishedMessages,
    processedMessages,
  };
}

function parsePriorityQueueMessage(
  message: GetMessage,
): PriorityQueueProcessingRequestedMessage | null {
  try {
    const parsedJson = JSON.parse(message.content.toString("utf8")) as unknown;
    const parsed = PriorityQueueProcessingRequestedMessageSchema.safeParse(parsedJson);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function priorityLabel(priority: number): string {
  const level = priorityQueueLevels.find((candidate) => candidate.priority === priority);
  return level?.label ?? `Priority ${priority}`;
}
