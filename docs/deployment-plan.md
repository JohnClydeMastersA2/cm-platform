# Deployment and CI/CD Plan

Last reviewed: June 18, 2026

## Purpose

Deploy CM Platform as a public portfolio environment at:

```text
https://cmplatform.dev
```

The deployment should:

- keep recurring cost close to zero while traffic is low;
- demonstrate modern container, infrastructure-as-code, CI/CD, identity, security, and observability practices;
- preserve the current SQL Server, MongoDB, RabbitMQ, Fastify, worker, and Vite architecture;
- provide a credible upgrade path without over-engineering a portfolio workload.

This is a production-like public demonstration environment, not a highly available commercial production system. The distinction should be stated in the portfolio and runbooks.

The CI/CD work should also produce public-facing portfolio material. As decisions are made, capture concise explanations, tradeoffs, diagrams, and verification evidence that can later become a `public-web` page describing how CM Platform is built, tested, containerized, deployed, monitored, and operated.

## Recommendation

Use a small managed, multi-provider architecture:

| Capability | Recommended service | Initial cost target |
| --- | --- | --- |
| DNS, TLS, basic edge protection | Cloudflare Free | $0 |
| Public web and API | Azure Container Apps Consumption | Usually $0 at portfolio traffic |
| Container images | GitHub Container Registry | $0 for public images |
| Relational database | Azure SQL Database free offer | $0 within monthly allowance |
| Document database | MongoDB Atlas M0 | $0 |
| RabbitMQ | CloudAMQP Little Lemur | $0 |
| Transactional email | Existing Resend account | Existing/free allowance |
| CI/CD | GitHub Actions | $0 within included minutes |
| Logs and metrics | Azure Log Analytics low-volume configuration | $0-$5 target |

Expected initial recurring infrastructure cost:

```text
Target: $0-$5/month, excluding the domain registration and unexpected overage.
Hard budget alert: $5
Review threshold: $10
```

Free tiers and prices can change. Recheck provider pricing before provisioning and once per quarter.

## Why This Option

This design provides more portfolio value than placing every component on one virtual machine:

- container images and immutable releases;
- serverless container scaling and revision rollbacks;
- managed SQL backups and patching;
- separate managed RabbitMQ and MongoDB services;
- workload identity from GitHub to Azure;
- protected deployment environments;
- infrastructure as code;
- independent health checks and production smoke tests;
- useful experience with cost controls and cloud boundaries.

The tradeoffs are cold starts, several provider accounts, free-tier limits, and more networking configuration. Those tradeoffs are acceptable for a low-traffic learning environment.

## Proposed Architecture

```text
Browser
  |
  v
Cloudflare DNS/TLS
  |
  v
cmplatform.dev
Azure Container Apps ingress
  |
  +-- web gateway container
  |     +-- serves apps/public-web/dist
  |     +-- proxies API paths to svc-core on localhost
  |
  +-- svc-core sidecar
        +-- Azure SQL Database
        +-- MongoDB Atlas M0
        +-- CloudAMQP RabbitMQ

Separate Azure Container Apps:
  +-- email-dispatcher
  +-- widget-consumer-fast
  +-- widget-consumer-slow
```

The web gateway and API should share one Container App revision. This preserves the frontend's existing same-origin relative requests and HTTP-only session cookie behavior. Only the gateway receives public ingress; `svc-core` listens on an internal localhost port.

Use `cmplatform.dev` as the canonical host and redirect `www.cmplatform.dev` to it.

Production URL settings:

```text
AUTH_API_BASE_URL=https://cmplatform.dev
PUBLIC_WEB_BASE_URL=https://cmplatform.dev
NODE_ENV=production
```

The Resend webhook becomes:

```text
https://cmplatform.dev/webhooks/email-events
```

## Important Licensing Decision

The current local Compose file sets:

```text
MSSQL_PID=Developer
```

SQL Server Developer edition must not be used for a public production environment. The recommended Azure SQL Database removes that concern.

If a self-hosted SQL Server fallback is used, run a production-permitted edition such as Express and confirm that its resource and database-size limits remain suitable. Keep Developer edition local only.

## Service Configuration

### Public Web and API

Production multi-stage Dockerfiles now exist:

