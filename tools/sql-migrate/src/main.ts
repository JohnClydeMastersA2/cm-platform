import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sql from "mssql";
import { loadEnv } from "./config/env.js";

type AppliedMigrationRow = {
  MigrationId: string;
  Checksum: string;
};

type ConnectionCheckRow = {
  DatabaseName: string;
  LoginName: string;
};

type MigrationPermissionRow = {
  CanCreateTable: boolean;
  CanAlterSchema: boolean;
  CanSelectSchema: boolean;
  CanInsertSchema: boolean;
  CanUpdateSchema: boolean;
  CanDeleteSchema: boolean;
};

const migrationFilePattern = /^\d{4}_[a-z0-9_]+\.sql$/;

async function main(): Promise<void> {
  const env = loadEnv();
  const database = readOption("--database") ?? env.DB_DATABASE;
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
  const migrationsDir = resolve(repoRoot, env.DB_MIGRATIONS_DIR);
  const migrationCredentials = resolveMigrationCredentials(env);
  const migrationFiles = (await readdir(migrationsDir))
    .filter((file) => file.endsWith(".sql"))
    .sort();

  for (const file of migrationFiles) {
    if (!migrationFilePattern.test(file)) {
      throw new Error(`Invalid migration filename: ${file}`);
    }
  }

  const pool = await new sql.ConnectionPool({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    user: migrationCredentials.user,
    password: migrationCredentials.password,
    database,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    },
  }).connect();

  try {
    if (hasOption("--check-migration-permissions")) {
      await checkMigrationPermissions(pool);
      return;
    }

    if (hasOption("--check-connection")) {
      await checkConnection(pool);
      return;
    }

    await ensureMigrationTable(pool);
    const appliedMigrations = await loadAppliedMigrations(pool);

    for (const file of migrationFiles) {
      const migrationSql = await readFile(resolve(migrationsDir, file), "utf8");
      const checksum = createHash("sha256").update(migrationSql).digest("hex");
      const appliedChecksum = appliedMigrations.get(file);

      if (appliedChecksum === checksum) {
        console.log(`Already applied: ${file}`);
        continue;
      }

      if (appliedChecksum) {
        throw new Error(`Migration checksum changed after application: ${file}`);
      }

      await applyMigration(pool, file, checksum, migrationSql);
      console.log(`Applied: ${file}`);
    }

    console.log(`SQL migrations complete: ${migrationFiles.length} file(s) checked`);
  } finally {
    await pool.close();
  }
}

async function checkMigrationPermissions(pool: sql.ConnectionPool): Promise<void> {
  const result = await pool.request().query<MigrationPermissionRow>(`
    select
      cast(has_perms_by_name(db_name(), 'DATABASE', 'CREATE TABLE') as bit)
        as CanCreateTable,
      cast(has_perms_by_name('dbo', 'SCHEMA', 'ALTER') as bit)
        as CanAlterSchema,
      cast(has_perms_by_name('dbo', 'SCHEMA', 'SELECT') as bit)
        as CanSelectSchema,
      cast(has_perms_by_name('dbo', 'SCHEMA', 'INSERT') as bit)
        as CanInsertSchema,
      cast(has_perms_by_name('dbo', 'SCHEMA', 'UPDATE') as bit)
        as CanUpdateSchema,
      cast(has_perms_by_name('dbo', 'SCHEMA', 'DELETE') as bit)
        as CanDeleteSchema;
  `);
  const row = result.recordset[0];

  if (!row || Object.values(row).some((value) => value !== true)) {
    throw new Error("Migration identity permission check failed");
  }

  console.log(
    "Migration permission check passed: CREATE TABLE; ALTER, SELECT, INSERT, UPDATE, DELETE on schema dbo",
  );
}

function hasOption(name: string): boolean {
  return process.argv.includes(name);
}

function readOption(name: string): string | undefined {
  const optionIndex = process.argv.indexOf(name);

  if (optionIndex === -1) {
    return undefined;
  }

  const value = process.argv[optionIndex + 1]?.trim();

  if (!value) {
    throw new Error(`Missing value for ${name}`);
  }

  return value;
}

function resolveMigrationCredentials(env: ReturnType<typeof loadEnv>): {
  user: string;
  password: string;
} {
  const hasMigrationUser = env.DB_MIGRATION_USER !== undefined;
  const hasMigrationPassword = env.DB_MIGRATION_PASSWORD !== undefined;

  if (hasMigrationUser !== hasMigrationPassword) {
    throw new Error(
      "DB_MIGRATION_USER and DB_MIGRATION_PASSWORD must be configured together",
    );
  }

  if (env.DB_MIGRATION_USER && env.DB_MIGRATION_PASSWORD) {
    return {
      user: env.DB_MIGRATION_USER,
      password: env.DB_MIGRATION_PASSWORD,
    };
  }

  if (env.MSSQL_SA_PASSWORD) {
    return {
      user: "sa",
      password: env.MSSQL_SA_PASSWORD,
    };
  }

  return {
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  };
}

async function checkConnection(pool: sql.ConnectionPool): Promise<void> {
  const result = await pool.request().query<ConnectionCheckRow>(`
    select
      db_name() as DatabaseName,
      suser_sname() as LoginName;
  `);
  const row = result.recordset[0];

  if (!row) {
    throw new Error("SQL connection check returned no result");
  }

  console.log(
    `SQL connection check passed: database=${row.DatabaseName}, login=${row.LoginName}`,
  );
}

async function ensureMigrationTable(pool: sql.ConnectionPool): Promise<void> {
  await pool.request().batch(`
    if object_id('dbo.SchemaMigration', 'U') is null
    begin
      create table dbo.SchemaMigration (
        MigrationId varchar(255) not null
          constraint PK_SchemaMigration primary key,
        Checksum char(64) not null,
        AppliedAt datetime2(0) not null
          constraint DF_SchemaMigration_AppliedAt default (sysutcdatetime())
      );
    end
  `);
}

async function loadAppliedMigrations(
  pool: sql.ConnectionPool,
): Promise<Map<string, string>> {
  const result = await pool.request().query<AppliedMigrationRow>(`
    select MigrationId, Checksum
    from dbo.SchemaMigration;
  `);

  return new Map(result.recordset.map((row) => [row.MigrationId, row.Checksum]));
}

async function applyMigration(
  pool: sql.ConnectionPool,
  migrationId: string,
  checksum: string,
  migrationSql: string,
): Promise<void> {
  const transaction = new sql.Transaction(pool);
  await transaction.begin();

  try {
    for (const batch of splitSqlBatches(migrationSql)) {
      await transaction.request().batch(batch);
    }

    await transaction
      .request()
      .input("migrationId", sql.VarChar(255), migrationId)
      .input("checksum", sql.Char(64), checksum)
      .query(`
        insert into dbo.SchemaMigration (MigrationId, Checksum)
        values (@migrationId, @checksum);
      `);

    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

function splitSqlBatches(migrationSql: string): string[] {
  return migrationSql
    .split(/^\s*GO\s*;?\s*$/gim)
    .map((batch) => batch.trim())
    .filter(Boolean);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
