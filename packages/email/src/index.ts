import { getEmailSmtpCredentials } from "@cm/secrets";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

export type EmailRecipient = string;

interface SmtpEmailConfig {
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  defaultFrom: string;
}

export interface SendEmailRequest {
  to: EmailRecipient | readonly EmailRecipient[];
  subject: string;
  html: string;
  text?: string;
  from?: EmailRecipient;
  replyTo?: EmailRecipient;
  cc?: EmailRecipient | readonly EmailRecipient[];
  bcc?: EmailRecipient | readonly EmailRecipient[];
}

export interface SendEmailResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
  response?: string;
}

interface EmailClient {
  sendEmail(message: SendEmailRequest): Promise<SendEmailResult>;
}

let configuredEmailClient: EmailClient | undefined;

export async function sendEmail(
  message: SendEmailRequest,
): Promise<SendEmailResult> {
  configuredEmailClient ??= createSmtpEmailClient(createDefaultSmtpEmailConfig());
  return configuredEmailClient.sendEmail(message);
}

function createDefaultSmtpEmailConfig(): SmtpEmailConfig {
  const credentials = getEmailSmtpCredentials();

  return {
    host: "smtp.resend.com",
    port: 465,
    secure: true,
    user: credentials.user,
    pass: credentials.password,
    defaultFrom: "CM Platform <noreply@mail.cmplatform.dev>",
  };
}

function createSmtpEmailClient(config: SmtpEmailConfig): EmailClient {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.pass,
    },
  });

  return new SmtpEmailClient(transporter, config.defaultFrom);
}

class SmtpEmailClient implements EmailClient {
  constructor(
    private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>,
    private readonly defaultFrom?: string,
  ) {}

  async sendEmail(message: SendEmailRequest): Promise<SendEmailResult> {
    const from = message.from ?? this.defaultFrom;

    if (!from) {
      throw new Error("Email sender is required. Provide message.from or configure a default sender.");
    }

    const info = await this.transporter.sendMail({
      from,
      to: normalizeRecipients(message.to),
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
      ...(message.cc ? { cc: normalizeRecipients(message.cc) } : {}),
      ...(message.bcc ? { bcc: normalizeRecipients(message.bcc) } : {}),
    });

    return {
      messageId: info.messageId,
      accepted: info.accepted.map(String),
      rejected: info.rejected.map(String),
      ...(info.response ? { response: info.response } : {}),
    };
  }
}

function normalizeRecipients(
  recipients: EmailRecipient | readonly EmailRecipient[],
): string {
  return typeof recipients === "string" ? recipients : recipients.join(", ");
}