```text
docker/Dockerfile.api
docker/Dockerfile.public-web
docker/Dockerfile.email-dispatcher
docker/Dockerfile.widget-consumer
```

The recommended web image can contain:

- a small Caddy or Nginx gateway;
- the compiled Vite static files;
- the compiled API as a sidecar container in the same Container App.

Gateway routes:

```text
/                         static Vite application
/auth/*                   svc-core
/internal/*               svc-core
/widgets/*                svc-core
/consumer-widgets/*       svc-core
/topic-routing/*          svc-core
/priority-queue/*         svc-core
/platform/status*         svc-core
/email-webhook-events*    svc-core
/webhooks/*               svc-core
/health                    svc-core
/ready                     svc-core
```

Set the public Container App to:

```text
min replicas: 0 initially
max replicas: 2
CPU: 0.5 vCPU initially
memory: 1 GiB initially
health probe: GET /health
readiness probe: GET /ready
```

Cold starts are acceptable for the first release. If the portfolio needs instant response during an interview or demonstration, temporarily set the minimum replica count to one and monitor the cost.

### Workers

Deploy each worker independently so its scaling and logs are visible:

```text
cm-email-dispatcher
cm-widget-consumer-fast
cm-widget-consumer-slow
```

For the first release, use zero or one replica per worker. Prefer RabbitMQ/KEDA scaling where the CloudAMQP connection and Azure configuration support it. Otherwise, keep the email dispatcher at one low-resource replica during active demonstrations and scale demo consumers manually.

Do not run both widget consumers continuously merely to keep a status tile green. Treat them as demonstrable workloads that can be activated when needed.

### Azure SQL Database

Use one General Purpose serverless database from the Azure SQL free offer:

```text
database: CMPlatform
free-limit behavior: auto-pause until next month
public network access: restricted to required Azure access paths
TLS encryption: required
```

The application currently configures SQL with `encrypt: false` and `trustServerCertificate: true`. Production configuration must use encrypted transport and certificate validation.

Replace the local-only schema script with versioned migrations that can target both local SQL Server and Azure SQL. A migration must run as a distinct deployment job before the new application revision receives traffic.

### MongoDB Atlas

Use an M0 cluster in the Azure region closest to the Container App when available.

Configure:

- a dedicated application database user;
- least-privilege access to `CMPlatformDocuments`;
- a restricted network access list where practical;
- TLS through the Atlas connection string;
- alerts for storage and connection limits.

M0 is appropriate for a portfolio workload, not for availability-sensitive production data.

### RabbitMQ

Use CloudAMQP Little Lemur initially. Its current limits include a shared RabbitMQ broker, 20 connections, one million messages per month, 10,000 queued messages, and a 28-day maximum idle queue time.

Implications:

- keep connection pools small;
- confirm queues are recreated on application startup;
- do not treat the free broker as durable archival storage;
- alert or log clearly when messaging is unavailable;
- document that the plan is provider-labeled for development.

Move to a paid broker or self-hosted RabbitMQ if the public demo becomes business-critical.

## Environments

Use three logical environments:

| Environment | Trigger | Purpose |
| --- | --- | --- |
| Local | Developer command | Full Docker-based development |
| Preview/CI | Pull request | Build, test, scan; no persistent cloud deployment initially |
| Production | Merge to `main` plus approval | Public `cmplatform.dev` release |

Do not create a permanent cloud staging environment at first. It adds cost and operational work without enough portfolio benefit. Add ephemeral preview deployments later after the production pipeline is stable.

Create a GitHub Environment named `production` with:

- required manual approval;
- deployment branch restricted to `main`;
- environment URL set to `https://cmplatform.dev`;
- only environment-specific non-Azure secrets;
- concurrency set so only one production deployment runs at a time.

## CI Pipeline

Keep CI separate from deployment.

Run on every pull request and push to `main`:

1. Check out the exact commit.
2. Install Node 24 with npm cache.
3. Run `npm ci`.
4. Run formatting and lint checks once those scripts exist.
5. Run TypeScript builds.
6. Run unit tests.
7. Run integration tests against disposable SQL Server, MongoDB, and RabbitMQ service containers.
8. Build all production Docker images.
9. Scan dependencies and images.
10. Upload concise test and scan reports.

Recommended required branch checks:

```text
build
unit-tests
integration-tests
container-build
codeql
dependency-review
```

