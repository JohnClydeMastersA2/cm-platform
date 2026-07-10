import type { FastifyBaseLogger, FastifyInstance, FastifyPluginAsync } from "fastify";
import type { IncomingHttpHeaders } from "node:http";
import { Webhook } from "svix";
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

type EmailEventsWebhookRouteOptions = {
  nodeEnv: string;
  webhookSecret?: string | undefined;
};

export const emailEventsWebhookRoutes: FastifyPluginAsync<EmailEventsWebhookRouteOptions> = async (
  app,
  opts,
) => {
  app.addContentTypeParser("application/json", { parseAs: "string" }, (_request, body, done) => {
    done(null, body);
  });

  app.post("/webhooks/email-events", async (request, reply) => {
    const payload = typeof request.body === "string" ? request.body : "";

    if (!opts.webhookSecret) {
      if (opts.nodeEnv === "production") {
        request.log.error("Resend webhook secret is not configured");
        return reply.code(503).send({ error: "Webhook verification is not configured" });
      }

      const unsignedEvent = parseEmailEventPayload(payload);

      if (!unsignedEvent) {
        return reply.code(400).send({ error: "Invalid webhook payload" });
      }

      request.log.warn("Resend webhook signature verification skipped outside production");
      await processEmailEvent(app, unsignedEvent, request.log);
      return { ok: true };
    }

    const event = verifyEmailEventPayload({
      payload,
      webhookSecret: opts.webhookSecret,
      headers: svixHeadersFrom(request.headers),
    });

    if (!event) {
      request.log.warn("Rejected email events webhook with invalid signature");
      return reply.code(400).send({ error: "Invalid webhook signature" });
    }

    await processEmailEvent(app, event, request.log);

    return { ok: true };
  });
};

async function processEmailEvent(
  app: FastifyInstance,
  event: EmailEventPayload,
  log: FastifyBaseLogger,
): Promise<void> {
  const logEntry = createEmailEventLogEntry(event);

  log.info(
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
  await handleEmailEvent(event, log);
}

function parseEmailEventPayload(payload: string): EmailEventPayload | undefined {
  try {
    return asRecord(JSON.parse(payload)) as EmailEventPayload;
  } catch {
    return undefined;
  }
}

function verifyEmailEventPayload(opts: {
  payload: string;
  webhookSecret: string;
  headers: {
    id?: string;
    timestamp?: string;
    signature?: string;
  };
}): EmailEventPayload | undefined {
  if (!opts.headers.id || !opts.headers.timestamp || !opts.headers.signature) {
    return undefined;
  }

  try {
    const webhook = new Webhook(opts.webhookSecret);
    const verified = webhook.verify(opts.payload, {
      "svix-id": opts.headers.id,
      "svix-timestamp": opts.headers.timestamp,
      "svix-signature": opts.headers.signature,
    });

    return asRecord(verified) as EmailEventPayload;
  } catch {
    return undefined;
  }
}

function headerValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function svixHeadersFrom(headers: IncomingHttpHeaders): {
  id?: string;
  timestamp?: string;
  signature?: string;
} {
  const id = headerValue(headers["svix-id"]);
  const timestamp = headerValue(headers["svix-timestamp"]);
  const signature = headerValue(headers["svix-signature"]);

  return {
    ...(id ? { id } : {}),
    ...(timestamp ? { timestamp } : {}),
    ...(signature ? { signature } : {}),
  };
}

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
