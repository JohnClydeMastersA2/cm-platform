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
import http from "node:http";
import https from "node:https";
import { Pool } from "pg";
import { loadEnv } from "./config/env.js";

const env = loadEnv();
const logger = createLogger({
  name: "demo-maintenance",
  level: env.LOG_LEVEL,
  env: env.NODE_ENV,
});

type DatabaseCleanupResult = {
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
  databaseCleanupMode: "full-reset";
  database: DatabaseCleanupResult[];
  rabbitMq: QueueCleanupResult[];
  api: ApiCleanupResult[];
};

async function main(): Promise<void> {
  const startedAt = new Date();

  logger.info(
    {
      monitorCount: env.CM_PLATFORM_MONITORS.length,
      databaseCleanupMode: "full-reset",
    },
    "Demo maintenance started",
  );

  const databaseResults = await cleanupDatabaseDemoRows();
  const rabbitMqResults = await cleanupRabbitMqQueues();
  const apiResults = await cleanupApiState();
  const completedAt = new Date();

  const summary: MaintenanceSummary = {
    startedAt: startedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    databaseCleanupMode: "full-reset",
    database: databaseResults,
    rabbitMq: rabbitMqResults,
    api: apiResults,
  };

  logger.info(summary, "Demo maintenance completed");
  await sendMaintenanceEmail(summary);
}

async function cleanupDatabaseDemoRows(): Promise<DatabaseCleanupResult[]> {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 2,
    ssl: env.PGSSLMODE !== "disable",
  });

  try {
    return [
      await deleteDemoRows(pool, "widget_queue_demo"),
      await deleteDemoRows(pool, "widget_consumer_demo"),
    ];
  } finally {
    await pool.end();
  }
}

async function deleteDemoRows(
  pool: Pool,
  table: "widget_queue_demo" | "widget_consumer_demo",
): Promise<DatabaseCleanupResult> {
  const result = await pool.query(`delete from ${table};`);

  return {
    table,
    deletedRows: result.rowCount ?? 0,
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

  const response = await sendApiRequest(url, {
    method: "POST",
    headers: {
      "x-admin-key": env.ADMIN_KEY,
    },
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Unable to reset priority queue demo API state (${response.statusCode})`);
  }

  return [{
    target: "/internal/maintenance/reset-priority-queue-demo",
    ok: true,
  }];
}

function sendApiRequest(
  url: URL,
  options: {
    method: "POST";
    headers: Record<string, string>;
  },
): Promise<{ statusCode: number }> {
  const client = url.protocol === "https:" ? https : http;
  const headers = {
    ...options.headers,
    ...(env.DEMO_MAINTENANCE_API_HOST_HEADER ? { Host: env.DEMO_MAINTENANCE_API_HOST_HEADER } : {}),
  };

  return new Promise((resolve, reject) => {
    const request = client.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method: options.method,
      headers,
      servername: url.hostname,
    }, (response) => {
      response.resume();
      response.on("end", () => {
        resolve({ statusCode: response.statusCode ?? 0 });
      });
    });

    request.on("error", reject);
    request.end();
  });
}

async function sendMaintenanceEmail(summary: MaintenanceSummary): Promise<void> {
  const totalDeletedRows = summary.database.reduce((total, item) => total + item.deletedRows, 0);
  const totalPurgedMessages = summary.rabbitMq.reduce((total, item) => total + item.purgedMessages, 0);

  await sendEmail({
    to: env.CM_PLATFORM_MONITORS,
    subject: "CM Platform demo maintenance completed",
    text: [
      "CM Platform demo maintenance completed.",
      "",
      `Started: ${summary.startedAt}`,
      `Completed: ${summary.completedAt}`,
      `Database cleanup mode: ${summary.databaseCleanupMode}`,
      "",
      `Database rows deleted: ${totalDeletedRows}`,
      ...summary.database.map((item) => `- ${item.table}: ${item.deletedRows}`),
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
      `<li><strong>Database cleanup mode:</strong> ${summary.databaseCleanupMode}</li>`,
      "</ul>",
      "<h2>Database cleanup</h2>",
      "<ul>",
      ...summary.database.map((item) => `<li>${escapeHtml(item.table)}: ${item.deletedRows}</li>`),
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
