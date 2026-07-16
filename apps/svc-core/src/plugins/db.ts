import fp from "fastify-plugin";
import sql from "mssql";
import type { FastifyInstance } from "fastify";

type DbPluginOptions = {
  server: string;
  port: number;
  user: string;
  password: string;
  database: string;
  encrypt: boolean;
  trustServerCertificate: boolean;
};

async function dbPluginImpl(app: FastifyInstance, opts: DbPluginOptions): Promise<void> {
  const sqlConfig: sql.config = {
    user: opts.user,
    password: opts.password,
    database: opts.database,
    server: opts.server,
    port: opts.port,
    connectionTimeout: 60_000,
    requestTimeout: 30_000,
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
    options: {
      encrypt: opts.encrypt,
      trustServerCertificate: opts.trustServerCertificate,
    },
  };

  const pool = new sql.ConnectionPool(sqlConfig);
  await pool.connect();
  await pool.request().query("select 1 as ok");

  app.decorate("db", pool);

  app.addHook("onClose", async () => {
    await pool.close();
  });
}

export const dbPlugin = fp(dbPluginImpl, {
  name: "db-plugin",
});
