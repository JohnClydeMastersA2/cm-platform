import sql from "mssql";
import { loadEnv } from "./config/env.js";

const migrationUser = "cmplatform_migrator";

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
    const tableCountResult = await pool.request().query<{ TableCount: number }>(`
      select count(*) as TableCount
      from sys.tables
      where is_ms_shipped = 0;
    `);
    const tableCount = tableCountResult.recordset[0]?.TableCount;

    if (tableCount !== 0) {
      throw new Error(
        `Identity bootstrap requires an empty user schema; found ${tableCount ?? "unknown"} table(s)`,
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
        grant select, insert, update, delete on schema::dbo to [${migrationUser}];
      `);

    console.log(
      `Migration identity prepared: user=${migrationUser}, existingUserTables=${tableCount}`,
    );
  } finally {
    await pool.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
