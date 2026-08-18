import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { config as loadDotenv } from "dotenv";
import pg from "pg";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  PGSSLMODE: z.string().default("require"),
});

type AppliedMigration = {
  migration_id: string;
  checksum: string;
};

async function main(): Promise<void> {
  loadLocalEnvFiles();
  const env = EnvSchema.parse(process.env);
  const pool = new pg.Pool({
    connectionString: env.DATABASE_URL,
    ssl: env.PGSSLMODE !== "disable",
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 30_000,
  });

  try {
    await checkConnection(pool);
    await ensureMigrationTable(pool);
    await applyPendingMigrations(pool);
  } finally {
    await pool.end();
  }
}

async function checkConnection(pool: pg.Pool): Promise<void> {
  const result = await pool.query<{ ok: number }>("select 1 as ok");

  if (result.rows[0]?.ok !== 1) {
    throw new Error("Postgres connection check failed");
  }
}

async function ensureMigrationTable(pool: pg.Pool): Promise<void> {
  await pool.query(`
    create table if not exists schema_migration (
      migration_id varchar(255) primary key,
      checksum char(64) not null,
      applied_at timestamptz not null default now()
    );
  `);
}

async function applyPendingMigrations(pool: pg.Pool): Promise<void> {
  const migrationDir = resolveRepoPath("scripts/postgres/migrations");
  const files = (await readdir(migrationDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right));
  const applied = await getAppliedMigrations(pool);

  for (const file of files) {
    const migrationId = file;
    const sql = await readFile(resolve(migrationDir, file), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const appliedMigration = applied.get(migrationId);

    if (appliedMigration) {
      if (appliedMigration.checksum !== checksum) {
        throw new Error(`Migration checksum mismatch for ${migrationId}`);
      }

      console.log(`Skipping ${migrationId}; already applied.`);
      continue;
    }

    console.log(`Applying ${migrationId}...`);
    const client = await pool.connect();

    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        "insert into schema_migration (migration_id, checksum) values ($1, $2)",
        [migrationId, checksum],
      );
      await client.query("commit");
      console.log(`Applied ${migrationId}.`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    } finally {
      client.release();
    }
  }
}

async function getAppliedMigrations(pool: pg.Pool): Promise<Map<string, AppliedMigration>> {
  const result = await pool.query<AppliedMigration>(`
    select migration_id, checksum
    from schema_migration;
  `);

  return new Map(result.rows.map((migration) => [migration.migration_id, migration]));
}

function loadLocalEnvFiles(): void {
  const candidatePaths = [
    resolve(process.cwd(), ".env"),
    resolve(process.cwd(), "packages/secrets/cm-platform.env"),
    resolve(process.cwd(), "../../packages/secrets/cm-platform.env"),
  ];

  for (const path of candidatePaths) {
    if (existsSync(path)) {
      loadDotenv({ path, quiet: true });
    }
  }
}

function resolveRepoPath(relativePath: string): string {
  const candidateRoots = [
    process.env.INIT_CWD,
    process.cwd(),
    dirname(dirname(process.cwd())),
  ].filter((value): value is string => Boolean(value));

  for (const root of candidateRoots) {
    const candidatePath = resolve(root, relativePath);

    if (existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return resolve(process.cwd(), relativePath);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
