import type { Pool } from "pg";

export async function markWidgetProcessing(
  db: Pool,
  params: {
    widgetId: number;
    consumerName: string;
    processingSeconds: number;
    messageId: string;
  },
): Promise<void> {
  await db.query(
    `
      update widget_consumer_demo
      set
        status = 'processing',
        processing_started_at = now(),
        processed_at = null,
        processed_by = $2,
        processing_seconds = $3,
        last_message_id = $4,
        last_error = null
      where widget_id = $1;
    `,
    [params.widgetId, params.consumerName, params.processingSeconds, params.messageId],
  );
}

export async function markWidgetProcessed(
  db: Pool,
  params: {
    widgetId: number;
    consumerName: string;
    processingSeconds: number;
    messageId: string;
  },
): Promise<void> {
  await db.query(
    `
      update widget_consumer_demo
      set
        status = 'processed',
        processed_at = now(),
        processed_by = $2,
        processing_seconds = $3,
        last_message_id = $4,
        last_error = null
      where widget_id = $1;
    `,
    [params.widgetId, params.consumerName, params.processingSeconds, params.messageId],
  );
}

export async function markWidgetFailed(
  db: Pool,
  params: {
    widgetId: number;
    consumerName: string;
    processingSeconds: number;
    messageId: string;
    error: string;
  },
): Promise<void> {
  await db.query(
    `
      update widget_consumer_demo
      set
        status = 'failed',
        processed_by = $2,
        processing_seconds = $3,
        last_message_id = $4,
        last_error = $5
      where widget_id = $1;
    `,
    [params.widgetId, params.consumerName, params.processingSeconds, params.messageId, params.error],
  );
}
