import type { FastifyInstance } from "fastify";
import { queryEmailWebhookEvents } from "./email_webhook_event.repo.js";
import {
  EmailWebhookEventQuerySchema,
  type EmailWebhookEventDocument,
} from "./email_webhook_event.schema.js";

export async function emailWebhookEventRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    const parsed = EmailWebhookEventQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid webhook event query",
        details: parsed.error.flatten(),
      });
      return;
    }

    const result = await queryEmailWebhookEvents(app.mongoDb, parsed.data);

    return {
      ...result,
      events: result.events.map(toPublicEvent),
    };
  });
}

function toPublicEvent(event: EmailWebhookEventDocument) {
  return {
    id: event._id?.toHexString() ?? "",
    provider: event.provider,
    eventType: event.eventType,
    emailId: event.emailId ?? null,
    recipients: event.recipients.map(maskEmail),
    sender: event.sender ? sanitizeValue(event.sender) : null,
    subject: event.subject ?? null,
    receivedAt: event.receivedAt.toISOString(),
    source: event.source,
    payloadAvailable: event.payloadAvailable,
    payload: event.payload ? sanitizeValue(event.payload) : null,
    processing: event.processing,
  };
}

function sanitizeValue(value: unknown, key?: string): unknown {
  if (key && isSensitiveKey(key)) {
    return "[redacted]";
  }

  if (typeof value === "string") {
    return value.replace(
      /([A-Z0-9._%+-]+)@([A-Z0-9.-]+\.[A-Z]{2,})/gi,
      (_, local: string, domain: string) => `${maskLocalPart(local)}@${domain}`,
    );
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([itemKey, item]) => [
        itemKey,
        sanitizeValue(item, itemKey),
      ]),
    );
  }

  return value;
}

function isSensitiveKey(key: string): boolean {
  return /password|secret|token|authorization|api[-_]?key/i.test(key);
}

function maskEmail(value: string): string {
  const separator = value.lastIndexOf("@");

  if (separator <= 0) {
    return value;
  }

  return `${maskLocalPart(value.slice(0, separator))}${value.slice(separator)}`;
}

function maskLocalPart(local: string): string {
  if (local.length <= 2) {
    return `${local[0] ?? "*"}*`;
  }

  return `${local[0]}***${local.at(-1)}`;
}
