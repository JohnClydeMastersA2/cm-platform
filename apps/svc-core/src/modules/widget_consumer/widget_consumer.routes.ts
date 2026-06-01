import { randomUUID } from "node:crypto";
import {
  widgetConsumerMessageTypes,
  type WidgetConsumerProcessingRequestedMessage,
} from "@cm/messaging/widget-consumer";
import type { FastifyInstance } from "fastify";
import {
  createWidgetConsumerItem,
  deleteAllWidgetConsumerItems,
  listWidgetConsumerItems,
} from "./widget_consumer.repo.js";
import {
  CreateWidgetConsumerItemsBodySchema,
  type WidgetConsumerDemoItem,
} from "./widget_consumer.schema.js";

type WidgetConsumerOverview = {
  widgets: WidgetConsumerDemoItem[];
  rabbitMqMessageCount: number;
  processedBy: Record<string, number>;
};

export async function widgetConsumerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return buildOverview(app);
  });

  app.post("/", async (request, reply) => {
    const parsed = CreateWidgetConsumerItemsBodySchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid competing consumer create request",
        details: parsed.error.flatten(),
      });
      return;
    }

    for (let index = 0; index < parsed.data.count; index += 1) {
      const widget = await createWidgetConsumerItem(app.db, buildWidgetName());
      const message: WidgetConsumerProcessingRequestedMessage = {
        messageType: widgetConsumerMessageTypes.processingRequested,
        messageId: randomUUID(),
        requestedAt: new Date().toISOString(),
        source: "svc-core.widget-consumer-demo",
        widget: {
          widgetId: widget.widgetId,
          widgetName: widget.widgetName,
        },
      };

      await app.messaging.publishWidgetConsumerProcessingRequested(message);
    }

    reply.code(201).send(await buildOverview(app));
  });

  app.delete("/", async () => {
    await app.messaging.purgeWidgetConsumerQueue();
    await deleteAllWidgetConsumerItems(app.db);
    return buildOverview(app);
  });
}

async function buildOverview(app: FastifyInstance): Promise<WidgetConsumerOverview> {
  const widgets = await listWidgetConsumerItems(app.db);
  const processedBy = widgets.reduce<Record<string, number>>((acc, widget) => {
    if (widget.processedBy) {
      acc[widget.processedBy] = (acc[widget.processedBy] ?? 0) + 1;
    }

    return acc;
  }, {});

  return {
    widgets,
    rabbitMqMessageCount: await app.messaging.getWidgetConsumerMessageCount(),
    processedBy,
  };
}

function buildWidgetName(): string {
  return `Consumer Widget ${new Date().toISOString()}`;
}
