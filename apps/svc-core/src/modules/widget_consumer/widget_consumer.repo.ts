import sql from "mssql";
import type { WidgetConsumerDemoItem, WidgetConsumerStatus } from "./widget_consumer.schema.js";

type WidgetConsumerRow = {
  WidgetId: number;
  WidgetName: string;
  Status: WidgetConsumerStatus;
  CreatedAt: Date;
  QueuedAt: Date | null;
  ProcessingStartedAt: Date | null;
  ProcessedAt: Date | null;
  ProcessedBy: string | null;
  ProcessingSeconds: number | null;
  LastMessageId: string | null;
  LastError: string | null;
};

function mapWidgetConsumerItem(row: WidgetConsumerRow): WidgetConsumerDemoItem {
  return {
    widgetId: row.WidgetId,
    widgetName: row.WidgetName,
    status: row.Status,
    createdAt: row.CreatedAt,
    queuedAt: row.QueuedAt,
    processingStartedAt: row.ProcessingStartedAt,
    processedAt: row.ProcessedAt,
    processedBy: row.ProcessedBy,
    processingSeconds: row.ProcessingSeconds,
    lastMessageId: row.LastMessageId,
    lastError: row.LastError,
  };
}

export async function createWidgetConsumerItem(
  db: sql.ConnectionPool,
  widgetName: string,
): Promise<WidgetConsumerDemoItem> {
  const result = await db
    .request()
    .input("widgetName", sql.VarChar(200), widgetName)
    .query<WidgetConsumerRow>(`
      insert into dbo.WidgetConsumerDemo (
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
        inserted.ProcessedBy,
        inserted.ProcessingSeconds,
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
    throw new Error("Widget consumer demo insert did not return a row");
  }

  return mapWidgetConsumerItem(row);
}

export async function listWidgetConsumerItems(
  db: sql.ConnectionPool,
): Promise<WidgetConsumerDemoItem[]> {
  const result = await db.request().query<WidgetConsumerRow>(`
    select top (200)
      WidgetId,
      WidgetName,
      Status,
      CreatedAt,
      QueuedAt,
      ProcessingStartedAt,
      ProcessedAt,
      ProcessedBy,
      ProcessingSeconds,
      LastMessageId,
      LastError
    from dbo.WidgetConsumerDemo
    order by WidgetId desc;
  `);

  return result.recordset.map(mapWidgetConsumerItem);
}

export async function deleteAllWidgetConsumerItems(db: sql.ConnectionPool): Promise<void> {
  await db.request().query(`
    delete from dbo.WidgetConsumerDemo;
  `);
}
