import fp from "fastify-plugin";
import { Pool } from "pg";
import type { FastifyInstance } from "fastify";

type DbPluginOptions = {
  databaseUrl: string;
  ssl: boolean;
};

async function dbPluginImpl(app: FastifyInstance, opts: DbPluginOptions): Promise<void> {
  const pool = new Pool({
    connectionString: opts.databaseUrl,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 10,
    ssl: opts.ssl,
  });

  await pool.query("select 1 as ok");

  app.decorate("db", pool);

  app.addHook("onClose", async () => {
    await pool.end();
  });
}

export const dbPlugin = fp(dbPluginImpl, {
  name: "db-plugin",
});
