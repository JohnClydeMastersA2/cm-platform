import { z } from "zod";

export type WidgetConsumerStatus = "queued" | "processing" | "processed" | "failed";

export type WidgetConsumerDemoItem = {
  widgetId: number;
  widgetName: string;
  status: WidgetConsumerStatus;
  createdAt: Date;
  queuedAt: Date | null;
  processingStartedAt: Date | null;
  processedAt: Date | null;
  processedBy: string | null;
  processingSeconds: number | null;
  lastMessageId: string | null;
  lastError: string | null;
};

export const CreateWidgetConsumerItemsBodySchema = z.object({
  count: z.coerce.number().int().positive().max(100).default(10),
});
