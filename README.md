# CM Platform

CM Platform is a TypeScript-based application platform that brings together a Fastify API, SQL Server-backed data workflows, a public-facing site, shared validation contracts, email delivery support, and PowerShell-driven development automation. The project focuses on building a practical, maintainable foundation for account registration, authentication, internal service operations, and local infrastructure workflows.

## Command Environment

This project standardizes on **PowerShell** as the primary command environment for development automation.

Project scripts, runbooks, smoke tests, cleanup commands, and future operational helpers should assume they are being run from PowerShell unless a different shell is called out explicitly. npm remains the command entry point for common workflows, but the underlying scripts may use PowerShell-native commands and `.ps1` files.

Run project tasks through the root `package.json` scripts when possible. Those scripts are the documented command surface for setup, build, cleanup, infrastructure, and verification work.

Run commands from the repository root:

```powershell
cd C:\cm-platform
```

Long-running processes, such as the API service, the public-facing site, tunnels, and log watchers, should run in separate PowerShell windows so each process can keep its own console output visible.

## Script Naming

Targeted npm scripts use a `thing:action` convention:

```text
api:dev
api:build
api:start
api:verify

publisher:dev
publisher:build
publisher:preview

contracts:build
logging:build
etl:build
etl:run

infra:up
infra:down
db:schema
```

This means `api:dev` is the API service running in development mode. It is not the internal API surface. The API service can expose multiple route surfaces, such as `/internal`, `/public`, and `/publisher`.

Short aliases like `build`, `clean`, and `dev` remain for common workflows.

## Project Shape

```text
apps/svc-core        API service
apps/publisher-web   (public) publisher-facing web app
services/*           deployable background services and workers
packages/contracts   shared API contracts
packages/logging     shared logging package
tools/*              operational utilities
docker/*             local SQL Server infrastructure configuration
scripts/*            PowerShell automation and smoke tests
docs/*               project notes, architecture, and durable ops memory
```

## First-Time Setup

Install local dependencies:

```powershell
npm install
```

Start Docker Desktop manually before running infrastructure commands. Wait until Docker Desktop reports that the engine is running, then use the npm scripts below.

The API requires environment variables. For local API development, keep them in `apps/svc-core/.env`.

Expected variables:

```powershell
DB_SERVER=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=<local-password>
DB_DATABASE=CMPlatform
LOG_LEVEL=info
PORT=3000
HOST=0.0.0.0
ADMIN_KEY=changeme-internal-key
AUTH_API_BASE_URL=http://localhost:3000
PUBLISHER_WEB_BASE_URL=http://localhost:5173
RABBITMQ_URL=amqp://cm_platform:cm_platform_dev@localhost:5672
```

The default local database is `CMPlatform` on SQL Server port `1433`. If that port is already in use, adjust `docker/compose.dev.yml` and the API `.env` together.

Local infrastructure also starts RabbitMQ for asynchronous workflow experiments:

```text
AMQP:       amqp://cm_platform:cm_platform_dev@localhost:5672
Management: http://localhost:15672
```

For durable local-development context, especially database and Docker volume facts, see [docs/ops-memory.md](docs/ops-memory.md).

## Documentation

Supporting project documentation lives in `docs/`:

```text
docs/ops-memory.md      durable local-development facts
docs/notes.md           design and implementation notes
docs/publisher-login-strategy.md publisher account lifecycle and login strategy
docs/iam-strategy.md    identity and access management strategy
docs/architecture.drawio development architecture diagram
```

## Messaging

Shared RabbitMQ message contracts and topology helpers live in `packages/messaging`.
Domain imports should use explicit subpaths:

```ts
import { emailQueues } from "@cm/messaging/email";
import { widgetQueues } from "@cm/messaging/widget";
import { widgetConsumerQueues } from "@cm/messaging/widget-consumer";
import { topicRoutingQueues } from "@cm/messaging/topic-routing";
import { priorityQueueQueues } from "@cm/messaging/priority-queue";
```

`packages/messaging/src/index.ts` remains as a package entrypoint that re-exports public domains, but application and service code should prefer the qualified imports above.

## Database Safety

The local SQL Server data files are stored in Docker Desktop, not in the repository.
Compose mounts this Docker-managed volume into the SQL Server container at `/var/opt/mssql`.

The persistent Docker volume is:

```text
docker_mssql_data
```

In `docker/compose.dev.yml`, the service uses the local Compose volume alias `mssql_data`, but that alias points to the external Docker volume named `docker_mssql_data`.

