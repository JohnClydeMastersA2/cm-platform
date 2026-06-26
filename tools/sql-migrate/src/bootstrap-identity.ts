import sql from "mssql";
import { loadEnv } from "./config/env.js";

const migrationUser = "cmplatform_migrator";
const bootstrapAllowedExistingTables = ["SchemaMigration"];

async function main(): Promise<void> {
  const env = loadEnv();

  if (!env.DB_MIGRATION_USER || !env.DB_MIGRATION_PASSWORD) {
    throw new Error(
      "DB_MIGRATION_USER and DB_MIGRATION_PASSWORD are required for identity bootstrap",
    );
  }

  if (env.DB_MIGRATION_USER !== migrationUser) {
    throw new Error(`DB_MIGRATION_USER must be ${migrationUser}`);
  }

  const pool = await new sql.ConnectionPool({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_DATABASE,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    },
  }).connect();

  try {
    const tableResult = await pool.request().query<{ TableName: string }>(`
      select t.name as TableName
      from sys.tables t
      inner join sys.schemas s
        on s.schema_id = t.schema_id
      where s.name = 'dbo'
        and t.is_ms_shipped = 0
      order by t.name;
    `);
    const existingTables = tableResult.recordset.map((row) => row.TableName);
    const unexpectedTables = existingTables.filter(
      (table) => !bootstrapAllowedExistingTables.includes(table),
    );

    if (unexpectedTables.length) {
      throw new Error(
        `Identity bootstrap requires an empty or migration-ledger-only user schema; found ${unexpectedTables.join(", ")}`,
      );
    }

    const migrationLedgerRowResult = await pool.request().query<{
      MigrationCount: number;
    }>(`
      if object_id('dbo.SchemaMigration', 'U') is null
        select cast(0 as int) as MigrationCount;
      else
        select count(*) as MigrationCount
        from dbo.SchemaMigration;
    `);
    const migrationCount =
      migrationLedgerRowResult.recordset[0]?.MigrationCount;

    if (migrationCount !== 0) {
      throw new Error(
        `Identity bootstrap requires no applied migrations; found ${migrationCount ?? "unknown"} migration ledger row(s)`,
      );
    }

    await pool
      .request()
      .input("migrationPassword", sql.NVarChar(128), env.DB_MIGRATION_PASSWORD)
      .batch(`
        declare @quotedPassword nvarchar(258) =
          N'''' + replace(@migrationPassword, N'''', N'''''') + N'''';
        declare @statement nvarchar(max);

        if database_principal_id(N'${migrationUser}') is null
          set @statement =
            N'create user [${migrationUser}] with password = ' + @quotedPassword + N';';
        else
          set @statement =
            N'alter user [${migrationUser}] with password = ' + @quotedPassword + N';';

        execute (@statement);

        grant create table to [${migrationUser}];
        grant alter on schema::dbo to [${migrationUser}];
        grant references on schema::dbo to [${migrationUser}];
        grant select, insert, update, delete on schema::dbo to [${migrationUser}];
      `);

    console.log(
      `Migration identity prepared: user=${migrationUser}, existingUserTables=${existingTables.length}, appliedMigrations=${migrationCount}`,
    );
  } finally {
    await pool.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