Move the normal build job from `windows-latest` to `ubuntu-latest` after confirming the build is cross-platform. Keep a small Windows job only for PowerShell scripts that genuinely require Windows. Linux runners are faster and consume fewer GitHub Actions minutes than the current Windows-only build.

Pin third-party GitHub Actions to commit SHAs, use minimal `permissions`, and enable Dependabot updates for npm, Docker, and GitHub Actions.

## CD Pipeline

Trigger production CD after CI succeeds on `main`, or from a signed version tag after the first few releases.

Deployment flow:

1. Authenticate to Azure with GitHub OIDC.
2. Build each image once.
3. Tag images with the immutable Git commit SHA.
4. Push images to GHCR.
5. Apply infrastructure changes with Bicep.
6. Run the database migration job.
7. Deploy worker revisions.
8. Deploy the public web/API revision.
9. Wait for readiness.
10. Run production smoke tests.
11. Mark the GitHub deployment successful.

Use semantic release tags later:

```text
sha-<git-sha>     immutable deployment tag
v0.1.0            human release tag
```

Never deploy `latest` as the only image reference.

### GitHub to Azure Identity

Use an Entra application or user-assigned managed identity with a federated credential scoped to the GitHub `production` environment. GitHub OIDC exchanges a short-lived token and avoids storing a long-lived Azure client secret.

Grant the deployment identity only the roles required to update this application's resource group. Do not grant subscription Owner or broad Contributor access.

## Infrastructure as Code

Use Azure Bicep because this deployment is Azure-centered and the learning curve is smaller than introducing Terraform solely for one cloud.

Suggested layout:

```text
infra/
  bicep/
    main.bicep
    modules/
      container-app-environment.bicep
      container-app-web.bicep
      container-app-worker.bicep
      log-analytics.bicep
      sql.bicep
    parameters/
      production.bicepparam
```

Cloudflare, MongoDB Atlas, CloudAMQP, and Resend may be configured manually for the first release, with their non-secret identifiers documented. Automate them later only when the learning value exceeds the maintenance cost.

## Secrets

Production must not use `packages/secrets/cm-platform.env`.

Store runtime secrets as Azure Container Apps secrets and reference them from environment variables:

```text
DB_SERVER
DB_PORT
DB_USER
DB_PASSWORD
DB_DATABASE
ADMIN_KEY
RABBITMQ_URL
MONGODB_URI
MONGODB_DATABASE
EMAIL_SMTP_USER
EMAIL_SMTP_PASS
```

Keep non-secret settings in Bicep:

```text
NODE_ENV
LOG_LEVEL
PORT
HOST
AUTH_API_BASE_URL
PUBLIC_WEB_BASE_URL
EMAIL_DISPATCHER_PREFETCH
WIDGET_CONSUMER_NAME
WIDGET_CONSUMER_PROCESSING_SECONDS
```

Do not print secret-bearing connection strings in CI logs. Rotate any credential that has ever been committed or exposed.

Azure Key Vault can be added later to demonstrate secret lifecycle and managed identity. It is not required for the first low-cost release.

## Security Readiness

Complete these items before public launch:

- enable encrypted Azure SQL connections and certificate validation;
- add graceful `SIGTERM`/`SIGINT` shutdown to `svc-core`;
- add security response headers at the gateway;
- add request body limits and rate limits to registration, login, and webhook endpoints;
- verify webhook signatures before storing Resend events;
- disable or strongly protect `/internal`;
- review public demo endpoints that create, process, or delete data;
- add CSRF protection for cookie-authenticated state-changing routes;
- add login and registration abuse controls;
- ensure production errors do not expose connection details or stack traces;
- use a long random `ADMIN_KEY` and preferably replace it later with real authorization;
- confirm account deletion behavior is appropriate for a public environment;
- define retention and cleanup for sessions, auth challenges, demo rows, and webhook documents.

Cloudflare proxying can provide TLS, basic DDoS protection, and optional rate limiting. Do not expose database, MongoDB, RabbitMQ, or management ports publicly.

## Observability

Retain structured JSON logs already emitted by the Node services.

Minimum production signals:

