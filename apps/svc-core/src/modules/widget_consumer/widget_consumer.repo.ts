import type { Pool } from "pg";
import type { WidgetConsumerDemoItem, WidgetConsumerStatus } from "./widget_consumer.schema.js";

type WidgetConsumerRow = {
  widget_id: number;
  widget_name: string;
  status: WidgetConsumerStatus;
  created_at: Date;
  queued_at: Date | null;
  processing_started_at: Date | null;
  processed_at: Date | null;
  processed_by: string | null;
  processing_seconds: number | null;
  last_message_id: string | null;
  last_error: string | null;
};

function mapWidgetConsumerItem(row: WidgetConsumerRow): WidgetConsumerDemoItem {
  return {
    widgetId: row.widget_id,
    widgetName: row.widget_name,
    status: row.status,
    createdAt: row.created_at,
    queuedAt: row.queued_at,
    processingStartedAt: row.processing_started_at,
    processedAt: row.processed_at,
    processedBy: row.processed_by,
    processingSeconds: row.processing_seconds,
    lastMessageId: row.last_message_id,
    lastError: row.last_error,
  };
}

export async function createWidgetConsumerItem(
  db: Pool,
  widgetName: string,
): Promise<WidgetConsumerDemoItem> {
  const result = await db.query<WidgetConsumerRow>(
    `
      insert into widget_consumer_demo (
        widget_name,
        status,
        queued_at
      )
      values (
        $1,
        'queued',
        now()
      )
      returning
        widget_id,
        widget_name,
        status,
        created_at,
        queued_at,
        processing_started_at,
        processed_at,
        processed_by,
        processing_seconds,
        last_message_id,
        last_error;
    `,
    [widgetName],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Widget consumer demo insert did not return a row");
  }

  return mapWidgetConsumerItem(row);
}

export async function listWidgetConsumerItems(
  db: Pool,
): Promise<WidgetConsumerDemoItem[]> {
  const result = await db.query<WidgetConsumerRow>(`
    select
      widget_id,
      widget_name,
      status,
      created_at,
      queued_at,
      processing_started_at,
      processed_at,
      processed_by,
      processing_seconds,
      last_message_id,
      last_error
    from widget_consumer_demo
    order by widget_id desc
    limit 200;
  `);

  return result.rows.map(mapWidgetConsumerItem);
}

export async function deleteAllWidgetConsumerItems(db: Pool): Promise<void> {
  await db.query(`
    delete from widget_consumer_demo;
  `);
}
