import type { ObjectId } from "mongodb";
import { z } from "zod";

export const emailWebhookEventCollectionName = "emailWebhookEvents";

export type EmailWebhookEventSource = "webhook" | "imported-jsonl";
export type EmailWebhookProcessingStatus = "acknowledged" | "failed";

export type EmailWebhookEventDocument = {
  _id?: ObjectId;
  provider: string;
  providerEventId?: string;
  eventType: string;
  emailId?: string;
  recipients: string[];
  sender?: string;
  subject?: string;
  receivedAt: Date;
  source: EmailWebhookEventSource;
  payloadAvailable: boolean;
  payload?: Record<string, unknown>;
  processing: {
    status: EmailWebhookProcessingStatus;
    message?: string;
  };
};

export const EmailWebhookEventQuerySchema = z.object({
  q: z.string().trim().max(200).default(""),
  eventType: z.string().trim().max(100).default(""),
  source: z.enum(["", "webhook", "imported-jsonl"]).default(""),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(5).max(50).default(20),
});

export type EmailWebhookEventQuery = z.infer<typeof EmailWebhookEventQuerySchema>;
