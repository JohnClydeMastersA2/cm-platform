import sql from "mssql";
import type { Widget, WidgetStatus } from "./widget.schema.js";

type WidgetRow = {
  WidgetId: number;
  WidgetName: string;
  Status: WidgetStatus;
  CreatedAt: Date;
  QueuedAt: Date | null;
  ProcessingStartedAt: Date | null;
  ProcessedAt: Date | null;
  ProcessCount: number;
  LastMessageId: string | null;
  LastError: string | null;
};

function mapWidget(row: WidgetRow): Widget {
  return {
    widgetId: row.WidgetId,
    widgetName: row.WidgetName,
    status: row.Status,
    createdAt: row.CreatedAt,
    queuedAt: row.QueuedAt,
    processingStartedAt: row.ProcessingStartedAt,
    processedAt: row.ProcessedAt,
    processCount: row.ProcessCount,
    lastMessageId: row.LastMessageId,
    lastError: row.LastError,
  };
}

export async function createWidget(
  db: sql.ConnectionPool,
  widgetName: string,
): Promise<Widget> {
  const result = await db
    .request()
    .input("widgetName", sql.VarChar(200), widgetName)
    .query<WidgetRow>(`
      insert into dbo.WidgetQueueDemo (
        WidgetName,
        Status,
        QueuedAt
      )
      output
        inserted.WidgetId,
        inserted.WidgetName,
        inserted.Status,
        inserted.CreatedAt,
        inserted.QueuedAt,
        inserted.ProcessingStartedAt,
        inserted.ProcessedAt,
        inserted.ProcessCount,
        inserted.LastMessageId,
        inserted.LastError
      values (
        @widgetName,
        'queued',
        sysutcdatetime()
      );
    `);

  const row = result.recordset[0];

  if (!row) {
    throw new Error("Widget insert did not return a row");
  }

  return mapWidget(row);
}

export async function listWidgets(db: sql.ConnectionPool): Promise<Widget[]> {
  const result = await db.request().query<WidgetRow>(`
    select top (200)
      WidgetId,
      WidgetName,
      Status,
      CreatedAt,
      QueuedAt,
      ProcessingStartedAt,
      ProcessedAt,
      ProcessCount,
      LastMessageId,
      LastError
    from dbo.WidgetQueueDemo
    order by WidgetId desc;
  `);

  return result.recordset.map(mapWidget);
}

export async function deleteAllWidgets(db: sql.ConnectionPool): Promise<void> {
  await db.request().query(`
    delete from dbo.WidgetQueueDemo;
  `);
}

export async function markWidgetProcessed(
  db: sql.ConnectionPool,
  widgetId: number,
  messageId: string,
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, widgetId)
    .input("messageId", sql.VarChar(100), messageId)
    .query(`
      update dbo.WidgetQueueDemo
      set
        Status = 'processed',
        ProcessingStartedAt = coalesce(ProcessingStartedAt, sysutcdatetime()),
        ProcessedAt = sysutcdatetime(),
        ProcessCount = ProcessCount + 1,
        LastMessageId = @messageId,
        LastError = null
      where WidgetId = @widgetId;
    `);
}

export async function markWidgetQueued(
  db: sql.ConnectionPool,
  widgetId: number,
  messageId: string,
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, widgetId)
    .input("messageId", sql.VarChar(100), messageId)
    .query(`
      update dbo.WidgetQueueDemo
      set
        Status = 'queued',
        QueuedAt = sysutcdatetime(),
        ProcessingStartedAt = null,
        ProcessedAt = null,
        LastMessageId = @messageId,
        LastError = null
      where WidgetId = @widgetId;
    `);
}

export async function markWidgetRetrying(
  db: sql.ConnectionPool,
  widgetId: number,
  messageId: string,
  errorMessage: string,
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, widgetId)
    .input("messageId", sql.VarChar(100), messageId)
    .input("errorMessage", sql.VarChar(sql.MAX), errorMessage)
    .query(`
      update dbo.WidgetQueueDemo
      set
        Status = 'retrying',
        ProcessingStartedAt = coalesce(ProcessingStartedAt, sysutcdatetime()),
        LastMessageId = @messageId,
        LastError = @errorMessage
      where WidgetId = @widgetId;
    `);
}

export async function markWidgetFailed(
  db: sql.ConnectionPool,
  widgetId: number,
  messageId: string | null,
  errorMessage: string,
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, widgetId)
    .input("messageId", sql.VarChar(100), messageId)
    .input("errorMessage", sql.VarChar(sql.MAX), errorMessage)
    .query(`
      update dbo.WidgetQueueDemo
      set
        Status = 'failed',
        ProcessingStartedAt = coalesce(ProcessingStartedAt, sysutcdatetime()),
        LastMessageId = coalesce(@messageId, LastMessageId),
        LastError = @errorMessage
      where WidgetId = @widgetId;
    `);
}
