# CM Platform Ops Memory

This file captures durable local-development facts that should survive chat history resets.

## Local Database

- Current Docker Desktop role: SQL Server support only
- Primary SQL Server Docker volume: `docker_mssql_data`
- Container mount path for SQL Server data: `/var/opt/mssql`
- Primary local database: `CMPlatform`
- Local SQL Server port: `1433`
- Local SQL user: `sa`
- API env file: `apps/svc-core/.env`
- ETL env file: `tools/etl-csv-import/.env`

The local SQL Server data files live in Docker Desktop's managed volume storage, not in the repository. `docker/compose.dev.yml` mounts the external Docker volume `docker_mssql_data` into the SQL Server container at `/var/opt/mssql`; the Compose-local alias is `mssql_data`.

The local SQL Server volume contains developer data and must not be treated as disposable build output.

Do not remove this volume unless you have made an intentional backup and truly mean to destroy the local database:

```powershell
docker volume rm docker_mssql_data
docker volume prune
docker system prune --volumes
```

## Removed Volumes

The accidental empty volume `cm-platform-mssql-data` is not the active project database volume. Do not switch the project back to that volume.

## Current Docker Scope

For the current development phase, Docker Desktop should contain shared local infrastructure plus temporary app containers when explicitly testing production-like runtime.

Keep:

```text
cm-platform-db
cm-platform-mongodb
cm-platform-rabbitmq
docker_mssql_data
mcr.microsoft.com/mssql/server:2022-latest
docker_default
```

The API and public web app usually run locally through npm scripts. Production-like app containers are disposable and can be recreated from source with:

```powershell
npm run prod-local:build
npm run prod-local:up
npm run prod-local:verify
```

Stop only the production-like app containers with:

```powershell
npm run prod-local:down
```

This leaves SQL Server, MongoDB, RabbitMQ, and their volumes running.

Current deployment checkpoint, June 24, 2026:

```text
Azure foundation resources are deployed from Bicep:
  log-cm-platform-prod
  cae-cm-platform-prod

GitHub OIDC works through the protected production environment.
GHCR image publishing works.
SQL TLS runtime settings are ready for Azure SQL:
  local: DB_ENCRYPT=false, DB_TRUST_SERVER_CERTIFICATE=true
  Azure SQL later: DB_ENCRYPT=true, DB_TRUST_SERVER_CERTIFICATE=false

Prod-local app containers were stopped after verification.
Shared local infra remains running.
Versioned SQL migrations are now implemented:
  runner: tools/sql-migrate
  migrations: scripts/db/migrations
  tracking: dbo.SchemaMigration

The baseline adopts the existing database and initializes an empty database.
Next large deployment slice: plan and provision Azure SQL plus a protected cloud migration job.
```

## Startup

Start Docker Desktop first, then run:

```powershell
npm run infra:up
npm run api:dev
```

The `infra:up` script starts SQL Server, waits for readiness, and ensures the `CMPlatform` database exists.

Run versioned migrations after pulling schema changes or when validating a restored database:

```powershell
npm run db:migrate
```

`npm run db:schema` remains an alias for `npm run db:migrate`.

Applied migrations are tracked in `dbo.SchemaMigration` with a SHA-256 checksum. Never edit an applied migration; add the next numbered `.sql` file instead.

Current publisher account lifecycle:

```text
register -> pending/no password
approve -> approved/active
set password -> password hash stored
login -> email/password accepted
forgot password -> reset password directly for approved active account
```

Approval/rejection is still an admin workflow to build later. For now, local testing can approve a publisher row by setting `RegistrationStatus = 'approved'` and `IsActive = 1`.

See [publisher-login-strategy.md](publisher-login-strategy.md) for the full current login strategy and future direction.

## Verification

With the API running:

```powershell
npm run api:verify
npm run api:test:internal
```

`api:verify` checks `/health` and `/ready`. `api:test:internal` checks internal advertiser, offer, and publisher endpoints.
