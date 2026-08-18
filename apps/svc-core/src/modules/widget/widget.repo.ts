import type { Pool } from "pg";
import type { Widget, WidgetStatus } from "./widget.schema.js";

type WidgetRow = {
  widget_id: number;
  widget_name: string;
  status: WidgetStatus;
  created_at: Date;
  queued_at: Date | null;
  processing_started_at: Date | null;
  processed_at: Date | null;
  process_count: number;
  last_message_id: string | null;
  last_error: string | null;
};

function mapWidget(row: WidgetRow): Widget {
  return {
    widgetId: row.widget_id,
    widgetName: row.widget_name,
    status: row.status,
    createdAt: row.created_at,
    queuedAt: row.queued_at,
    processingStartedAt: row.processing_started_at,
    processedAt: row.processed_at,
    processCount: row.process_count,
    lastMessageId: row.last_message_id,
    lastError: row.last_error,
  };
}

export async function createWidget(
  db: Pool,
  widgetName: string,
): Promise<Widget> {
  const result = await db.query<WidgetRow>(
    `
      insert into widget_queue_demo (
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
        process_count,
        last_message_id,
        last_error;
    `,
    [widgetName],
  );

  const row = result.rows[0];

  if (!row) {
    throw new Error("Widget insert did not return a row");
  }

  return mapWidget(row);
}

export async function listWidgets(db: Pool): Promise<Widget[]> {
  const result = await db.query<WidgetRow>(`
    select
      widget_id,
      widget_name,
      status,
      created_at,
      queued_at,
      processing_started_at,
      processed_at,
      process_count,
      last_message_id,
      last_error
    from widget_queue_demo
    order by widget_id desc
    limit 200;
  `);

  return result.rows.map(mapWidget);
}

export async function deleteAllWidgets(db: Pool): Promise<void> {
  await db.query(`
    delete from widget_queue_demo;
  `);
}

export async function markWidgetProcessed(
  db: Pool,
  widgetId: number,
  messageId: string,
): Promise<void> {
  await db.query(
    `
      update widget_queue_demo
      set
        status = 'processed',
        processing_started_at = coalesce(processing_started_at, now()),
        processed_at = now(),
        process_count = process_count + 1,
        last_message_id = $2,
        last_error = null
      where widget_id = $1;
    `,
    [widgetId, messageId],
  );
}

export async function markWidgetQueued(
  db: Pool,
  widgetId: number,
  messageId: string,
): Promise<void> {
  await db.query(
    `
      update widget_queue_demo
      set
        status = 'queued',
        queued_at = now(),
        processing_started_at = null,
        processed_at = null,
        last_message_id = $2,
        last_error = null
      where widget_id = $1;
    `,
    [widgetId, messageId],
  );
}

export async function markWidgetRetrying(
  db: Pool,
  widgetId: number,
  messageId: string,
  errorMessage: string,
): Promise<void> {
  await db.query(
    `
      update widget_queue_demo
      set
        status = 'retrying',
        processing_started_at = coalesce(processing_started_at, now()),
        last_message_id = $2,
        last_error = $3
      where widget_id = $1;
    `,
    [widgetId, messageId, errorMessage],
  );
}

export async function markWidgetFailed(
  db: Pool,
  widgetId: number,
  messageId: string | null,
  errorMessage: string,
): Promise<void> {
  await db.query(
    `
      update widget_queue_demo
      set
        status = 'failed',
        processing_started_at = coalesce(processing_started_at, now()),
        last_message_id = coalesce($2, last_message_id),
        last_error = $3
      where widget_id = $1;
    `,
    [widgetId, messageId, errorMessage],
  );
}
