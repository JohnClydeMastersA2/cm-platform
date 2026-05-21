import sql from "mssql";
import type {
  EmailDelivery,
  EmailDeliveryEvent,
} from "./email_delivery.schema.js";

export type RecordEmailDeliveryEventInput = {
  provider: string;
  providerEmailId: string;
  recipientEmail: string;
  eventType: string;
  subject?: string;
  senderEmail?: string;
  eventPayload: string;
};

type EmailDeliveryRow = {
  EmailDeliveryId: number;
  Provider: string;
  ProviderEmailId: string;
  RecipientEmail: string;
  Subject: string | null;
  SenderEmail: string | null;
  LatestEventType: string | null;
  LatestReceivedAt: Date | null;
  EventCount: number;
};

type EmailDeliveryEventRow = {
  EmailDeliveryEventId: number;
  EmailDeliveryId: number;
  EventType: string;
  EventPayload: string | null;
  ReceivedAt: Date;
};

const emailDeliverySelectColumns = `
  d.EmailDeliveryId,
  d.Provider,
  d.ProviderEmailId,
  d.RecipientEmail,
  d.Subject,
  d.SenderEmail,
  latest.EventType as LatestEventType,
  latest.ReceivedAt as LatestReceivedAt,
  eventStats.EventCount
`;

function mapEmailDelivery(row: EmailDeliveryRow): EmailDelivery {
  return {
    emailDeliveryId: row.EmailDeliveryId,
    provider: row.Provider,
    providerEmailId: row.ProviderEmailId,
    recipientEmail: row.RecipientEmail,
    subject: row.Subject,
    senderEmail: row.SenderEmail,
    latestEventType: row.LatestEventType,
    latestReceivedAt: row.LatestReceivedAt,
    eventCount: row.EventCount,
  };
}

function mapEmailDeliveryEvent(row: EmailDeliveryEventRow): EmailDeliveryEvent {
  return {
    emailDeliveryEventId: row.EmailDeliveryEventId,
    emailDeliveryId: row.EmailDeliveryId,
    eventType: row.EventType,
    eventPayload: row.EventPayload,
    receivedAt: row.ReceivedAt,
  };
}

export async function recordEmailDeliveryEvent(
  db: sql.ConnectionPool,
  input: RecordEmailDeliveryEventInput,
): Promise<void> {
  await db
    .request()
    .input("provider", sql.VarChar(50), input.provider)
    .input("providerEmailId", sql.VarChar(100), input.providerEmailId)
    .input("recipientEmail", sql.VarChar(320), input.recipientEmail)
    .input("eventType", sql.VarChar(100), input.eventType)
    .input("subject", sql.VarChar(500), input.subject ?? null)
    .input("senderEmail", sql.VarChar(320), input.senderEmail ?? null)
    .input("eventPayload", sql.NVarChar(sql.MAX), input.eventPayload)
    .query(`
      set xact_abort on;
      begin transaction;

      declare @emailDeliveryId int;

      select @emailDeliveryId = EmailDeliveryId
      from dbo.EmailDelivery with (updlock, holdlock)
      where Provider = @provider
        and ProviderEmailId = @providerEmailId
        and RecipientEmail = @recipientEmail;

      if @emailDeliveryId is null
      begin
        insert into dbo.EmailDelivery (
          Provider,
          ProviderEmailId,
          RecipientEmail,
          Subject,
          SenderEmail
        )
        values (
          @provider,
          @providerEmailId,
          @recipientEmail,
          @subject,
          @senderEmail
        );

        set @emailDeliveryId = convert(int, scope_identity());
      end
      else
      begin
        update dbo.EmailDelivery
        set
          Subject = coalesce(@subject, Subject),
          SenderEmail = coalesce(@senderEmail, SenderEmail)
        where EmailDeliveryId = @emailDeliveryId;
      end

      insert into dbo.EmailDeliveryEvent (
        EmailDeliveryId,
        EventType,
        EventPayload
      )
      values (
        @emailDeliveryId,
        @eventType,
        @eventPayload
      );

      commit transaction;
    `);
}

export async function listEmailDeliveries(
  db: sql.ConnectionPool,
): Promise<EmailDelivery[]> {
  const result = await db.request().query<EmailDeliveryRow>(`
    select top (200)
      ${emailDeliverySelectColumns}
    from dbo.EmailDelivery d
    outer apply (
      select top (1)
        e.EventType,
        e.ReceivedAt
      from dbo.EmailDeliveryEvent e
      where e.EmailDeliveryId = d.EmailDeliveryId
      order by
        e.ReceivedAt desc,
        e.EmailDeliveryEventId desc
    ) latest
    outer apply (
      select count(*) as EventCount
      from dbo.EmailDeliveryEvent e
      where e.EmailDeliveryId = d.EmailDeliveryId
    ) eventStats
    order by latest.ReceivedAt desc, d.EmailDeliveryId desc;
  `);

  return result.recordset.map(mapEmailDelivery);
}

export async function listEmailDeliveryEvents(
  db: sql.ConnectionPool,
  emailDeliveryId: number,
): Promise<EmailDeliveryEvent[]> {
  const result = await db
    .request()
    .input("emailDeliveryId", sql.Int, emailDeliveryId)
    .query<EmailDeliveryEventRow>(`
      select
        EmailDeliveryEventId,
        EmailDeliveryId,
        EventType,
        EventPayload,
        ReceivedAt
      from dbo.EmailDeliveryEvent
      where EmailDeliveryId = @emailDeliveryId
      order by ReceivedAt desc, EmailDeliveryEventId desc;
    `);

  return result.recordset.map(mapEmailDeliveryEvent);
}
