import type { Db, Filter } from "mongodb";
import {
  emailWebhookEventCollectionName,
  type EmailWebhookEventDocument,
  type EmailWebhookEventQuery,
} from "./email_webhook_event.schema.js";

export function emailWebhookEvents(db: Db) {
  return db.collection<EmailWebhookEventDocument>(emailWebhookEventCollectionName);
}

export async function ensureEmailWebhookEventIndexes(db: Db): Promise<void> {
  const collection = emailWebhookEvents(db);

  await Promise.all([
    collection.createIndex({ receivedAt: -1 }),
    collection.createIndex({ eventType: 1, receivedAt: -1 }),
    collection.createIndex({ recipients: 1, receivedAt: -1 }),
    collection.createIndex({ emailId: 1 }),
    collection.createIndex(
      { providerEventId: 1 },
      { unique: true, sparse: true },
    ),
  ]);
}

export async function recordEmailWebhookEvent(
  db: Db,
  event: EmailWebhookEventDocument,
): Promise<void> {
  if (event.providerEventId) {
    await emailWebhookEvents(db).updateOne(
      { providerEventId: event.providerEventId },
      { $setOnInsert: event },
      { upsert: true },
    );
    return;
  }

  await emailWebhookEvents(db).insertOne(event);
}

export async function queryEmailWebhookEvents(
  db: Db,
  query: EmailWebhookEventQuery,
) {
  const collection = emailWebhookEvents(db);
  const filter = buildFilter(query);
  const skip = (query.page - 1) * query.pageSize;
  const [events, total, eventTypeCounts, sourceCounts] = await Promise.all([
    collection
      .find(filter)
      .sort({ receivedAt: -1, _id: -1 })
      .skip(skip)
      .limit(query.pageSize)
      .toArray(),
    collection.countDocuments(filter),
    collection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$eventType", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
    ]).toArray(),
    collection.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$source", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]).toArray(),
  ]);

  return {
    page: query.page,
    pageSize: query.pageSize,
    total,
    pageCount: Math.max(1, Math.ceil(total / query.pageSize)),
    eventTypeCounts,
    sourceCounts,
    events,
  };
}

function buildFilter(query: EmailWebhookEventQuery): Filter<EmailWebhookEventDocument> {
  const filter: Filter<EmailWebhookEventDocument> = {};

  if (query.eventType) {
    filter.eventType = query.eventType;
  }

  if (query.source) {
    filter.source = query.source;
  }

  if (query.q) {
    const search = new RegExp(escapeRegExp(query.q), "i");
    filter.$or = [
      { eventType: search },
      { emailId: search },
      { recipients: search },
      { sender: search },
      { subject: search },
    ];
  }

  return filter;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