```text
HTTP request count, latency, and 5xx rate
Container restarts and failed revisions
GET /health and GET /ready availability
SQL connection and query failures
MongoDB connection failures
RabbitMQ connection, queue depth, retry, and dead-letter counts
Email dispatch success/failure
Authentication failures and rate-limit events
Deployment SHA per service
```

Configure:

- Azure Container Apps logs with a short retention period;
- Azure budget and cost anomaly alerts;
- Azure SQL free-vCore remaining alert at 10%;
- MongoDB Atlas storage/connection alerts;
- CloudAMQP quota/connection alerts;
- an external uptime check for `https://cmplatform.dev/health`;
- a private synthetic login test only after test-account handling is defined.

Never log passwords, session tokens, verification tokens, SMTP credentials, or complete connection strings.

## Backups and Recovery

Azure SQL's free offer currently includes backup storage and limited point-in-time restore. Treat that as the primary relational recovery mechanism.

Additionally:

- take an encrypted logical SQL export before risky schema changes;
- export important MongoDB documents periodically because M0 is a learning tier;
- store backup artifacts outside the running application;
- test restore procedures quarterly;
- document recovery time and recovery point expectations.

Initial objectives:

```text
RPO: 24 hours
RTO: 4 hours
```

RabbitMQ messages are transient workflow state and should not be the sole record of a business event.

## Rollback

Application rollback:

1. Keep at least the previous healthy Container Apps revision.
2. Move traffic back to that immutable revision.
3. Verify `/health`, `/ready`, login, and a read-only data path.

Database rollback:

- favor backward-compatible expand-and-contract migrations;
- do not automatically roll back destructive migrations;
- restore from backup only through a documented, manually approved procedure.

Every deployment should record the Git SHA, image digest, migration version, actor, and timestamp.

## Cost Controls

Before launch:

- create a $5 monthly Azure budget alert and a second alert at $10;
- set Azure SQL free-limit behavior to pause rather than bill;
- cap Container Apps maximum replicas;
- use zero minimum replicas initially;
- keep Log Analytics retention and ingestion low;
- avoid Azure Container Registry initially by using GHCR;
- do not create paid NAT gateways, private endpoints, Front Door, Application Gateway, or a permanent staging environment;
- review all cloud resources monthly and delete abandoned revisions and artifacts.

The first month should be treated as a measurement period. Record actual cold-start time, compute use, log ingestion, database vCore consumption, and CI minutes.

## Immediate Start

The CI/CD slice should start in the repository before cloud resources are created. This keeps the learning sequence grounded in repeatable build artifacts and avoids creating billable infrastructure before the application can prove it is deployable.

As each slice lands, record the portfolio story while the reasoning is fresh:

- the problem being solved;
- the decision made;
- the tradeoff accepted;
- the evidence that it works;
- what remains intentionally out of scope.

These notes should be suitable for a future `public-web` CI/CD portfolio page rather than only for private operational memory.

Step 1 is the CI baseline:

- keep the current SQL Server direction;
- keep `admin-web` out of scope;
- verify a clean checkout with `npm ci` and `npm run build`;
- move the build workflow toward Linux runners while retaining Windows only where PowerShell-specific coverage is needed;
- add explicit placeholder jobs for the checks that will become required later, such as lint, tests, container build, and dependency scanning;
- document branch protection expectations for `main`.

Exit criterion:

```text
Every push and pull request proves the current monorepo builds from scratch in GitHub Actions.
```

Portfolio note:

```text
The first CI/CD slice moved the primary build workflow from a Windows runner to a Linux runner so the repository is tested in an environment closer to the future production container runtime. This demonstrates GitHub Actions fundamentals: event triggers, hosted runners, Node setup, dependency caching, clean installs, monorepo build orchestration, and required-check readiness.
```

Recommended `main` branch protection after the first CI baseline is stable:

- require pull requests before merging;
- require the `Build` status check;
- require the `CodeQL` status check;
- require branches to be up to date before merging;
- block force pushes;
- block branch deletion;
- allow repository administrators to bypass only when an emergency fix is needed;
- defer stricter rules, such as signed commits and required linear history, until the deployment pipeline is less experimental.

Branch protection should be enabled after verifying that local development, CI, and deployment changes can still move at a reasonable learning pace. The policy should make quality visible without trapping the project behind unfinished automation.

Step 2 is the production image baseline:

