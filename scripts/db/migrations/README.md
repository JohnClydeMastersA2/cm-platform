# SQL Migrations

Migration files are applied in filename order by `tools/sql-migrate`.

Naming format:

```text
NNNN_short_description.sql
```

Rules:

- never edit a migration after it has been applied outside disposable testing;
- add the next numbered migration for every schema change;
- keep migrations compatible with SQL Server and Azure SQL;
- prefer backward-compatible expand-and-contract changes;
- do not include passwords, connection strings, or environment-specific values;
- use `GO` on its own line only when separate SQL batches are required.

Run locally:

```powershell
npm run db:migrate
```

Check connectivity without creating or modifying schema objects:

```powershell
npm run db:check
```

Applied migrations are recorded in `dbo.SchemaMigration` with a SHA-256 checksum.
The runner stops if an applied migration file's checksum changes.

Production migrations will use a dedicated migration identity with DDL permissions.
Application services must continue using a separate least-privilege runtime identity.
