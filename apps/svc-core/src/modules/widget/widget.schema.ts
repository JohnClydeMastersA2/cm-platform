import { z } from "zod";

export type WidgetStatus = "queued" | "retrying" | "processing" | "processed" | "failed";

export type Widget = {
  widgetId: number;
  widgetName: string;
  status: WidgetStatus;
  createdAt: Date;
  queuedAt: Date | null;
  processingStartedAt: Date | null;
  processedAt: Date | null;
  processCount: number;
  lastMessageId: string | null;
  lastError: string | null;
};

export const CreateWidgetsBodySchema = z.object({
  count: z.coerce.number().int().positive().max(25).default(1),
});

export const ProcessWidgetsBodySchema = z.object({
  count: z.coerce.number().int().positive().max(100).optional(),
});

export const DeadLetterMessageParamsSchema = z.object({
  messageId: z.uuid(),
});
