import { Pool } from "pg";
import type { Env } from "./config/env.js";

export async function connectDb(env: Env): Promise<Pool> {
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 5,
    ssl: env.PGSSLMODE !== "disable",
  });

  await pool.query("select 1 as ok");

  return pool;
}
