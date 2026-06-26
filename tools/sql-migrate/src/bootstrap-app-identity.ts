import sql from "mssql";
import { loadEnv } from "./config/env.js";

const applicationUser = "cmplatform_app";

async function main(): Promise<void> {
  const env = loadEnv();

  if (env.DB_USER !== applicationUser) {
    throw new Error(`DB_USER must be ${applicationUser}`);
  }

  if (!env.DB_BOOTSTRAP_USER || !env.DB_BOOTSTRAP_PASSWORD) {
    throw new Error(
      "DB_BOOTSTRAP_USER and DB_BOOTSTRAP_PASSWORD are required for application identity bootstrap",
    );
  }

  const pool = await new sql.ConnectionPool({
    server: env.DB_SERVER,
    port: env.DB_PORT,
    user: env.DB_BOOTSTRAP_USER,
    password: env.DB_BOOTSTRAP_PASSWORD,
    database: env.DB_DATABASE,
    options: {
      encrypt: env.DB_ENCRYPT,
      trustServerCertificate: env.DB_TRUST_SERVER_CERTIFICATE,
    },
  }).connect();

  try {
    await pool
      .request()
      .input("applicationPassword", sql.NVarChar(128), env.DB_PASSWORD)
      .batch(`
        declare @quotedPassword nvarchar(258) =
          N'''' + replace(@applicationPassword, N'''', N'''''') + N'''';
        declare @statement nvarchar(max);

        if database_principal_id(N'${applicationUser}') is null
          set @statement =
            N'create user [${applicationUser}] with password = ' + @quotedPassword + N';';
        else
          set @statement =
            N'alter user [${applicationUser}] with password = ' + @quotedPassword + N';';

        execute (@statement);

        grant select, insert, update, delete on schema::dbo to [${applicationUser}];
        deny create table to [${applicationUser}];
        deny alter on schema::dbo to [${applicationUser}];
        deny references on schema::dbo to [${applicationUser}];
      `);

    console.log(`Application identity prepared: user=${applicationUser}`);
  } finally {
    await pool.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
