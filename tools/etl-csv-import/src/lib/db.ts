import sql from "mssql";

type DbOptions = {
  server: string;
  port: number;
  user: string;
  password: string;
  database: string;
};

export async function createDbPool(opts: DbOptions): Promise<sql.ConnectionPool> {
  const config: sql.config = {
    server: opts.server,
    port: opts.port,
    user: opts.user,
    password: opts.password,
    database: opts.database,

    connectionTimeout: 30000,
    requestTimeout: 300000,

    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000,
    },

    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
  };

  const pool = new sql.ConnectionPool(config);

  await pool.connect();

  await pool.request().query("select 1 as ok");

  return pool;
}