- add `.dockerignore`;
- add production Dockerfiles for `svc-core`, `public-web`, `email-dispatcher`, and `widget-consumer`;
- add a same-origin web gateway for static files and API proxying;
- build the images locally;
- run the images locally against the existing Docker development infrastructure;
- add a CI job that builds the production images without pushing them.

Exit criterion:

```text
The application can be built into immutable production-style images, and CI can prove those images compile.
```

Portfolio note:

```text
The second CI/CD slice introduced production-style container images for the public web gateway, API, email dispatcher, and widget consumer. The web image serves the compiled Vite site through Nginx and proxies same-origin API paths to the API sidecar, preserving browser cookie behavior. The CI workflow now includes a container-build job that validates image construction without pushing or deploying anything.
```

Evidence captured during implementation:

- `npm run build` passed locally;
- `docker build -f docker/Dockerfile.api -t cm-platform/svc-core:local .` passed;
- `docker build -f docker/Dockerfile.public-web -t cm-platform/public-web:local .` passed;
- `docker build -f docker/Dockerfile.email-dispatcher -t cm-platform/email-dispatcher:local .` passed;
- `docker build -f docker/Dockerfile.widget-consumer -t cm-platform/widget-consumer:local .` passed;
- `docker run --rm cm-platform/public-web:local nginx -t` passed.

This slice proves image construction, not full production runtime behavior. Full runtime validation still needs a production-like Compose file or Azure Container Apps revision with real environment variables, managed data services, health probes, and smoke tests.

Security maintenance follow-up:

```text
After adding the container-build job, GitHub and npm audit surfaced dependency advisories in the JavaScript toolchain and email package. The follow-up maintenance slice updated the affected direct dependencies, verified `npm audit` returned zero known vulnerabilities, rebuilt source, and rebuilt all production baseline images. This demonstrates that CI/CD includes ongoing supply-chain hygiene, not only application packaging.
```

Step 3 is the production-like local runtime baseline:

- add a `docker/compose.prod-local.yml` file that runs production images against local SQL Server, MongoDB, and RabbitMQ;
- preserve the planned Azure sidecar behavior by sharing the API container network namespace with the public web gateway container;
- expose only the web gateway on local port `8080`;
- add scripts to build, start, stop, log, and verify the prod-local runtime;
- smoke test the public page, `/health`, `/ready`, unauthenticated `/auth/me`, and `/platform/status`.

Exit criterion:

```text
The production-built images can start locally, the web gateway can proxy to the API through localhost sidecar routing, dependencies are reachable, and a smoke test passes through the gateway.
```

Portfolio note:

```text
The third CI/CD slice moved from "the images compile" to "the images actually run together." The prod-local Compose topology mirrors the planned Azure Container Apps sidecar design by having Nginx proxy same-origin browser requests to the API over localhost, while workers connect to local SQL Server and RabbitMQ through injected environment variables.
```

Evidence captured during implementation:

- `npm run prod-local:build` passed;
- `npm run prod-local:up` prepared local infrastructure, applied schema, and started the production images;
- `npm run prod-local:verify` passed against `http://localhost:8080`;
- `GET /health` returned `200` through Nginx;
- service logs showed `svc-core`, `email-dispatcher`, `widget-consumer-fast`, and `widget-consumer-slow` ready.

This slice still uses local SQL Server Developer edition and local Docker volumes. It proves runtime wiring, not production licensing, cloud networking, managed secrets, or Azure availability.

Azure account creation starts after Step 3, unless an account already exists. The first Azure tasks should be non-application setup: subscription confirmation, budget alerts, resource group naming, and OIDC planning. Avoid creating Container Apps, Azure SQL, or Log Analytics resources until the local/CI image and runtime baselines are working.

Step 4 is the image publication baseline:

- keep CI and CD separate;
- publish production images to GitHub Container Registry only from `main` or manual dispatch;
- tag each image with the immutable Git SHA;
- avoid using `latest` as the deployment contract;
- grant the workflow only the package write permission needed to push images;
- record image names in the GitHub Actions job summary.

Exit criterion:

```text
Every merge to main can produce immutable, SHA-tagged images in GHCR without creating Azure resources or deploying the application.
```

Portfolio note:

```text
The fourth CI/CD slice separates packaging from deployment. GitHub Actions builds the same production images proven by local Compose, authenticates to GHCR with short-lived workflow credentials, and publishes immutable SHA-tagged artifacts that a later Azure deployment can reference exactly.
```

