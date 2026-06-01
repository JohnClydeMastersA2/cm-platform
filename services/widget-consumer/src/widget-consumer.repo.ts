import sql from "mssql";

export async function markWidgetProcessing(
  db: sql.ConnectionPool,
  params: {
    widgetId: number;
    consumerName: string;
    processingSeconds: number;
    messageId: string;
  },
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, params.widgetId)
    .input("consumerName", sql.VarChar(100), params.consumerName)
    .input("processingSeconds", sql.Int, params.processingSeconds)
    .input("messageId", sql.UniqueIdentifier, params.messageId)
    .query(`
      update dbo.WidgetConsumerDemo
      set
        Status = 'processing',
        ProcessingStartedAt = sysutcdatetime(),
        ProcessedAt = null,
        ProcessedBy = @consumerName,
        ProcessingSeconds = @processingSeconds,
        LastMessageId = @messageId,
        LastError = null
      where WidgetId = @widgetId;
    `);
}

export async function markWidgetProcessed(
  db: sql.ConnectionPool,
  params: {
    widgetId: number;
    consumerName: string;
    processingSeconds: number;
    messageId: string;
  },
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, params.widgetId)
    .input("consumerName", sql.VarChar(100), params.consumerName)
    .input("processingSeconds", sql.Int, params.processingSeconds)
    .input("messageId", sql.UniqueIdentifier, params.messageId)
    .query(`
      update dbo.WidgetConsumerDemo
      set
        Status = 'processed',
        ProcessedAt = sysutcdatetime(),
        ProcessedBy = @consumerName,
        ProcessingSeconds = @processingSeconds,
        LastMessageId = @messageId,
        LastError = null
      where WidgetId = @widgetId;
    `);
}

export async function markWidgetFailed(
  db: sql.ConnectionPool,
  params: {
    widgetId: number;
    consumerName: string;
    processingSeconds: number;
    messageId: string;
    error: string;
  },
): Promise<void> {
  await db
    .request()
    .input("widgetId", sql.Int, params.widgetId)
    .input("consumerName", sql.VarChar(100), params.consumerName)
    .input("processingSeconds", sql.Int, params.processingSeconds)
    .input("messageId", sql.UniqueIdentifier, params.messageId)
    .input("error", sql.VarChar(1000), params.error)
    .query(`
      update dbo.WidgetConsumerDemo
      set
        Status = 'failed',
        ProcessedBy = @consumerName,
        ProcessingSeconds = @processingSeconds,
        LastMessageId = @messageId,
        LastError = @error
      where WidgetId = @widgetId;
    `);
}
