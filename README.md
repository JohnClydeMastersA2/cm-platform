# CM Platform

CM Platform is an application and infrastructure project that uses multiple technologies to build and demonstrate practical platform capabilities. It combines a Fastify API, a React web application, background workers, a Spring Boot healthcare transformation service, shared TypeScript packages, data stores, messaging, email delivery, container workflows, and Azure infrastructure as code.

The repository is under active development. Some features are production-oriented foundations, while others are intentionally visible demonstrations of messaging, identity, data, and operational patterns.

## Technology Overview

- Node.js 24, TypeScript, Fastify, React, and Vite
- Java 21 and Spring Boot
- SQL Server, MongoDB, and RabbitMQ
- Docker Compose for local infrastructure and production-like verification
- Azure Bicep and GitHub Actions for cloud infrastructure and deployment
- PowerShell as the primary local automation environment

## Repository Structure

```text
apps/svc-core                 Fastify API service
apps/public-web               React web application
apps/public-web               legacy Vite web application
packages/auth                 password and token primitives
packages/contracts            shared API validation contracts
packages/email                SMTP email delivery
packages/logging              shared structured logging
packages/messaging            RabbitMQ contracts and topology
packages/secrets              local secret-loading support
services/email-dispatcher     queued email delivery worker
services/widget-consumer      competing-consumer demonstration workers
services/demo-maintenance     scheduled demo-data maintenance worker
services/healthcare-transform Java/Spring healthcare document service
tools/etl-csv-import          IIS log ETL utility
tools/email-send-test         email integration test client
tools/sql-migrate             SQL migration and identity utility
docker                        images and local Compose environments
infra/bicep                   Azure infrastructure as code
scripts                       PowerShell automation and smoke tests
.github/workflows             CI, security analysis, and deployment workflows
docs                          architecture, strategy, and operational notes
```

`apps/public-web` is the canonical React frontend served by the production-style Docker image.

## Prerequisites

For the primary local development workflow:

- Windows with PowerShell
- Node.js 24 and npm
- Docker Desktop with the Docker engine running

For healthcare service development, also install Java 21. The checked-in Maven wrapper supplies Maven. Azure CLI and Bicep are only needed for infrastructure work.

Commands in this document assume the current directory is the cloned repository root.

## First-Time Setup

Install the JavaScript workspace dependencies:

```powershell
npm install
```

Create the ignored local secrets file from the committed template:

```powershell
Copy-Item packages/secrets/cm-platform.env.example packages/secrets/cm-platform.env
```

Replace every required placeholder in that file. It defines local SQL Server, RabbitMQ, MongoDB, API administration, SMTP, webhook, and maintenance settings. Development-only defaults such as unencrypted local database connections and trusted development certificates must not be copied into production configuration.

Real `.env` files, credentials, recipient lists, and tokens must never be committed. See [SECURITY.md](SECURITY.md) for the project security policy.

## Quick Start

Start Docker Desktop and wait for its engine to become ready. Then start SQL Server, MongoDB, and RabbitMQ:

```powershell
npm run infra:up
```

Apply pending database migrations:

```powershell
npm run db:migrate
```

Start the API in a separate PowerShell window:

```powershell
npm run api:dev
```

Start the current React web application in another window:

```powershell
npm run public:dev
```

The normal local endpoints are:

```text
Web:                 http://localhost:5173
API:                 http://localhost:3000
RabbitMQ management: http://localhost:15672
MongoDB:             mongodb://localhost:27017
SQL Server:          localhost:1433
```

The root `npm run dev` command starts infrastructure and the API, but not the web application.

## Common Commands

### Build and verification

```powershell
npm run build                 # build all Node/TypeScript workspace targets
npm run core:build            # build API dependencies, API, and background services
npm run api:verify            # check GET /health and GET /ready
npm run api:test:internal     # exercise protected internal API endpoints
npm run clean                 # run the configured workspace cleanup scripts
npm run all:rebuild           # clean and rebuild Node/TypeScript targets
```

The root build covers the shared packages, API, Node background services, current React frontend, ETL tool, email test client, and SQL migration tool. The Java healthcare service has a separate Maven build and is tested separately in CI:

```powershell
Set-Location services/healthcare-transform
.\mvnw.cmd test
```

### Infrastructure and workers

```powershell
npm run infra:status
npm run infra:logs
npm run infra:workers:build
npm run infra:workers:up
npm run infra:workers:logs
npm run infra:workers:down
npm run infra:down
```

`infra:workers:up` starts the email dispatcher and fast and slow widget consumers. For active worker development, use the service-specific `*:dev` scripts instead.

### Database migrations

Migration files live in `scripts/db/migrations` and are applied by `tools/sql-migrate`.

```powershell
npm run db:check
npm run db:migrate
npm run db:check:migration-permissions
npm run db:check:app-permissions
npm run db:verify:core-schema
```

`npm run db:schema` remains as an alias for `npm run db:migrate`.

### Production-like local environment

The production-like Compose environment builds and runs the React frontend, API, email dispatcher, and widget consumers as containers:

