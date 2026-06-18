import sql from "mssql";
import type { Env } from "./config/env.js";

export async function connectDb(env: Env): Promise<sql.ConnectionPool> {
  const pool = new sql.ConnectionPool({
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    server: env.DB_SERVER,
    port: env.DB_PORT,
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30_000,
    },
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    },
  });

  await pool.connect();
  await pool.request().query("select 1 as ok");

  return pool;
}
