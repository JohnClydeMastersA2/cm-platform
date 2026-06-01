import { once } from "node:events";
import type { Channel, ConfirmChannel } from "amqplib";
import { z } from "zod";

export const emailExchangeName = "cm.email";

export const emailQueues = {
  dispatch: "cm.email.dispatch",
  deadLetter: "cm.email.dispatch.dlq",
} as const;

// RabbitMQ routing keys are broker-level addresses used to route published messages to queues.
export const emailRoutingKeys = {
  emailVerificationRequested: "auth.email_verification_requested.v1",
} as const;

export const emailMessageTypes = {
  emailVerificationRequested: "auth.email_verification_requested.v1",
} as const;

const EmailRecipientsSchema = z.union([
  z.string().min(1),
  z.array(z.string().min(1)).min(1).readonly(),
]);

export const SendEmailRequestMessageSchema = z.object({
  to: EmailRecipientsSchema,
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().min(1).optional(),
  from: z.string().min(1).optional(),
  replyTo: z.string().min(1).optional(),
  cc: EmailRecipientsSchema.optional(),
  bcc: EmailRecipientsSchema.optional(),
});

export const EmailVerificationRequestedMessageSchema = z.object({
  messageType: z.literal(emailMessageTypes.emailVerificationRequested),
  messageId: z.uuid(),
  requestedAt: z.string().datetime(),
  source: z.string().min(1),
  email: SendEmailRequestMessageSchema,
});

export type SendEmailRequestMessage = z.infer<typeof SendEmailRequestMessageSchema>;
export type EmailVerificationRequestedMessage = z.infer<
  typeof EmailVerificationRequestedMessageSchema
>;

export async function assertEmailTopology(channel: Channel): Promise<void> {
  await channel.assertExchange(emailExchangeName, "topic", { durable: true });

  await channel.assertQueue(emailQueues.deadLetter, { durable: true });

  await channel.assertQueue(emailQueues.dispatch, {
    durable: true,
    arguments: {
      "x-dead-letter-exchange": "",
      "x-dead-letter-routing-key": emailQueues.deadLetter,
    },
  });

  await channel.bindQueue(
    emailQueues.dispatch,
    emailExchangeName,
    emailRoutingKeys.emailVerificationRequested,
  );
}

export async function publishEmailVerificationRequested(
  channel: ConfirmChannel,
  message: EmailVerificationRequestedMessage,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  const accepted = channel.publish(
    emailExchangeName,
    emailRoutingKeys.emailVerificationRequested,
    payload,
    {
      appId: message.source,
      contentType: "application/json",
      contentEncoding: "utf-8",
      deliveryMode: 2,
      messageId: message.messageId,
      persistent: true,
      timestamp: Math.floor(Date.parse(message.requestedAt) / 1000),
      type: message.messageType,
    },
  );

  if (!accepted) {
    await once(channel, "drain");
  }

  await channel.waitForConfirms();
}
