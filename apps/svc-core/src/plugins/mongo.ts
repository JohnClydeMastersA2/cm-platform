import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { MongoClient } from "mongodb";
import { ensureEmailWebhookEventIndexes } from "../modules/email_webhook_event/email_webhook_event.repo.js";

type MongoPluginOptions = {
  uri: string;
  database: string;
};

async function mongoPluginImpl(
  app: FastifyInstance,
  opts: MongoPluginOptions,
): Promise<void> {
  const client = new MongoClient(opts.uri);
  await client.connect();

  const database = client.db(opts.database);
  await database.command({ ping: 1 });
  await ensureEmailWebhookEventIndexes(database);

  app.decorate("mongoDb", database);

  app.addHook("onClose", async () => {
    await client.close();
  });
}

export const mongoPlugin = fp(mongoPluginImpl, {
  name: "mongo-plugin",
});