Expected image names:

```text
ghcr.io/johnclydemastersa2/cm-platform/svc-core:<git-sha>
ghcr.io/johnclydemastersa2/cm-platform/public-web:<git-sha>
ghcr.io/johnclydemastersa2/cm-platform/email-dispatcher:<git-sha>
ghcr.io/johnclydemastersa2/cm-platform/widget-consumer:<git-sha>
```

After Step 4, create or confirm the Azure subscription, add a $5 budget alert, reserve naming for the production resource group, and configure GitHub-to-Azure OIDC before creating application infrastructure.

Step 5 is the Azure foundation baseline:

- create or confirm the Azure account and subscription;
- create a subscription-level monthly budget alert before application resources are created;
- reserve a resource group name and primary Azure region;
- decide the production naming convention for Container Apps, Azure SQL, Log Analytics, and managed identities;
- create a GitHub `production` environment with manual approval;
- plan GitHub OIDC federation so deployment can use short-lived Azure tokens instead of a stored Azure password;
- do not create Container Apps, Azure SQL, Log Analytics, or public DNS records in this step.

Exit criterion:

```text
The Azure subscription has cost guardrails, names are reserved, and the identity model is documented before any billable application resources are created.
```

Recommended initial Azure choices:

```text
Subscription: user-owned Azure subscription
Budget: $5/month actual cost alert, optional $10 review threshold
Resource group: rg-cm-platform-prod
Region: eastus or the closest low-cost region with required services
Container Apps environment: cae-cm-platform-prod
Log Analytics workspace: log-cm-platform-prod
Deployment identity: mi-cm-platform-github-deploy or app registration equivalent
GitHub environment: production
Production URL: https://cmplatform.dev
```

Evidence captured during implementation:

- Azure subscription confirmed: `Azure subscription 1`;
- primary Azure region selected: `East US`;
- Azure monthly budget alert created;
- GitHub Environment created: `production`.

Learning note:

```text
This slice is intentionally administrative. Modern CI/CD is not only a YAML file; it also includes cost controls, environment protection, least-privilege deployment identity, and naming discipline before the first cloud resource is deployed.
```

Step 6 is the GitHub-to-Azure OIDC baseline:

- create the production Azure resource group before application resources are created;
- create a Microsoft Entra application/service principal for GitHub Actions deployment;
- add a federated credential that trusts only this repository's GitHub `production` environment;
- grant the deployment identity access only to the production resource group, not the whole subscription;
- store only non-secret Azure identifiers in the GitHub `production` environment;
- add a manual GitHub Actions workflow that proves Azure login with OIDC and runs a read-only Azure command.

Recommended Azure portal values:

```text
Resource group: rg-cm-platform-prod
Resource group region: East US
Entra application name: app-cm-platform-github-deploy
Federated credential name: github-cm-platform-production
Issuer: https://token.actions.githubusercontent.com
Subject: repo:JohnClydeMastersA2/cm-platform:environment:production
Audience: api://AzureADTokenExchange
Initial role scope: rg-cm-platform-prod
Initial role: Contributor, narrowed later if practical
```

Recommended GitHub `production` environment values:

```text
AZURE_CLIENT_ID=<Entra application client ID>
AZURE_TENANT_ID=<Azure directory tenant ID>
AZURE_SUBSCRIPTION_ID=<Azure subscription ID>
```

These values identify Azure resources but are not passwords. Still keep them in the protected `production` environment so deployment configuration stays with deployment approvals.

Exit criterion:

```text
A manually approved GitHub Actions workflow can authenticate to Azure through OIDC and run `az account show` without any Azure client secret stored in GitHub.
```

Portfolio note:

```text
The sixth CI/CD slice replaces long-lived cloud credentials with workload identity federation. GitHub Actions receives permission to request a short-lived OIDC token only when a workflow targets the protected production environment, and Azure accepts that token only for the configured repository/environment subject.
```

Local tooling evidence:

- Azure CLI installed on the development workstation: `azure-cli 2.87.0`;
- current Codex shell may require the full path until a new terminal refreshes `PATH`: `C:\Program Files\Microsoft SDKs\Azure\CLI2\wbin\az.cmd`.

