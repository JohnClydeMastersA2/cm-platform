import { z } from "zod";

export type EmailDelivery = {
  emailDeliveryId: number;
  provider: string;
  providerEmailId: string;
  recipientEmail: string;
  subject: string | null;
  senderEmail: string | null;
  latestEventType: string | null;
  latestReceivedAt: Date | null;
  eventCount: number;
};

export type EmailDeliveryEvent = {
  emailDeliveryEventId: number;
  emailDeliveryId: number;
  eventType: string;
  eventPayload: string | null;
  receivedAt: Date;
};

export const EmailDeliveryParamsSchema = z.object({
  emailDeliveryId: z.coerce.number().int().positive(),
});
