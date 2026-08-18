# CM Platform Ops Memory

This file captures durable local-development facts that should survive chat history resets.

## Local Database

- Current relational store: Postgres
- Primary Postgres Docker volume: `cm_platform_postgres_data`
- Container mount path for Postgres data: `/var/lib/postgresql/data`
- Primary local database: `cm_platform`
- Local Postgres port: `5432`
- Local secrets file: `packages/secrets/cm-platform.env`

The local Postgres data files live in Docker Desktop's managed volume storage, not in the repository. `docker/compose.dev.yml` mounts `cm_platform_postgres_data` into the Postgres container.

Do not remove this volume unless you have made an intentional backup and truly mean to destroy the local database:

```powershell
docker volume rm cm_platform_postgres_data
docker volume prune
docker system prune --volumes
```

## Current Docker Scope

For the current development phase, Docker Desktop should contain shared local infrastructure plus temporary app containers when explicitly testing production-like runtime.

Keep:

```text
cm-platform-db
cm-platform-mongodb
cm-platform-rabbitmq
cm_platform_postgres_data
cm_platform_mongodb_data
cm_platform_rabbitmq_data
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

This leaves Postgres, MongoDB, RabbitMQ, and their volumes running.

## Startup

Start Docker Desktop first, then run:

```powershell
npm run infra:up
npm run db:migrate
npm run api:dev
```

The `infra:up` script starts Postgres, RabbitMQ, and MongoDB, waits for readiness, and ensures MongoDB application users exist.

Applied relational migrations are tracked in `schema_migration` with a SHA-256 checksum. Never edit an applied migration; add the next numbered `.sql` file instead.

Current publisher account lifecycle:

```text
register -> pending/no password
approve -> approved/active
set password -> password hash stored
login -> email/password accepted
forgot password -> reset password directly for approved active account
```

Approval/rejection is still an admin workflow to build later. For now, local testing can approve a publisher row by setting `registration_status = 'approved'` and `is_active = true`.

## Azure cost snapshots

Production Azure cost reporting is intentionally cached to avoid turning public
page views into live Azure or service health probes. The daily
`demo-maintenance` Container Apps job queries Azure Cost Management with its
system-assigned managed identity, stores daily resource-type costs in
Postgres, and prunes rows beyond 60 days. The public web app reads the cached
`/platform/costs` API only.

The job identity needs the built-in `Cost Management Reader` role on
`rg-cm-platform-prod`. The GitHub deployment identity intentionally does not
own `Microsoft.Authorization/roleAssignments/write`, so assign that role from
an owner/admin Azure login after the job identity is deployed.

The Infrastructure status page should not call healthcare-transform `/health`
as part of its default refresh. Healthcare-transform is a scale-to-zero demo
service, so active checks should only happen when a user opens the Healthcare
page or chooses an explicit live-check workflow.

See [publisher-login-strategy.md](publisher-login-strategy.md) for the full current login strategy and future direction.

## Verification

With the API running:

```powershell
npm run api:verify
npm run api:test:internal
```

`api:verify` checks `/health` and `/ready`. `api:test:internal` checks internal advertiser, offer, and publisher endpoints.