Evidence captured during implementation:

- production resource group confirmed: `rg-cm-platform-prod` in `eastus`;
- Microsoft Entra application created: `app-cm-platform-github-deploy`;
- service principal created for the deployment identity;
- federated credential created for the GitHub `production` environment subject;
- Contributor role assigned only at the `rg-cm-platform-prod` resource-group scope;
- GitHub `production` environment variables set for Azure client, tenant, and subscription identifiers;
- manual OIDC verification workflow added: `.github/workflows/azure-oidc-check.yml`;
- manually approved GitHub `production` environment gate allowed the OIDC verification run to continue;
- Azure OIDC verification run succeeded against `rg-cm-platform-prod`;
- `azure/login` upgraded from `v2` to `v3` after GitHub warned that the `v2` action targeted deprecated Node.js 20 metadata.

Step 7 is the infrastructure-as-code validation baseline:

- add the initial Azure Bicep layout under `infra/bicep`;
- model only the first low-cost shared Azure foundation resources;
- keep application containers, Azure SQL, secrets, custom domains, and public ingress out of scope for this slice;
- add a GitHub Actions workflow that builds Bicep on infrastructure changes;
- add a manual, production-approved workflow path that validates the Bicep template against Azure through OIDC;
- do not deploy resources from CI yet.

Initial Bicep resources:

```text
Log Analytics workspace: log-cm-platform-prod
Container Apps managed environment: cae-cm-platform-prod
```

Exit criterion:

```text
Bicep source can be built locally and in GitHub Actions, and Azure can validate the template against rg-cm-platform-prod without deploying resources.
```

Portfolio note:

```text
The seventh CI/CD slice introduces infrastructure as code before deployment. Bicep gives the Azure foundation a reviewable, version-controlled source of truth, while the GitHub workflow separates syntax/build validation from a manually approved Azure validation step.
```

Evidence captured during implementation:

- Bicep CLI installed through Azure CLI: `0.44.1`;
- Bicep source added: `infra/bicep/main.bicep`;
- production parameters added: `infra/bicep/parameters/production.bicepparam`;
- generated Bicep JSON ignored with `infra/bicep/.gitignore`;
- manual validation workflow added: `.github/workflows/bicep-validate.yml`;
- local `az bicep build --file infra/bicep/main.bicep` passed;
- local `az deployment group validate` against `rg-cm-platform-prod` returned `Succeeded`;
- automatic GitHub `Bicep Build` passed on push;
- manual GitHub `Azure Validate` passed after `production` approval without deploying resources.

## Delivery Phases

### Phase 0: Production Readiness

- Add automated tests for auth, health/readiness, queue publishing, and data repositories.
- Add lint and formatting scripts.
- Add graceful API shutdown.
- Add production SQL TLS configuration.
- Add rate limiting, CSRF protection, and webhook signature verification.
- Replace the local schema script with versioned migrations.
- Decide which demo mutation endpoints are public.

Exit criterion: CI can prove a clean checkout is buildable and testable without developer-machine state.

### Phase 1: Containerization

- Added `.dockerignore`.
- Added production multi-stage Dockerfiles.
- Added the same-origin web gateway configuration.
- Added and verified a production-like local Compose runtime.
- Confirm health checks, shutdown, and read-only filesystems where possible.

Exit criterion: the complete application runs locally from immutable production images.

### Phase 2: Infrastructure

- Create the Azure resource group and Bicep modules.
- Create Azure SQL free database.
- Create MongoDB Atlas M0 and CloudAMQP instances.
- Configure Container Apps secrets.
- Configure GitHub OIDC federation.
- Set Azure budgets and provider alerts.

Exit criterion: infrastructure can be recreated from documented inputs without application deployment.

### Phase 3: CI/CD

- Expand CI into build, test, integration, and image jobs.
- Publish SHA-tagged images to GHCR.
- Add the protected production deployment workflow.
- Run migrations as a controlled job.
- Add smoke tests and revision rollback instructions.

Exit criterion: merging an approved pull request can deploy the exact tested commit with no manual file copying or server login.

### Phase 4: Domain Launch

- Add `cmplatform.dev` as the Container Apps custom domain.
- Validate ownership and managed certificate issuance.
- Proxy DNS through Cloudflare only after Azure domain validation is complete.
- Redirect `www` to the apex.
- Update Resend webhook URL and verify its signature secret.
- Run launch smoke tests.

