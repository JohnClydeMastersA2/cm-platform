import type { FastifyBaseLogger, FastifyPluginAsync } from "fastify";
import { recordEmailWebhookEvent } from "../../modules/email_webhook_event/email_webhook_event.repo.js";

type EmailEventPayload = Record<string, unknown> & {
  id?: string;
  type?: string;
  data?: unknown;
};

type EmailEventLogEntry = {
  receivedAt: string;
  eventType?: string;
  emailId?: string;
  from?: string;
  subject?: string;
  to?: string[];
};

export const emailEventsWebhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/email-events", async (request) => {
    const event = request.body as EmailEventPayload;
    const logEntry = createEmailEventLogEntry(event);

    request.log.info(
      {
        eventType: logEntry.eventType,
        emailId: logEntry.emailId,
        to: logEntry.to,
      },
      "Received email events webhook",
    );

    await recordEmailWebhookEvent(app.mongoDb, {
      provider: "resend",
      ...(event.id ? { providerEventId: event.id } : {}),
      eventType: logEntry.eventType ?? "unknown",
      ...(logEntry.emailId ? { emailId: logEntry.emailId } : {}),
      recipients: logEntry.to ?? [],
      ...(logEntry.from ? { sender: logEntry.from } : {}),
      ...(logEntry.subject ? { subject: logEntry.subject } : {}),
      receivedAt: new Date(logEntry.receivedAt),
      source: "webhook",
      payloadAvailable: true,
      payload: event,
      processing: {
        status: "acknowledged",
      },
    });
    await handleEmailEvent(event, request.log);

    return { ok: true };
  });
};

async function handleEmailEvent(
  event: EmailEventPayload,
  log: FastifyBaseLogger,
): Promise<void> {
  switch (event.type) {
    case "email.bounced":
      await handleEmailBounced(event, log);
      return;
    case "email.complained":
      await handleEmailComplained(event, log);
      return;
    case "email.delivery_delayed":
      await handleEmailDeliveryDelayed(event, log);
      return;
    case "email.delivered":
    case "email.failed":
    case "email.sent":
    case "email.suppressed":
      log.info({ eventType: event.type }, "Email event acknowledged");
      return;
    default:
      log.info({ eventType: event.type }, "Unhandled email event type acknowledged");
      return;
  }
}

async function handleEmailBounced(
  event: EmailEventPayload,
  log: FastifyBaseLogger,
): Promise<void> {
  log.warn(createEmailEventLogEntry(event), "Email bounced");
}

async function handleEmailComplained(
  event: EmailEventPayload,
  log: FastifyBaseLogger,
): Promise<void> {
  log.warn(createEmailEventLogEntry(event), "Email recipient complained");
}

async function handleEmailDeliveryDelayed(
  event: EmailEventPayload,
  log: FastifyBaseLogger,
): Promise<void> {
  log.warn(createEmailEventLogEntry(event), "Email delivery delayed");
}

function createEmailEventLogEntry(event: EmailEventPayload): EmailEventLogEntry {
  const data = asRecord(event.data);

  return {
    receivedAt: new Date().toISOString(),
    ...(event.type ? { eventType: event.type } : {}),
    ...stringField(data, "email_id", "emailId"),
    ...stringField(data, "from", "from"),
    ...stringField(data, "subject", "subject"),
    ...stringArrayField(data, "to", "to"),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function stringField<T extends string>(
  record: Record<string, unknown>,
  sourceName: string,
  targetName: T,
): Partial<Record<T, string>> {
  const value = record[sourceName];
  return typeof value === "string" ? { [targetName]: value } as Record<T, string> : {};
}

function stringArrayField<T extends string>(
  record: Record<string, unknown>,
  sourceName: string,
  targetName: T,
): Partial<Record<T, string[]>> {
  const value = record[sourceName];
  const strings = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : undefined;

  return strings && strings.length > 0 ? { [targetName]: strings } as Record<T, string[]> : {};
}