This volume contains the local `CMPlatform` SQL Server database and is intentionally treated as developer data, not disposable build output.

The normal infrastructure commands do **not** remove this volume:

```powershell
npm run infra:up
npm run infra:down
npm run infra:restart
```

`infra:down` stops and removes containers only. It does not pass `-v` to Docker Compose, and it does not remove Docker volumes.

Do not run destructive Docker volume commands against this project unless you have made an intentional backup and truly mean to destroy the local database:

```powershell
docker compose down -v
docker volume rm docker_mssql_data
docker volume prune
docker system prune --volumes
```

The Compose file marks the volume as external so Compose does not delete it during normal Compose cleanup. The PowerShell startup script creates `docker_mssql_data` if it does not already exist.

## Starting The Environment

For normal development, start infrastructure first:

```powershell
npm run infra:up
```

This starts the local database container. For now, Docker Desktop is used only to support SQL Server; the API and web app run locally through npm scripts.

Then start the API locally in watch mode:

```powershell
npm run api:dev
```

Or use the shortcut:

```powershell
npm run dev
```

When testing application email flows, start the email dispatcher in another PowerShell window:

```powershell
npm run email-dispatcher:dev
```

When testing the competing consumers demo, start one or more widget consumers in separate PowerShell windows. Give each instance a name and processing time to make RabbitMQ's work distribution visible:

```powershell
$env:WIDGET_CONSUMER_NAME="fast-consumer"
$env:WIDGET_CONSUMER_PROCESSING_SECONDS="1"
npm run widget-consumer:dev
```

```powershell
$env:WIDGET_CONSUMER_NAME="slow-consumer"
$env:WIDGET_CONSUMER_PROCESSING_SECONDS="5"
npm run widget-consumer:dev
```

Start the publisher web app separately:

```powershell
npm run publisher:dev
```

Useful infrastructure commands:

```powershell
npm run infra:status
npm run infra:logs
npm run infra:down
npm run db:schema
```

## Building Source Code

Build everything:

```powershell
npm run build
```

That runs:

```text
packages/contracts
packages/logging
apps/svc-core
apps/publisher-web
tools/etl-csv-import
```

Build only the core backend pieces:

```powershell
npm run core:build
```

Build individual targets:

```powershell
npm run api:build
npm run email-dispatcher:build
npm run widget-consumer:build
npm run publisher:build
npm run contracts:build
npm run secrets:build
npm run email:build
npm run logging:build
npm run etl:build
npm run email-send-test:build
```

Clean generated output:

```powershell
npm run clean
```

Rebuild from a clean state:

```powershell
npm run all:rebuild
```

## Preliminary Verification

After the API is running, confirm the basic service endpoints:

```powershell
npm run api:verify
```

This checks:

```text
GET /health
GET /ready
```

For a deeper smoke test of the internal API:

```powershell
npm run api:test:internal
```

That script calls the internal advertiser, offer, and publisher endpoints using `ADMIN_KEY=changeme-internal-key`. It assumes the database is reachable and contains seed or development data for those resources.

Publisher registration currently creates pending accounts without passwords. After a publisher is approved, the local publisher web app can set a password and then log in with email and password. See [docs/publisher-login-strategy.md](docs/publisher-login-strategy.md).

The publisher web app is being migrated toward platform IAM fundamentals. The current auth slice supports email/password registration, email verification, login, session lookup, logout, and account deletion through:

```text
POST /auth/register
GET /auth/verify-email?token=<token>
POST /auth/login
GET /auth/me
POST /auth/logout
DELETE /auth/me
```

See [docs/iam-strategy.md](docs/iam-strategy.md).

Registration queues a verification email request through RabbitMQ. `services/email-dispatcher` consumes that request and sends the message through `@cm/email`. The verification link expires after five minutes. `svc-core` builds that link from `AUTH_API_BASE_URL` and redirects back to `PUBLISHER_WEB_BASE_URL`, so local development and production can use different public URLs without changing code.

## Background Services

Deployable non-user-facing runtimes live under `services/`.

`services/email-dispatcher` consumes RabbitMQ email send requests and dispatches them through `@cm/email`. It currently handles publisher account verification emails queued by `svc-core`.

`services/widget-consumer` consumes RabbitMQ widget processing requests for the competing consumers demo. Multiple instances can run against the same queue by using different `WIDGET_CONSUMER_NAME` and `WIDGET_CONSUMER_PROCESSING_SECONDS` values.

## Widget Queue Demo

The publisher web app includes a Widget Queue page at:

```text
#widgets
```