Exit criterion: HTTPS, registration, verification email, login, logout, data demonstrations, webhook ingestion, and worker processing work from the public domain.

### Phase 5: Operate and Learn

- Observe costs and free-tier consumption for 30 days.
- Perform one application rollback drill.
- Perform one database restore drill.
- Document one incident-style exercise.
- Publish an architecture diagram and deployment write-up in the portfolio.

Exit criterion: the project demonstrates operation and recovery, not only deployment.

## Launch Checklist

```text
[ ] CI required checks pass
[ ] Production images are SHA-tagged and scanned
[ ] Database migrations are versioned and tested
[ ] SQL transport encryption is enabled
[ ] Production secrets are in the platform secret store
[ ] No production secret exists in the repository or image
[ ] Internal and destructive demo routes are protected
[ ] Auth abuse controls and CSRF protection are enabled
[ ] Resend webhook signatures are verified
[ ] Health and readiness probes pass
[ ] External uptime check passes
[ ] Budget and quota alerts are active
[ ] Backup and rollback procedures are tested
[ ] cmplatform.dev and www redirect use valid HTTPS
[ ] Production smoke test passes
```

## Production Smoke Test

Automate a non-destructive post-deployment test:

```text
GET  /health                         200
GET  /ready                          200
GET  /                               200 and expected page marker
GET  /platform/status                200 with dependency status
GET  /auth/me                        401 without a session
```

Keep account registration and email sending out of every deployment smoke test to avoid provider quota use. Run those as a scheduled or manually approved end-to-end test with a dedicated test account.

## Alternative: Single VPS

If provider sprawl becomes more educational friction than value, use one 8 GB Linux VPS with Docker Compose:

```text
Caddy
public web
svc-core
email dispatcher
widget consumers
SQL Server Express
MongoDB
RabbitMQ
```

This is operationally simpler and generally has one predictable monthly charge, but it creates:

- one host and one disk as failure domains;
- manual OS patching and hardening;
- manual off-host backups;
- less managed-cloud CI/CD experience;
- resource contention, especially from SQL Server;
- SSH deployment credentials unless an agent-based pull model is introduced.

The VPS route is the preferred fallback, not the initial recommendation. Do not use SQL Server Developer edition on it.

## Deferred Enhancements

Add these only after the first production release is stable:

- ephemeral pull-request environments;
- Azure Key Vault with managed identity;
- OpenTelemetry traces;
- deployment provenance and image signing;
- blue/green traffic splitting;
- automated Atlas/CloudAMQP provisioning;
- paid always-on capacity;
- private networking;
- multi-region or high-availability data services.

## Current Repository Gaps

The repository already has a Linux build workflow, CodeQL, production image builds, GHCR image publication, GitHub-to-Azure OIDC, an initial Bicep validation workflow, a same-origin production web gateway, a production-like local Compose runtime, health/readiness endpoints, structured logging, and graceful worker shutdown. The main gaps are:

- no deployed Azure application infrastructure yet;
- no deployment workflow;
- no automated test suite or lint job;
- local-only schema management through `docker exec`;
- SQL encryption settings intended for local development;
- no graceful shutdown in `svc-core`;
- no documented webhook signature verification;
- production secrets still modeled primarily as local env files.

These gaps define the implementation order above.

## Reference Sources

- Azure Container Apps pricing and monthly free grant: <https://azure.microsoft.com/en-us/pricing/details/container-apps/>
- Azure SQL Database free offer: <https://learn.microsoft.com/en-us/azure/azure-sql/database/free-offer>
- SQL Server editions and Express capabilities: <https://learn.microsoft.com/en-us/sql/sql-server/editions-and-components-of-sql-server-2022>
- GitHub OIDC with Azure: <https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-azure>
- GitHub Actions included usage: <https://docs.github.com/en/billing/concepts/product-billing/github-actions>
- Cloudflare Pages/free-plan limits: <https://developers.cloudflare.com/pages/platform/limits/>
- MongoDB Atlas pricing and M0 limits: <https://www.mongodb.com/pricing>
- CloudAMQP plans and Little Lemur limits: <https://www.cloudamqp.com/plans.html>