This environment is a final local confidence check before deployment. During normal development, Vite and the API run directly on the host with development tooling, live reload, and host-based network addresses. Production runs compiled applications inside separate containers, where startup commands, image contents, environment variables, service names, ports, reverse-proxy routing, and container-to-container networking are different. The production-like commands exercise those deployment conditions together and `prod-local:verify` confirms that the assembled system is reachable and healthy. You do not need to run this environment for every code change; use it after changing Dockerfiles, runtime configuration, networking, or multiple services, and before treating a release candidate as deployable.

Despite the name, this environment does **not** connect to MongoDB Atlas, Azure SQL, a managed RabbitMQ service, or other cloud data services by default. It starts local Docker containers for MongoDB, SQL Server, and RabbitMQ, and the application containers address them by their Compose service names. The smoke test checks this entirely local system through `http://localhost:8080`. Building the environment may download base images and npm packages, and a deliberately exercised email workflow can contact the configured SMTP provider, but the normal startup and `prod-local:verify` checks do not send email or test managed cloud services. Pointing a container URL in the secrets file at an external service would change this behavior and should be treated as an explicit integration test, not the standard production-like local workflow.

```powershell
npm run prod-local:build
npm run prod-local:up
npm run prod-local:verify
npm run prod-local:logs
npm run prod-local:down
```

## Application Components

### API and identity

`apps/svc-core` exposes health and readiness endpoints, account registration and login, internal administration routes, messaging demonstrations, platform status, and email webhook ingestion. The identity slice includes email verification, password authentication, server-side sessions, logout, and demo-account deletion.

Authentication uses HTTP-only, same-site session cookies. State-changing browser requests use CSRF protection, and registration and login have application-level rate limits. These controls do not replace production edge protections or distributed rate limiting.

### Messaging and background services

RabbitMQ supports queued email delivery and the competing-consumer, topic-routing, and priority-queue demonstrations. Shared message definitions live in `packages/messaging`; applications should use its qualified domain imports.

`services/demo-maintenance` handles maintenance of demonstration data. `services/email-dispatcher` sends queued mail through `packages/email`, and `services/widget-consumer` processes widget work against shared SQL state.

### Healthcare transformation

`services/healthcare-transform` is an internal Java 21/Spring Boot service. Its current slice provides health, readiness, capability discovery, and initial ASC X12 835 parsing. It is not yet wired into `svc-core` or the public web application. See [its service README](services/healthcare-transform/README.md).

### Email webhooks

The API receives Resend events at `POST /webhooks/email-events` and stores authoritative event documents in MongoDB. Production refuses webhook processing when `RESEND_WEBHOOK_SECRET` is absent; unsigned webhook processing is available only outside production for local development.

For a local temporary tunnel, run the API and then:

```powershell
npm run email-webhooks:tunnel
```

Append `/webhooks/email-events` to the generated tunnel URL when configuring the development webhook endpoint.

## Data Safety

Local SQL Server files are stored in the external Docker volume `docker_mssql_data`. Normal `infra:down` and `infra:restart` operations do not delete it.

Commands such as `docker compose down -v`, `docker volume rm`, `docker volume prune`, and `docker system prune --volumes` can destroy local developer data. Back up intentional data before performing destructive Docker maintenance.

RabbitMQ and MongoDB also use persistent Docker volumes, named `cm_platform_rabbitmq_data` and `cm_platform_mongodb_data` by the development Compose project.

## CI/CD and Cloud Infrastructure

GitHub Actions build the Node and Java components, test the healthcare service, build deployable container images, publish images to GitHub Container Registry on supported events, run CodeQL analysis, and validate or deploy Azure infrastructure.

Azure resources are defined under `infra/bicep`. Infrastructure and deployment workflows require repository environments, identities, permissions, and secrets that are not part of the basic local setup.

## Security Testing

The versioned ZAP automation plan at `security/zap.yaml` performs a short spider and passive baseline scan of the public site. It does not run active attack rules, but it does send requests to `https://cmplatform.dev`; run it only when you are authorized to test that deployment:

```powershell
.\scripts\security\run-zap-baseline.ps1 -ConfirmProductionScan
```

The script runs `ghcr.io/zaproxy/zaproxy:stable` in a temporary Docker container and removes the container afterward. Add `-PullLatestImage` when you intentionally want to refresh the local stable image before scanning. Generated HTML and JSON reports are written to the ignored `security-reports/` directory. The reusable plan and runner are versioned; scan results are local, point-in-time artifacts and may contain deployment details, so review and share them deliberately.

## Documentation

Supporting design, architecture, and operational material lives under `docs/`. Some documents capture current strategy while others are historical working notes; review their status before treating them as authoritative. A broader documentation audit is planned separately.

## Command Conventions

PowerShell is the primary local command environment. Prefer root npm scripts as the stable command surface:

```text
thing:action
```

Examples include `api:dev`, `db:migrate`, `public:build`, and `infra:up`. Run long-lived applications, workers, tunnels, and log watchers in separate PowerShell windows so each retains visible output.

## Dedication

Dedicated to my father, Clyde Masters, whose work ethic and encouragement continue to inspire me.
