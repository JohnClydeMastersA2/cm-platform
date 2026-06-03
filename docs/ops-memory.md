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

For the current development phase, Docker Desktop should contain only the resources needed to run SQL Server for `cm-platform`.

Keep:

```text
cm-platform-db
docker_mssql_data
mcr.microsoft.com/mssql/server:2022-latest
docker_default
```

The API and public web app run locally through npm scripts. API Docker images and containers are disposable future assets and should be recreated from source when the project is ready to containerize the full stack.

## Startup

Start Docker Desktop first, then run:

```powershell
npm run infra:up
npm run api:dev
```

The `infra:up` script starts SQL Server, waits for readiness, and ensures the `CMPlatform` database exists.

Run this after schema changes or when validating a restored database:

```powershell
npm run db:schema
```

The current local schema adds publisher registration and login fields to `dbo.Publisher`: `ContactName`, `ContactEmail`, `WebsiteUrl`, `RegistrationNotes`, `RegistrationStatus`, `PasswordHash`, `PasswordSetAt`, and `LastLoginAt`.

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
