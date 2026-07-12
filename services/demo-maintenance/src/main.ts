import { createLogger } from "@cm/logging";
import { sendEmail } from "@cm/email";
import {
  assertPriorityQueueTopology,
  assertTopicRoutingTopology,
  assertWidgetConsumerTopology,
  assertWidgetTopology,
  priorityQueueQueues,
  topicRoutingBindings,
  widgetConsumerQueues,
  widgetQueues,
} from "@cm/messaging";
import amqp from "amqplib";
import type { Channel, ChannelModel } from "amqplib";
import sql from "mssql";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const logger = createLogger({
  name: "demo-maintenance",
  level: env.LOG_LEVEL,
  env: env.NODE_ENV,
});

type SqlCleanupResult = {
  table: string;
  deletedRows: number;
};

type QueueCleanupResult = {
  queue: string;
  purgedMessages: number;
};

type ApiCleanupResult = {
  target: string;
  ok: boolean;
};

type MaintenanceSummary = {
  startedAt: string;
  completedAt: string;
  cutoffAt: string;
  retentionHours: number;
  sql: SqlCleanupResult[];
  rabbitMq: QueueCleanupResult[];
  api: ApiCleanupResult[];
};

async function main(): Promise<void> {
  const startedAt = new Date();
  const cutoffAt = new Date(startedAt.getTime() - env.DEMO_MAINTENANCE_RETENTION_HOURS * 60 * 60 * 1000);

  logger.info(
    {
      monitorCount: env.CM_PLATFORM_MONITORS.length,
      retentionHours: env.DEMO_MAINTENANCE_RETENTION_HOURS,
      cutoffAt: cutoffAt.toISOString(),
    },
    "Demo maintenance started",
  );

  const sqlResults = await cleanupSqlDemoRows(cutoffAt);
  const rabbitMqResults = await cleanupRabbitMqQueues();
  const apiResults = await cleanupApiState();
  const completedAt = new Date();

  const summary: MaintenanceSummary = {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    cutoffAt: cutoffAt.toISOString(),
    retentionHours: env.DEMO_MAINTENANCE_RETENTION_HOURS,
    sql: sqlResults,
    rabbitMq: rabbitMqResults,
    api: apiResults,
  };

  logger.info(summary, "Demo maintenance completed");
  await sendMaintenanceEmail(summary);
}

async function cleanupSqlDemoRows(cutoffAt: Date): Promise<SqlCleanupResult[]> {
  const pool = await sql.connect({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    },
  });

  try {
    return [
      await deleteOldRows(pool, "dbo.WidgetQueueDemo", cutoffAt),
      await deleteOldRows(pool, "dbo.WidgetConsumerDemo", cutoffAt),
    ];
  } finally {
    await pool.close();
  }
}

async function deleteOldRows(
  pool: sql.ConnectionPool,
  table: "dbo.WidgetQueueDemo" | "dbo.WidgetConsumerDemo",
  cutoffAt: Date,
): Promise<SqlCleanupResult> {
  const result = await pool.request()
    .input("cutoffAt", sql.DateTime2, cutoffAt)
    .query(`delete from ${table} where CreatedAt < @cutoffAt;`);

  return {
    table,
    deletedRows: result.rowsAffected[0] ?? 0,
  };
}

async function cleanupRabbitMqQueues(): Promise<QueueCleanupResult[]> {
  const connection = await amqp.connect(env.RABBITMQ_URL) as ChannelModel;
  const channel = await connection.createChannel() as Channel;

  try {
    await assertWidgetTopology(channel);
    await assertWidgetConsumerTopology(channel);
    await assertTopicRoutingTopology(channel);
    await assertPriorityQueueTopology(channel);

    const queueNames = [
      widgetQueues.processing,
      widgetQueues.retry,
      widgetQueues.deadLetter,
      widgetConsumerQueues.processing,
      ...topicRoutingBindings.map((binding) => binding.queue),
      priorityQueueQueues.processing,
    ];

    const results: QueueCleanupResult[] = [];

    for (const queue of queueNames) {
      const result = await channel.purgeQueue(queue);
      results.push({
        queue,
        purgedMessages: result.messageCount,
      });
    }

    return results;
  } finally {
    await channel.close();
    await connection.close();
  }
}

async function cleanupApiState(): Promise<ApiCleanupResult[]> {
  const url = new URL("/internal/maintenance/reset-priority-queue-demo", env.DEMO_MAINTENANCE_API_BASE_URL);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "x-admin-key": env.ADMIN_KEY,
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to reset priority queue demo API state (${response.status})`);
  }

  return [{
    target: "/internal/maintenance/reset-priority-queue-demo",
    ok: true,
  }];
}

async function sendMaintenanceEmail(summary: MaintenanceSummary): Promise<void> {
  const totalDeletedRows = summary.sql.reduce((total, item) => total + item.deletedRows, 0);
  const totalPurgedMessages = summary.rabbitMq.reduce((total, item) => total + item.purgedMessages, 0);

  await sendEmail({
    to: env.CM_PLATFORM_MONITORS,
    subject: "CM Platform demo maintenance completed",
    text: [
      "CM Platform demo maintenance completed.",
      "",
      `Started: ${summary.startedAt}`,
      `Completed: ${summary.completedAt}`,
      `Retention hours: ${summary.retentionHours}`,
      `Cutoff: ${summary.cutoffAt}`,
      "",
      `SQL rows deleted: ${totalDeletedRows}`,
      ...summary.sql.map((item) => `- ${item.table}: ${item.deletedRows}`),
      "",
      `RabbitMQ messages purged: ${totalPurgedMessages}`,
      ...summary.rabbitMq.map((item) => `- ${item.queue}: ${item.purgedMessages}`),
      "",
      "API state cleanup:",
      ...summary.api.map((item) => `- ${item.target}: ${item.ok ? "ok" : "failed"}`),
    ].join("\n"),
    html: [
      "<h1>CM Platform demo maintenance completed</h1>",
      "<ul>",
      `<li><strong>Started:</strong> ${escapeHtml(summary.startedAt)}</li>`,
      `<li><strong>Completed:</strong> ${escapeHtml(summary.completedAt)}</li>`,
      `<li><strong>Retention hours:</strong> ${summary.retentionHours}</li>`,
      `<li><strong>Cutoff:</strong> ${escapeHtml(summary.cutoffAt)}</li>`,
      "</ul>",
      "<h2>SQL cleanup</h2>",
      "<ul>",
      ...summary.sql.map((item) => `<li>${escapeHtml(item.table)}: ${item.deletedRows}</li>`),
      "</ul>",
      "<h2>RabbitMQ cleanup</h2>",
      "<ul>",
      ...summary.rabbitMq.map((item) => `<li>${escapeHtml(item.queue)}: ${item.purgedMessages}</li>`),
      "</ul>",
      "<h2>API state cleanup</h2>",
      "<ul>",
      ...summary.api.map((item) => `<li>${escapeHtml(item.target)}: ${item.ok ? "ok" : "failed"}</li>`),
      "</ul>",
    ].join("\n"),
  });

  logger.info(
    {
      recipientCount: env.CM_PLATFORM_MONITORS.length,
      totalDeletedRows,
      totalPurgedMessages,
    },
    "Demo maintenance email sent",
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

main().catch((err: unknown) => {
  logger.error({ err }, "Demo maintenance failed");
  process.exitCode = 1;
});