It also includes a competing consumers page at:

```text
#competing-consumers
```

And a topic routing page at:

```text
#topic-routing
```

The topic routing demo publishes one event to the `cm.topic-demo` topic exchange and shows which queues receive copies based on their binding patterns.

The priority queue page is available at:

```text
#priority-queue
```

The priority queue demo publishes normal, high, and urgent jobs into one queue declared with `x-max-priority`, then processes messages manually to show that higher-priority waiting messages are delivered first.

The demo uses SQL Server for visible widget state and RabbitMQ for queued work messages:

```text
Create widgets -> dbo.WidgetQueueDemo rows + cm.widget.processing messages
Process widgets -> pull messages from RabbitMQ + mark SQL rows processed
```

After pulling the latest code or changing schema, apply the local table update:

```powershell
npm run db:schema
```

## Email Sending

Shared SMTP email support lives in `packages/email` and is exposed as the `@cm/email` workspace package. It is provider-neutral and currently intended for Resend SMTP using the verified sending domain:

```text
mail.cmplatform.dev
```

Secret access lives in `packages/secrets` and is exposed as the `@cm/secrets` workspace package. `@cm/email` owns that dependency so client applications and tools only provide email content:

```text
client/tool/service -> @cm/email -> @cm/secrets -> SMTP provider
```

`@cm/email` owns the SMTP transport configuration. `@cm/secrets` only returns the SMTP credentials from `packages/secrets/cm-platform.env`:

```text
EMAIL_SMTP_USER=resend
EMAIL_SMTP_PASS=<resend-api-key>
```

`tools/email-send-test` is a small real client of `@cm/email`. It sends a simple HTML message to locally configured test recipients and can be used as both a sanity check and an implementation example:

Email test recipients are local secrets. Copy `tools/email-send-test/.env.example` to `tools/email-send-test/.env`, then set `EMAIL_SEND_TEST_TO` to a comma-separated list of recipient addresses. The real `.env` file is ignored by Git.

```powershell
npm run email-send-test:run
```

### Local Email Webhook Testing

Resend webhook events are received by `svc-core` at:

```text
POST /webhooks/email-events
```

For local development, expose the local API with a temporary Cloudflare Tunnel. Start these in separate PowerShell windows from the repository root.

Start the API:

```powershell
npm run api:dev
```

Start the tunnel:

```powershell
npm run email-webhooks:tunnel
```

The tunnel command prints a full temporary `trycloudflare.com` base URL. In Resend, configure the webhook endpoint by appending `/webhooks/email-events` to that base URL:

```text
<cloudflare-base-url>/webhooks/email-events
```

For example, if Cloudflare prints:

```text
https://kings-cents-dakota-win.trycloudflare.com
```

then the Resend webhook endpoint is:

```text
https://kings-cents-dakota-win.trycloudflare.com/webhooks/email-events
```

Then send a test email:

```powershell
npm run email-send-test:run
```

Webhook summaries are appended to:

```text
logs/email-events-webhook.jsonl
```

Webhook events are also stored in SQL Server:

```text
dbo.EmailDelivery       latest delivery state per provider email id and recipient
dbo.EmailDeliveryEvent  append-only event history
```

Internal API endpoints for display:

```text
GET /internal/email-deliveries
GET /internal/email-deliveries/:emailDeliveryId/events
```

These are internal endpoints and require the `x-admin-key` header.

Watch the log while testing:

```powershell
npm run email-webhooks:watch
```

Browser code must not receive SMTP credentials. Publisher-facing workflows should call a server-side API or service that imports `@cm/email`.

## Developer Workflow

A typical local loop is:

```powershell
cd C:\cm-platform
npm install
npm run infra:up
npm run api:dev
```

In another PowerShell window:

```powershell
npm run publisher:dev
```

Before handing off work:

```powershell
npm run build
npm run api:verify
```

When API data is available:

```powershell
npm run api:test:internal
```

## Notes On PowerShell Buy-In

Choosing PowerShell as the project command surface is intentional. It gives the project one documented way to run local automation on Windows, keeps scripts close to the team's operating environment, and lets us grow repeatable `.ps1` workflows for setup, smoke testing, backups, ETL operations, and future deployment helpers.

When adding new scripts, prefer one of these patterns:

```powershell
npm run thing:action
```

or:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/some/task.ps1
```

Avoid adding parallel Bash-only workflows unless there is a specific cross-platform requirement.

## Dedication

Dedicated to my father, Clyde Masters, whose work ethic and encouragement continue to inspire me.
