import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Collapse from "bootstrap/js/dist/collapse";
import "./style.css";

type Page = "home" | "infrastructure" | "cicd" | "secrets" | "security" | "iam" | "login" | "register" | "account" | "widgets" | "competing-consumers" | "topic-routing" | "priority-queue" | "mongodb";
type FormStatus = "idle" | "submitting" | "success" | "error";
type SidebarSection = "platform" | "identity" | "account" | "messaging" | "data";

type AuthAccount = {
  accountId: number;
  emailAddress: string;
  emailVerifiedAt: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type AuthSession = {
  authSessionId: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

type FormState = {
  status: FormStatus;
  message?: string;
};

type InfrastructureDisposition = "online" | "degraded" | "offline" | "unknown";

type InfrastructureRequirement = {
  key: string;
  name: string;
  disposition: InfrastructureDisposition;
  detail: string;
  evidence: string;
  checkedAt: string;
};

type PlatformStatus = {
  checkedAt: string;
  requirements: InfrastructureRequirement[];
  notes: string[];
};

type WidgetStatus = "queued" | "retrying" | "processing" | "processed" | "failed";

type Widget = {
  widgetId: number;
  widgetName: string;
  status: WidgetStatus;
  createdAt: string;
  queuedAt: string | null;
  processingStartedAt: string | null;
  processedAt: string | null;
  processCount: number;
  lastMessageId: string | null;
  lastError: string | null;
};

type WidgetQueueState = {
  widgets: Widget[];
  rabbitMqMessageCount: number;
  rabbitMqRetryMessageCount: number;
  rabbitMqDeadLetterMessageCount: number;
  deadLetterMessages: WidgetDeadLetterMessage[];
};

type WidgetDeadLetterMessage = {
  messageId: string;
  requestedAt: string;
  source: string;
  widgetId: number;
  widgetName: string;
  repairAttempt: boolean;
};

type WidgetConsumerStatus = "queued" | "processing" | "processed" | "failed";

type WidgetConsumerDemoItem = {
  widgetId: number;
  widgetName: string;
  status: WidgetConsumerStatus;
  createdAt: string;
  queuedAt: string | null;
  processingStartedAt: string | null;
  processedAt: string | null;
  processedBy: string | null;
  processingSeconds: number | null;
  lastMessageId: string | null;
  lastError: string | null;
};

type WidgetConsumerQueueState = {
  widgets: WidgetConsumerDemoItem[];
  rabbitMqMessageCount: number;
  processedBy: Record<string, number>;
};

type TopicRoutingDemoMessage = {
  messageType: string;
  messageId: string;
  requestedAt: string;
  source: string;
  routingKey: string;
  label: string;
};

type TopicRoutingQueueOverview = {
  key: string;
  queue: string;
  bindingPattern: string;
  description: string;
  messageCount: number;
  messages: TopicRoutingDemoMessage[];
};

type TopicRoutingState = {
  sampleRoutingKeys: string[];
  queues: TopicRoutingQueueOverview[];
};

const fallbackTopicRoutingSampleKeys = [
  "email.verification.requested.v1",
  "email.password_reset.requested.v1",
  "widget.created.v1",
  "widget.important.v1",
  "billing.invoice.paid.v1",
];

type PriorityQueueLevel = {
  label: string;
  priority: number;
};

type PriorityQueueMessage = {
  messageType: string;
  messageId: string;
  requestedAt: string;
  source: string;
  jobName: string;
  publishSequence: number;
  priority: number;
};

type ProcessedPriorityQueueMessage = PriorityQueueMessage & {
  processedSequence: number;
  processedAt: string;
};

type PriorityQueueState = {
  levels: PriorityQueueLevel[];
  queue: {
    messageCount: number;
  };
  publishedMessages: PriorityQueueMessage[];
  processedMessages: ProcessedPriorityQueueMessage[];
};

type MongoWebhookEvent = {
  id: string;
  provider: string;
  eventType: string;
  emailId: string | null;
  recipients: string[];
  sender: string | null;
  subject: string | null;
  receivedAt: string;
  source: "webhook" | "imported-jsonl";
  payloadAvailable: boolean;
  payload: unknown | null;
  processing: {
    status: string;
    message?: string;
  };
};

type MongoWebhookExplorerState = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  eventTypeCounts: Array<{ _id: string; count: number }>;
  sourceCounts: Array<{ _id: string; count: number }>;
  events: MongoWebhookEvent[];
};

type MongoWebhookFilters = {
  q: string;
  eventType: string;
};

let account: AuthAccount | null = null;
let authSession: AuthSession | null = null;
let currentPage: Page | null = null;
let sidebarSectionsOpen: Record<SidebarSection, boolean> = {
  platform: true,
  identity: true,
  account: true,
  messaging: true,
  data: true,
};
let platformStatus: PlatformStatus | null = null;
let widgetQueueState: WidgetQueueState = {
  widgets: [],
  rabbitMqMessageCount: 0,
  rabbitMqRetryMessageCount: 0,
  rabbitMqDeadLetterMessageCount: 0,
  deadLetterMessages: [],
};
let widgetConsumerQueueState: WidgetConsumerQueueState = {
  widgets: [],
  rabbitMqMessageCount: 0,
  processedBy: {},
};
let topicRoutingState: TopicRoutingState = {
  sampleRoutingKeys: [],
  queues: [],
};
let priorityQueueState: PriorityQueueState = {
  levels: [],
  queue: {
    messageCount: 0,
  },
  publishedMessages: [],
  processedMessages: [],
};
let mongoWebhookExplorerState: MongoWebhookExplorerState = {
  page: 1,
  pageSize: 20,
  total: 0,
  pageCount: 1,
  eventTypeCounts: [],
  sourceCounts: [],
  events: [],
};
let mongoWebhookFilters: MongoWebhookFilters = {
  q: "",
  eventType: "",
};
let csrfToken: string | null = null;

const loginState: FormState = { status: "idle" };
const registerState: FormState = { status: "idle" };
const accountState: FormState = { status: "idle" };
const platformStatusState: FormState = { status: "idle" };
const widgetState: FormState = { status: "idle" };
const widgetConsumerState: FormState = { status: "idle" };
const topicRoutingFormState: FormState = { status: "idle" };
const priorityQueueFormState: FormState = { status: "idle" };
const mongoWebhookFormState: FormState = { status: "idle" };

const sharedRabbitMqDemoNote = `
  These RabbitMQ demos intentionally use shared global queues and disposable shared demo state. If multiple visitors use them at the same time, one visitor may process, purge, or change messages created by another visitor. We know about this behavior and accepted it for this portfolio slice because the goal is to demonstrate real queue behavior without adding the extra complexity of fully isolated per-user demo queues.
`;

function getCurrentPage(): Page {
  const hash = window.location.hash.replace("#", "");

  if (hash === "home") return "home";
  if (hash === "infrastructure") return "infrastructure";
  if (hash === "cicd") return "cicd";
  if (hash === "secrets") return "secrets";
  if (hash === "security") return "security";
  if (hash === "iam") return "iam";
  if (hash === "register") return "register";
  if (hash === "login") return "login";
  if (hash === "account") return "account";
  if (hash === "widgets") return "widgets";
  if (hash === "competing-consumers") return "competing-consumers";
  if (hash === "topic-routing") return "topic-routing";
  if (hash === "priority-queue") return "priority-queue";
  if (hash === "mongodb") return "mongodb";

  return "home";
}

function layout(content: string): string {
  const platformOpen = sidebarSectionsOpen.platform;
  const identityOpen = sidebarSectionsOpen.identity;
  const accountOpen = sidebarSectionsOpen.account;
  const messagingOpen = sidebarSectionsOpen.messaging;
  const dataOpen = sidebarSectionsOpen.data;

  return `
    <div class="public-shell">
      <aside class="public-sidebar">
        <div class="public-sidebar-header">
          <a class="public-brand" href="#home">CM Platform</a>
          <button
            class="btn btn-sm btn-outline-light d-lg-none"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#publicSidebarNav"
            aria-controls="publicSidebarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            Menu
          </button>
        </div>

        <div class="collapse d-lg-block" id="publicSidebarNav">
          <nav class="public-nav">
            <button
              class="public-nav-toggle ${platformOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#platformNav"
              aria-expanded="${platformOpen ? "true" : "false"}"
              aria-controls="platformNav"
            >
              Platform
            </button>
            <div class="collapse ${platformOpen ? "show" : ""}" id="platformNav">
              <div class="public-nav-group">
                <a class="public-nav-link" href="#home">Overview</a>
                <a class="public-nav-link" href="#infrastructure">Infrastructure Status</a>
                <a class="public-nav-link" href="#cicd">CI/CD and Azure</a>
                <a class="public-nav-link" href="#secrets">Secrets</a>
                <a class="public-nav-link" href="#security">Security Review</a>
              </div>
            </div>

            <button
              class="public-nav-toggle ${dataOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#dataStoresNav"
              aria-expanded="${dataOpen ? "true" : "false"}"
              aria-controls="dataStoresNav"
            >
              Data Stores
            </button>
            <div class="collapse ${dataOpen ? "show" : ""}" id="dataStoresNav">
              <div class="public-nav-group">
                <a class="public-nav-link" href="#mongodb">NoSQL with MongoDB</a>
              </div>
            </div>

            <button
              class="public-nav-toggle ${identityOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#identityAccessNav"
              aria-expanded="${identityOpen ? "true" : "false"}"
              aria-controls="identityAccessNav"
            >
              Identity and Access
            </button>
            <div class="collapse ${identityOpen ? "show" : ""}" id="identityAccessNav">
              <div class="public-nav-group">
                <a class="public-nav-link" href="#iam">Overview</a>
                <a class="public-nav-link" href="#register">Create Account</a>
                <a class="public-nav-link" href="#login">Login</a>
              </div>
            </div>

            <button
              class="public-nav-toggle ${messagingOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#queueDemosNav"
              aria-expanded="${messagingOpen ? "true" : "false"}"
              aria-controls="queueDemosNav"
            >
              Messaging with RabbitMQ
            </button>
            <div class="collapse ${messagingOpen ? "show" : ""}" id="queueDemosNav">
              <div class="public-nav-group">
                <a class="public-nav-link" href="#widgets">Queue Basics, Retry and DLQs</a>
                <a class="public-nav-link" href="#competing-consumers">Competing Consumers</a>
                <a class="public-nav-link" href="#topic-routing">Topic Routing</a>
                <a class="public-nav-link" href="#priority-queue">Priority Queue</a>
              </div>
            </div>

            <button
              class="public-nav-toggle ${accountOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#myAccountNav"
              aria-expanded="${accountOpen ? "true" : "false"}"
              aria-controls="myAccountNav"
            >
              My Account
            </button>
            <div class="collapse ${accountOpen ? "show" : ""}" id="myAccountNav">
              <div class="public-nav-group">
                <a class="public-nav-link" href="#account">Session State</a>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <main class="public-main">
        ${content}
      </main>
    </div>
  `;
}

function homePage(): string {
  const sourceCodeUrl = "https://github.com/JohnClydeMastersA2/cm-platform";
  const credentials = [
    "API-first platform design",
    "TypeScript full-stack development",
    "Fastify service architecture",
    "SQL Server workflow persistence",
    "MongoDB document persistence",
    "RabbitMQ messaging patterns",
    "Background services and workers",
    "PowerShell automation",
    "Docker local infrastructure",
  ];
  const platformCards = [
    {
      title: "API-first core",
      body: "Fastify owns the public and internal route surfaces so web apps, HTTP engines, workers, and tools can all integrate through explicit service boundaries.",
      proof: "svc-core, /auth, /internal, webhook endpoints",
    },
    {
      title: "Typed contracts",
      body: "Shared TypeScript packages keep request, response, and domain shapes close to the systems that consume them instead of burying integration rules in prose.",
      proof: "packages/contracts and packages/messaging",
    },
    {
      title: "Messaging and work orchestration",
      body: "RabbitMQ demos show durable publishing, retries, dead-letter handling, topic routing, priority queues, and competing consumers.",
      proof: "widget, topic-routing, priority-queue demos",
    },
    {
      title: "Processing engines",
      body: "Background services consume platform work independently from user-facing pages. Future HTTP processing engines can call the same API surfaces.",
      proof: "services/email-dispatcher and services/widget-consumer",
    },
    {
      title: "State and observability",
      body: "SQL Server stores visible workflow state and event history so asynchronous behavior can be inspected, repaired, and reasoned about.",
      proof: "queue demo tables and email delivery records",
    },
    {
      title: "MongoDB document persistence",
      body: "MongoDB stores Resend email webhook events as documents so the platform can retain provider payloads, inspect delivery history, and demonstrate document-database use alongside SQL workflow state.",
      proof: "MongoDB Atlas, /email-webhook-events, docs/deployment-plan.md",
    },
    {
      title: "GitHub CI/CD workflows",
      body: "GitHub Actions builds source, validates production container images, publishes SHA-tagged GHCR images, gates production deployments, and records deployment evidence as part of the platform learning path.",
      proof: "GitHub Actions, GHCR, protected production environment, docs/deployment-plan.md",
    },
    {
      title: "AI-assisted development",
      body: "The platform is being built with an AI agent as a development partner: reviewing architecture, making scoped code changes, testing locally, documenting tradeoffs, and preserving decisions for the portfolio story.",
      proof: "agent-guided implementation notes and docs/deployment-plan.md",
    },
    {
      title: "Cloudflare edge protection",
      body: "Cloudflare provides DNS, proxied HTTPS, private-preview Access controls, and local webhook tunnel support while the platform moves from protected production testing toward a public portfolio launch.",
      proof: "Cloudflare DNS, Access, Tunnel, docs/deployment-plan.md",
    },
    {
      title: "Public auth guardrails",
      body: "Registration and login endpoints include basic rate limiting so a public portfolio can demonstrate account workflows without leaving email delivery and password checks completely open to repeated automated attempts.",
      proof: "Fastify auth routes with IP and email-aware limits",
    },
    {
      title: "CSRF request protection",
      body: "CSRF means Cross-Site Request Forgery: a malicious site tries to make a logged-in browser send unwanted requests with its existing session cookie. CM Platform issues a same-origin token and requires it on state-changing requests.",
      proof: "HTTP-only CSRF cookie plus X-CSRF-Token headers",
    },
    {
      title: "Gateway security headers",
      body: "The public Nginx gateway adds browser security headers to reduce common web risks such as content sniffing, clickjacking, over-broad referrer leakage, unnecessary browser permissions, and unexpected script or frame sources.",
      proof: "Content-Security-Policy, frame-ancestors, nosniff, Permissions-Policy",
    },
    {
      title: "Security launch review",
      body: "Public launch includes lightweight external checks for HTTPS, Cloudflare exposure, health endpoints, security headers, and non-destructive follow-up scanning rather than a formal penetration test.",
      proof: "Security Review page, curl checks, planned OWASP ZAP baseline",
    },
    {
      title: "Developer operations",
      body: "PowerShell and npm scripts provide a repeatable local command surface for infrastructure, schema updates, workers, smoke tests, and webhook tooling.",
      proof: "scripts, tools, docker, README runbooks",
    },
  ];

  return `
    <section class="platform-overview">
      <div class="platform-hero">
        <div>
          <p class="platform-kicker">API-first application platform</p>
          <h1>CM Platform</h1>
          <p class="platform-lede">
            CM Platform is a TypeScript platform for demonstrating meaningful understanding of backend application architecture: public and private API surfaces, durable messaging, SQL-backed workflow state, background processing, shared contracts, and operational automation.
          </p>
        </div>
        <div class="platform-stack" aria-label="Platform architecture summary">
          <div class="platform-stack-row">
            <span>Clients</span>
            <strong>Public web, future HTTP engines, tools</strong>
          </div>
          <div class="platform-stack-row">
            <span>API</span>
            <strong>Fastify public, private, and webhook surfaces</strong>
          </div>
          <div class="platform-stack-row">
            <span>Platform</span>
            <strong>Contracts, messaging, persistence, services</strong>
          </div>
        </div>
      </div>

      <section class="platform-credentials">
        <div>
          <p class="platform-kicker">Technical portfolio</p>
          <h2>Built by John Clyde Masters</h2>
          <p>
            This site is hosted as a working portfolio of engineering skills. The emphasis is practical proof: running software, inspectable source code, and demos that expose the architecture behind the browser experience.
          </p>
          <div class="platform-card-actions">
            <a class="platform-small-link" href="${sourceCodeUrl}" target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a class="platform-secondary-link" href="/john_clyde_masters_resume.pdf" download>
              Download Resume
            </a>
          </div>
        </div>
        <div class="platform-credential-list" aria-label="Technical credentials demonstrated by this project">
          ${credentials.map((credential) => `<span>${escapeHtml(credential)}</span>`).join("")}
        </div>
      </section>

      <div class="platform-section">
        <div>
          <h2>Purpose</h2>
          <p>
            This public website is one demonstrable client of the CM Platform. The central idea is that features begin at the API boundary, then can be used by browser experiences, internal operations, asynchronous workers, and future HTTP processing engines without each client inventing its own backend behavior.
          </p>
        </div>
        <div class="platform-callout">
          <span>Design lens</span>
          <strong>Every demo should prove a platform capability, not just render a page.</strong>
        </div>
      </div>

      <div class="platform-flow" aria-label="API-first platform flow">
        <div>Public website</div>
        <div>HTTP engines</div>
        <div>Tools</div>
        <div class="platform-flow-core">API surfaces</div>
        <div>SQL Server</div>
        <div>RabbitMQ</div>
        <div>Workers</div>
      </div>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Technology Evidence</h2>
          <p>
            These cards describe platform objectives and technologies implemented. They are meant to complement the navigation, not repeat it.
          </p>
        </div>
        <div class="platform-card-grid">
          ${platformCards.map((card) => `
            <article class="platform-card">
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
              <div class="platform-proof">${escapeHtml(card.proof)}</div>
            </article>
          `).join("")}
        </div>
      </section>

    </section>
  `;
}

function infrastructurePage(): string {
  const isRefreshing = platformStatusState.status === "submitting";
  const checkedAt = platformStatus?.checkedAt ? formatDate(platformStatus.checkedAt) : "Not checked yet";

  return `
    <section class="platform-overview">
      <div class="platform-hero">
        <div>
          <p class="platform-kicker">Platform operations</p>
          <h1>Infrastructure Status</h1>
          <p class="platform-lede">
            This page shows the current disposition of the local cm-platform requirements that support the API, messaging demos, account verification, background processing, and email webhook flow.
          </p>
          <div class="platform-hero-actions">
            <button class="btn btn-primary" type="button" data-action="refresh-platform-status" ${isRefreshing ? "disabled" : ""}>
              Refresh Status
            </button>
            <span>Last checked: ${escapeHtml(checkedAt)}</span>
          </div>
        </div>
        <div class="platform-stack" aria-label="Infrastructure status summary">
          <div class="platform-stack-row">
            <span>Status Source</span>
            <strong>Fastify API readiness, SQL Server and MongoDB queries, RabbitMQ queue metadata, webhook event history</strong>
          </div>
          <div class="platform-stack-row">
            <span>Purpose</span>
            <strong>Make required local services visible before running demos</strong>
          </div>
          <div class="platform-stack-row">
            <span>Limit</span>
            <strong>RabbitMQ confirms attached consumers, not individual process names</strong>
          </div>
        </div>
      </div>

      ${platformStatusState.status === "error" ? statusMessage(platformStatusState) : ""}

      <section class="platform-section platform-section-block">
        <div>
          <h2>Required Infrastructure</h2>
          <p>
            Each row reports what the API can verify right now. Online means the requirement is reachable or active. Degraded means the platform can inspect the resource, but an expected runtime is missing. Unknown means the endpoint exists, but no activity has been recorded yet.
          </p>
        </div>
        <div class="infrastructure-table-wrap">
          <table class="table table-sm infrastructure-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Disposition</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              ${platformStatus?.requirements.length ? infrastructureRows(platformStatus.requirements) : `<tr><td colspan="3" class="text-muted">No infrastructure status loaded.</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>

      ${backToTopButton()}
    </section>
  `;
}

function cicdPage(): string {
  const cicdCards = [
    {
      title: "Build verification",
      body: "GitHub Actions runs the repository build from a clean Linux runner so the codebase is proven outside the developer workstation before deployment decisions are made.",
      proof: "Build workflow, CodeQL, npm audit, docs/deployment-plan.md",
    },
    {
      title: "Container image publication",
      body: "Production Docker images are built for the public web gateway, API, email dispatcher, widget consumers, and maintenance worker, then published with immutable commit SHA tags.",
      proof: "GHCR SHA-tagged images and Container Build jobs",
    },
    {
      title: "Protected production deployment",
      body: "Production deployment is gated by the GitHub production environment, manual approval, explicit deploy confirmations, and Azure OIDC rather than long-lived cloud passwords.",
      proof: "GitHub Environment production, Azure OIDC, Bicep deploy workflows",
    },
    {
      title: "Infrastructure as code",
      body: "Azure resources are modeled with Bicep so foundation, SQL, and Container Apps changes can be reviewed, previewed with what-if, and deployed through the same protected workflow path.",
      proof: "infra/bicep and docs/deployment-plan.md",
    },
    {
      title: "Runtime configuration",
      body: "Production containers receive configuration through environment variables and platform secrets, keeping source code, images, and local env files separate from production values.",
      proof: "Azure Container Apps secrets and GitHub production secrets",
    },
    {
      title: "Scheduled operations",
      body: "The demo maintenance worker is being prepared as a scheduled operations job to clean shared demo state and send email summaries, extending CI/CD into operation and hygiene.",
      proof: "services/demo-maintenance and Phase 5 notes",
    },
  ];
  const containerRuntimeCards = [
    {
      title: "Local infrastructure",
      body: "Docker Compose owns SQL Server, MongoDB, and RabbitMQ locally so the platform can run repeatable dependencies without installing those services directly on the workstation.",
      proof: "docker/compose.dev.yml",
    },
    {
      title: "Production-style images",
      body: "The public web gateway, API, email dispatcher, widget consumers, and maintenance worker build into deployable images so CI can prove packaging before deployment.",
      proof: "docker/Dockerfile.* and GitHub Container Build jobs",
    },
    {
      title: "Same-origin gateway",
      body: "Nginx serves the compiled Vite site and proxies API routes to svc-core over localhost, preserving browser cookie behavior and matching the Azure Container Apps sidecar model.",
      proof: "docker/nginx.public-web.conf",
    },
    {
      title: "Production-like local runtime",
      body: "The production images can run together locally against SQL Server, MongoDB, and RabbitMQ with only the web gateway exposed, giving a final smoke test before cloud deployment.",
      proof: "npm run prod-local:up and npm run prod-local:verify",
    },
  ];

  const azureRows = [
    {
      resource: "Resource group",
      purpose: "Groups the production Azure resources under one management and cost boundary.",
      value: "rg-cm-platform-prod",
    },
    {
      resource: "Azure Container Apps environment",
      purpose: "Hosts the public web/API app and worker Container Apps on the consumption plan.",
      value: "cae-cm-platform-prod-cus",
    },
    {
      resource: "Public web/API Container App",
      purpose: "Runs Nginx as the public gateway with svc-core as the API sidecar.",
      value: "ca-cmp-web-prod",
    },
    {
      resource: "Worker Container Apps",
      purpose: "Run the email dispatcher and widget consumer demos as separate observable workloads.",
      value: "ca-cmp-email-prod, ca-cmp-widget-fast-prod, ca-cmp-widget-slow-prod",
    },
    {
      resource: "Azure SQL Database",
      purpose: "Hosts the relational production schema with encrypted transport and separate migration/runtime identities.",
      value: "CMPlatform on Azure SQL",
    },
    {
      resource: "Log Analytics",
      purpose: "Receives Azure Container Apps logs with short retention for low-cost operational visibility.",
      value: "log-cm-platform-prod-cus",
    },
  ];

  return `
    <section class="platform-overview">
      <div class="platform-hero">
        <div>
          <p class="platform-kicker">CI/CD and Azure</p>
          <h1>Deployment Pipeline and Cloud Runtime</h1>
          <p class="platform-lede">
            CM Platform uses Docker, GitHub Actions, GHCR, Azure Bicep, Azure Container Apps, and Azure SQL to turn local TypeScript services into a protected, production-like public portfolio environment.
          </p>
          <div class="platform-hero-actions">
            <span>Reference: docs/deployment-plan.md</span>
          </div>
        </div>
        <div class="platform-stack" aria-label="CI/CD deployment summary">
          <div class="platform-stack-row">
            <span>Source</span>
            <strong>GitHub repository, protected production environment, GitHub Actions workflows</strong>
          </div>
          <div class="platform-stack-row">
            <span>Artifacts</span>
            <strong>Docker images tagged by Git SHA and published to GitHub Container Registry</strong>
          </div>
          <div class="platform-stack-row">
            <span>Runtime</span>
            <strong>Azure Container Apps, Azure SQL, managed external MongoDB/RabbitMQ/Resend services</strong>
          </div>
        </div>
      </div>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Deployment Flow</h2>
          <p>
            The deployment plan intentionally separates build, image publication, infrastructure preview, database migration, runtime deployment, and smoke testing. That keeps each production change reviewable and gives the portfolio concrete evidence of modern CI/CD practice.
          </p>
          <p>
            Docker provides the container image contract. GitHub Actions builds and publishes those images to GHCR, and Azure Container Apps runs them in production.
          </p>
        </div>
        <div class="platform-flow platform-flow-separated" aria-label="CI/CD deployment flow">
          <div>GitHub commit</div>
          <div>Build and scan</div>
          <div>GHCR images</div>
          <div class="platform-flow-core">Production approval</div>
          <div>Bicep what-if</div>
          <div>Azure deploy</div>
          <div>Smoke tests</div>
        </div>
      </section>

      <section class="platform-section platform-section-block">
        <div>
          <h2>What Azure Runs</h2>
          <p>
            Azure is the production host for the container runtime, relational database, deployment identity, logs, budget controls, and custom-domain binding. MongoDB Atlas, CloudAMQP, Cloudflare, Resend, and GHCR remain managed services outside Azure.
          </p>
        </div>
        <div class="infrastructure-table-wrap">
          <table class="table table-sm infrastructure-table">
            <thead>
              <tr>
                <th>Azure Resource</th>
                <th>Purpose</th>
                <th>Current Name / Disposition</th>
              </tr>
            </thead>
            <tbody>
              ${azureRows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.resource)}</td>
                  <td>${escapeHtml(row.purpose)}</td>
                  <td>${escapeHtml(row.value)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="platform-section">
        <div>
          <h2>Architecture View</h2>
          <p>
            Azure can help visualize deployed resources through portal resource views, resource group listings, topology-style blades, and exported diagrams from third-party tools. For this portfolio, the clearest diagram should be maintained in the repository because it can show both Azure and non-Azure services in one intentional picture.
          </p>
        </div>
        <div class="architecture-diagram-card">
          <a href="/cicd-architecture.svg" target="_blank" rel="noreferrer">
            <img
              src="/cicd-architecture.svg"
              alt="CM Platform CI/CD architecture showing GitHub Actions, GHCR, Azure Container Apps, Azure SQL, MongoDB Atlas, CloudAMQP, Resend, and Cloudflare"
            >
          </a>
          <p>
            Source: <code>docs/cicd-architecture.mmd</code>. Rendered asset: <code>apps/public-web/public/cicd-architecture.svg</code>.
            <a href="/cicd-architecture.svg" target="_blank" rel="noreferrer">Open full-size diagram</a>.
          </p>
        </div>
      </section>

      <section class="platform-section platform-section-block">
        <div>
          <h2>How Containers Fit</h2>
          <p>
            Docker remains part of the deployment story because containers are the artifact that GitHub Actions builds, GHCR stores, and Azure Container Apps runs.
          </p>
        </div>
        <div class="platform-card-grid">
          ${containerRuntimeCards.map((card) => `
            <article class="platform-card">
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
              <div class="platform-proof">${escapeHtml(card.proof)}</div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Technology Evidence</h2>
          <p>
            These cards summarize the CI/CD and Azure practices captured in docs/deployment-plan.md.
          </p>
        </div>
        <div class="platform-card-grid">
          ${cicdCards.map((card) => `
            <article class="platform-card">
              <h3>${escapeHtml(card.title)}</h3>
              <p>${escapeHtml(card.body)}</p>
              <div class="platform-proof">${escapeHtml(card.proof)}</div>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function secretsPage(): string {
  const secretConcerns = [
    {
      title: "Where secrets live",
      body: "Local development can use a machine-local env file. Production uses GitHub and Azure-managed secret injection instead of committed files.",
    },
    {
      title: "How each environment gets them",
      body: "The same variable names should work in development and production, but the source changes: development reads local files, while production receives injected runtime values.",
    },
    {
      title: "How the app proves configuration",
      body: "Services should validate required settings on startup and report readiness without logging or exposing the actual secret values. The Infrastructure Status API provides runtime evidence by checking whether configured dependencies are reachable and healthy; the Infrastructure Status page displays those results.",
    },
  ];

  const environmentRows = [
    {
      environment: "Development",
      source: "packages/secrets/cm-platform.env",
      note: "Developer-owned local values used by npm scripts and Docker Compose.",
    },
    {
      environment: "Production",
      source: "GitHub production secrets and Azure Container Apps secrets",
      note: "Production database, RabbitMQ, email, webhook, signing, and runtime values injected by the deployment and hosting platforms.",
    },
  ];

  const providerBindingExamples = [
    "Email capability: currently bound to Resend credentials",
    "Database capability: bound to local SQL Server or Azure SQL",
    "Messaging capability: bound to local RabbitMQ or CloudAMQP",
    "Edge access: bound to Cloudflare DNS and Access policy",
    "Future governance: Azure Key Vault could become the secret source without changing application variable names",
  ];

  return `
    <section class="platform-overview">
      <div class="platform-hero">
        <div>
          <p class="platform-kicker">Containers / Secrets</p>
          <h1>Secret Handling Across Environments</h1>
          <p class="platform-lede">
            Secrets are part of the runtime contract for cm-platform. The goal is to keep local development convenient while making production depend on injected secrets rather than values committed to the repository or baked into Docker images.
          </p>
          <div class="platform-hero-actions">
            <span>Same image, same variable names, different secret sources per environment.</span>
          </div>
        </div>
        <div class="platform-stack" aria-label="Secret handling summary">
          <div class="platform-stack-row">
            <span>Development</span>
            <strong>Local env file stays machine-local and out of Git</strong>
          </div>
          <div class="platform-stack-row">
            <span>Production</span>
            <strong>GitHub and Azure inject production values at deploy and runtime</strong>
          </div>
        </div>
      </div>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Three Concerns</h2>
          <p>
            The secrets model should be evaluated through three practical questions. This keeps the design clear whether the app is running from npm scripts, Docker Compose, Kubernetes, or another container platform.
          </p>
        </div>
        <div class="platform-card-grid">
          ${secretConcerns.map((concern) => `
            <article class="platform-card">
              <h3>${escapeHtml(concern.title)}</h3>
              <p>${escapeHtml(concern.body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="platform-section">
        <div>
          <h2>Environment Model</h2>
          <p>
            Development can stay simple with packages/secrets/cm-platform.env. Production should use the same variable names, but those values should be supplied by GitHub Actions and Azure Container Apps at deploy and runtime.
          </p>
        </div>
        <div class="platform-callout">
          <span>Docker rule</span>
          <strong>Secrets should be mounted or injected into containers, not copied into image layers.</strong>
        </div>
      </section>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Disposition By Environment</h2>
          <p>
            This is the intended direction for cm-platform as it moves between local development and production hosting.
          </p>
          <p>
            cm-platform does not currently use a staging environment because this is a technical portfolio site with low production risk and direct owner validation. A staging environment could be added later by creating a separate GitHub environment, Azure Container Apps deployment, database, DNS name, and secret set that follow the same variable contract shown here.
          </p>
        </div>
        <div class="infrastructure-table-wrap">
          <table class="table table-sm infrastructure-table">
            <thead>
              <tr>
                <th>Environment</th>
                <th>Secret Source</th>
                <th>Disposition</th>
              </tr>
            </thead>
            <tbody>
              ${environmentRows.map((row) => `
                <tr>
                  <td>${escapeHtml(row.environment)}</td>
                  <td>${escapeHtml(row.source)}</td>
                  <td>${escapeHtml(row.note)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </section>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Configuration Versus Secrets</h2>
          <p>
            Public URLs, ports, feature flags, and log levels are configuration. Database passwords, session signing keys, RabbitMQ credentials, SMTP keys, and webhook signing values are secrets.
          </p>
          <p>
            Frontend values bundled into the Vite public web app should be treated as public. Anything exposed through a VITE_* variable must be safe for a browser user to see.
          </p>
        </div>
        <div class="platform-card-grid">
          <article class="platform-card">
            <h3>Committed example</h3>
            <p>Keep a safe example file with variable names and placeholder values so each environment knows what it must provide.</p>
            <div class="platform-proof">packages/secrets/cm-platform.env.example</div>
          </article>
          <article class="platform-card">
            <h3>Local-only values</h3>
            <p>The real development env file can remain useful locally, but it should stay ignored by Git and treated as workstation state.</p>
            <div class="platform-proof">packages/secrets/cm-platform.env</div>
          </article>
          <article class="platform-card">
            <h3>Runtime validation</h3>
            <p>Backend services should fail fast or report degraded readiness when required variables are missing, without printing secret values.</p>
            <div class="platform-proof">startup validation and status checks</div>
          </article>
        </div>
      </section>

      <section class="platform-section">
        <div>
          <h2>Provider Binding</h2>
          <p>
            Application code should depend on platform capabilities, while each environment binds those capabilities to concrete providers through configuration and secrets. For example, the platform needs an email-sending capability; production currently binds that capability to Resend by providing the expected credentials.
          </p>
          <p>
            If a provider changes later, the adapter and secret values may change, but the rest of the platform should continue to ask for the same capability rather than spreading provider-specific assumptions across the codebase.
          </p>
        </div>
        <div class="future-list">
          ${providerBindingExamples.map((example) => `<span>${escapeHtml(example)}</span>`).join("")}
        </div>
      </section>

    </section>
  `;
}

function securityPage(): string {
  const completedChecks = [
    {
      title: "Public access",
      body: "The main site is reachable without Cloudflare Access login after removing the private preview Access application.",
      proof: "https://cmplatform.dev returned 200 OK through Cloudflare",
    },
    {
      title: "HTTPS and redirect",
      body: "The public HTTP endpoint redirects to HTTPS, and the HTTPS endpoint presents the live site through Cloudflare with a 200 OK response.",
      proof: "http://cmplatform.dev returned 301 to https://cmplatform.dev/; https://cmplatform.dev returned 200 OK",
    },
    {
      title: "HSTS disposition",
      body: "Strict-Transport-Security is not currently returned. That is acceptable for launch and should be considered after the public custom domain has remained stable.",
      proof: "No Strict-Transport-Security header observed on https://cmplatform.dev",
    },
    {
      title: "Health endpoint",
      body: "The production health endpoint responds with a minimal JSON status payload without exposing internal configuration.",
      proof: "GET /health returned { ok: true }",
    },
    {
      title: "Security headers",
      body: "The gateway returns the same protective header set on the public HTML page and representative JSON API routes.",
      proof: "CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy",
    },
    {
      title: "Header disposition",
      body: "Cross-origin isolation headers such as COOP and COEP are not currently required because the site does not use browser features that need cross-origin isolation. HSTS is tracked separately as a later hardening option.",
      proof: "No COOP/COEP dependency identified for current public portfolio behavior",
    },
    {
      title: "Public API behavior",
      body: "Read-only demo endpoints can be queried publicly, while state-changing requests use CSRF protection and application-level validation.",
      proof: "GET /topic-routing returned sample keys and queue metadata",
    },
    {
      title: "Mutation boundary",
      body: "Representative state-changing demo routes reject requests that do not include the expected same-origin CSRF token.",
      proof: "DELETE /topic-routing and DELETE /widgets returned 403 Invalid CSRF token",
    },
    {
      title: "Auth input validation",
      body: "Authentication endpoints reject malformed or incomplete JSON bodies without creating accounts or sessions.",
      proof: "POST /auth/register and POST /auth/login with empty bodies returned 400 validation responses",
    },
    {
      title: "CSRF token cookie",
      body: "The CSRF bootstrap endpoint issues a token and sets a secure, HttpOnly, SameSite=Lax cookie for browser-mediated state changes.",
      proof: "GET /auth/csrf returned a csrfToken and Set-Cookie: cm_csrf; Secure; HttpOnly; SameSite=Lax",
    },
    {
      title: "Webhook boundary",
      body: "The Resend email webhook endpoint is not a browser page. Unsigned public POST attempts are rejected, while signed production email events have been accepted and recorded.",
      proof: "GET /webhooks/email-events returned 404; unsigned POST returned 400 Invalid webhook signature; production email test confirmed webhook processing",
    },
    {
      title: "OWASP ZAP baseline",
      body: "A non-destructive OWASP ZAP baseline scan was run against production to exercise passive checks without attacking application state.",
      proof: "ZAP baseline reported FAIL-NEW 0, WARN-NEW 7, PASS 60; report retained locally under security-reports/",
    },
  ];

  const followUpChecks = [
    {
      title: "Review ZAP warning dispositions",
      body: "Decide which ZAP warnings should become immediate changes and which should remain documented hardening follow-ups: cache headers, static-file nosniff behavior, CSP style policy, COOP/COEP, and HSTS.",
    },
    {
      title: "Certificate and HSTS review",
      body: "Confirm the certificate chain and expiration date through browser tools or an external TLS report, then decide when to enable HSTS after the custom domain has remained stable.",
    },
    {
      title: "Authentication flow and rate-limit smoke test",
      body: "Create and verify a test account, delete it through My Account, and perform a careful low-volume rate-limit check without locking out normal use or sending excessive email.",
    },
  ];

  return `
    <section class="platform-overview">
      <div class="platform-hero">
        <div>
          <p class="platform-kicker">Launch readiness</p>
          <h1>Security Launch Review</h1>
          <p class="platform-lede">
            This page records lightweight public-launch security validation for cm-platform. It is not a formal penetration test; it is a practical review of exposure, browser protections, public health checks, and the next safe scanning steps for a technical portfolio site.
          </p>
        </div>
        <div class="platform-stack" aria-label="Security launch review summary">
          <div class="platform-stack-row">
            <span>Scope</span>
            <strong>Public site, public API reads, browser headers, Cloudflare edge behavior</strong>
          </div>
          <div class="platform-stack-row">
            <span>Approach</span>
            <strong>Passive checks, public smoke tests, and non-destructive automated baseline scan</strong>
          </div>
          <div class="platform-stack-row">
            <span>Limit</span>
            <strong>This is launch validation, not a third-party penetration test</strong>
          </div>
        </div>
      </div>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Completed Public Checks</h2>
          <p>
            These checks were performed from outside the Azure origin path after the site was made public through Cloudflare. They are intentionally low-risk and repeatable.
          </p>
        </div>
        <div class="platform-card-grid">
          ${completedChecks.map((check) => `
            <article class="platform-card">
              <h3>${escapeHtml(check.title)}</h3>
              <p>${escapeHtml(check.body)}</p>
              <div class="platform-proof">${escapeHtml(check.proof)}</div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="platform-section">
        <div>
          <h2>Current Disposition</h2>
          <p>
            The site is public, HTTPS-only from the visitor perspective, fronted by Cloudflare, and returning a restrictive browser security header set. A non-destructive baseline scanner has been run; the remaining work is to disposition warnings and decide which hardening items belong before the next production release.
          </p>
          <p>
            One optional hardening item is HSTS. That should be enabled only after DNS, HTTPS, and custom-domain behavior have remained stable, because HSTS tells browsers to insist on HTTPS for future visits.
          </p>
          <p>
            The ZAP baseline produced warning categories rather than failures. Current review items include cache-control tuning, HSTS, X-Content-Type-Options on static text files, CSP style-src usage, and cross-origin isolation headers. Several are expected for this portfolio launch and should be handled as conscious hardening choices rather than emergency defects.
          </p>
        </div>
        <div class="platform-callout">
          <span>Portfolio framing</span>
          <strong>Security review is being treated as operational launch hygiene: verify the public boundary, record evidence, fix obvious issues, and avoid destructive testing against production.</strong>
        </div>
      </section>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Next Safe Checks</h2>
          <p>
            These follow-up checks add learning value without crossing into aggressive production testing.
          </p>
        </div>
        <div class="platform-card-grid">
          ${followUpChecks.map((check) => `
            <article class="platform-card">
              <h3>${escapeHtml(check.title)}</h3>
              <p>${escapeHtml(check.body)}</p>
            </article>
          `).join("")}
        </div>
      </section>
    </section>
  `;
}

function iamPage(): string {
  const workflowSteps = [
    {
      title: "Create account",
      body: "The user submits an email address and password through the public registration form.",
    },
    {
      title: "Queue verification email",
      body: "The API creates the account, issues a short-lived verification token, and queues an email request for asynchronous delivery.",
    },
    {
      title: "Verify email",
      body: "The verification link calls the API, marks the address as verified, and returns the user to the login flow.",
    },
    {
      title: "Start session",
      body: "A successful login establishes an HTTP-only session cookie that the browser can use without exposing credentials to client code. This is visible on the My Account/ Session State page.",
    },
    {
      title: "Inspect or reset",
      body: "The account page shows current account and session state, and includes account deletion so the creation workflow can be repeated easily during demos.",
    },
  ];
  const futureItems = [
    "Password recovery",
    "Authenticator app support",
    "OAuth login",
    "Role-based access control",
  ];

  return `
    <section class="platform-overview">
      <div class="platform-hero">
        <div>
          <p class="platform-kicker">Identity and access</p>
          <h1>Account Creation Workflow</h1>
          <p class="platform-lede">
            CM Platform includes a simple account workflow with email/password registration, basic password validation, email confirmation, login, session inspection, logout, and account deletion for repeatable demos.
          </p>
        </div>
        <div class="platform-stack" aria-label="Identity workflow summary">
          <div class="platform-stack-row">
            <span>Public API</span>
            <strong>Register, verify email, login, session lookup, logout, delete account</strong>
          </div>
          <div class="platform-stack-row">
            <span>Email</span>
            <strong>Verification is queued through RabbitMQ and sent by a background dispatcher</strong>
          </div>
          <div class="platform-stack-row">
            <span>Session</span>
            <strong>Login creates an HTTP-only browser session cookie</strong>
          </div>
        </div>
      </div>

      <section class="platform-section platform-section-block">
        <div>
          <h2>Current Workflow</h2>
          <p>
            The goal is not to present a complete identity product. It is to show a working authentication slice that connects browser forms, API validation, SQL-backed account state, asynchronous email delivery, and HTTP-only browser sessions.
          </p>
        </div>
        <div class="iam-workflow">
          ${workflowSteps.map((step, index) => `
            <article class="iam-workflow-card">
              <div class="iam-workflow-step">${index + 1}</div>
              <div>
                <h3>${escapeHtml(step.title)}</h3>
                <p>${escapeHtml(step.body)}</p>
              </div>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="platform-section">
        <div>
          <h2>User Interface Design</h2>
          <p>
            The UI keeps the account lifecycle intentionally plain: Create Account, Login, and My Account. The My Account page shows the active session and verification state, with logout and delete-account actions so the demo can be replayed cleanly.
          </p>
        </div>
        <div class="platform-callout">
          <span>Demo design</span>
          <strong>Account deletion makes the lifecycle easy to replay without manual SQL cleanup.</strong>
        </div>
      </section>

      <section class="future-panel">
        <div>
          <p class="platform-kicker">Futures</p>
          <h2>Planned IAM Capabilities</h2>
          <p>
            Future work will extend the same API-first model into recovery, stronger authentication, external identity providers, and authorization policy.
          </p>
        </div>
        <div class="future-list">
          ${futureItems.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}
        </div>
      </section>
    </section>
  `;
}

function widgetsPage(): string {
  const isSubmitting = widgetState.status === "submitting";
  const queuedCount = widgetQueueState.widgets.filter((widget) => widget.status === "queued").length;
  const retryingCount = widgetQueueState.widgets.filter((widget) => widget.status === "retrying").length;
  const processedCount = widgetQueueState.widgets.filter((widget) => widget.status === "processed").length;
  const failedCount = widgetQueueState.widgets.filter((widget) => widget.status === "failed").length;

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-2">Messaging with RabbitMQ + Retries & Dead Letter Queue</h1>
          <p class="text-muted mb-0">
            This demonstration uses RabbitMQ as the work queue and SQL Server as the visible state store. Creating widgets inserts rows into dbo.WidgetQueueDemo with a status of queued, then publishes durable widget.processing_requested.v1 messages to the cm.widget exchange, which routes them into the cm.widget.processing queue. The process buttons pull messages from that queue, validate the payload, update the matching SQL row, and ack successful messages so RabbitMQ removes them. Failed messages move first to a delayed retry queue, where RabbitMQ holds them briefly before routing them back to the main processing queue. If a retried message fails again, it is rejected without requeueing and sent to cm.widget.processing.dlq, where it can be replayed or repaired.
          </p>
        </div>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ol class="mb-0 text-muted">
          <li>${sharedRabbitMqDemoNote.trim()}</li>
          <li>Start with an empty queue. Use the Delete All Widgets button if necessary.</li>
          <li>Note the five metrics displayed; they all begin at zero.</li>
          <li>Use the Create 5 button to publish five messages to the queue.</li>
          <li>Use the Process All button, and then immediately begin clicking the Refresh button about once every second for about 10 seconds. As you click Refresh, note the values of the five metrics. This will help you see and understand the retry capabilities of the queue.</li>
          <li>Note there are no rows in the DLQ at this time.</li>
          <li>Use the Process All button to retry any failures. Because this demo supports a single retry, this time the failures will land in the DLQ.</li>
          <li>Looking at the DLQ, you can choose Replay followed by the Process All button, which will publish the same broken message. This action does not qualify the message for another retry.</li>
          <li>Returning to the DLQ, you can also choose Repair followed by the Process All button. This allows the message to be processed successfully.</li>
        </ol>
      </div>

      ${statusMessage(widgetState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">RabbitMQ messages</div>
            <div class="fs-3 fw-semibold">${widgetQueueState.rabbitMqMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Retry messages</div>
            <div class="fs-3 fw-semibold">${widgetQueueState.rabbitMqRetryMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">DLQ messages</div>
            <div class="fs-3 fw-semibold">${widgetQueueState.rabbitMqDeadLetterMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Queued / Retrying</div>
            <div class="fs-3 fw-semibold">${queuedCount} / ${retryingCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Processed / Failed</div>
            <div class="fs-3 fw-semibold">${processedCount} / ${failedCount}</div>
          </div>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-outline-secondary" type="button" data-action="refresh-widgets" ${isSubmitting ? "disabled" : ""}>Refresh</button>
          <button class="btn btn-primary" type="button" data-action="create-widget" data-count="1" ${isSubmitting ? "disabled" : ""}>Create 1</button>
          <button class="btn btn-primary" type="button" data-action="create-widget" data-count="5" ${isSubmitting ? "disabled" : ""}>Create 5</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-widgets" data-count="1" ${isSubmitting ? "disabled" : ""}>Process 1</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-widgets" data-count="5" ${isSubmitting ? "disabled" : ""}>Process 5</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-all-widgets" ${isSubmitting ? "disabled" : ""}>Process All</button>
        </div>
        <button class="btn btn-outline-danger ms-sm-auto" type="button" data-action="delete-widgets" ${isSubmitting ? "disabled" : ""}>Delete All Widgets</button>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped widget-table widget-main-table">
          <thead>
            <tr>
              <th class="widget-col-id">ID</th>
              <th>Name</th>
              <th class="widget-col-status">Status</th>
              <th class="widget-col-count">Count</th>
              <th class="widget-col-date">Created</th>
              <th class="widget-col-date">Processed</th>
            </tr>
          </thead>
          <tbody>
            ${widgetQueueState.widgets.length ? widgetRows() : `<tr><td colspan="6" class="text-muted">No widgets yet.</td></tr>`}
          </tbody>
        </table>
      </div>

      <h2 class="h5 mt-4 mb-2">Dead Letter Queue</h2>
      <p class="text-muted">
        Widgets with IDs divisible by 3 fail once into delayed retry. If they fail again, they land here. Replay republishes the same work; repair republishes it with a repair flag so it can succeed.
      </p>
      <div class="table-responsive">
        <table class="table table-sm table-striped widget-table widget-dead-letter-table">
          <thead>
            <tr>
              <th class="widget-col-id">Widget ID</th>
              <th>Name</th>
              <th class="widget-col-status">Status</th>
              <th class="widget-col-count" aria-label="Count spacer"></th>
              <th class="widget-col-date">Requested</th>
              <th class="widget-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${widgetQueueState.deadLetterMessages.length ? deadLetterRows(isSubmitting) : `<tr><td colspan="6" class="text-muted">No dead-letter messages.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${backToTopButton()}
    </div>
  `;
}

function competingConsumersPage(): string {
  const isSubmitting = widgetConsumerState.status === "submitting";
  const queuedCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "queued").length;
  const processingCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "processing").length;
  const processedCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "processed").length;
  const failedCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "failed").length;

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div class="rabbitmq-demo-copy">
          <h1 class="h3 mb-2">Competing Consumers with RabbitMQ</h1>
          <p class="text-muted mb-0">
            This demonstration uses one RabbitMQ queue and multiple worker instances to show competing consumers. Creating widgets writes rows into <code>dbo.WidgetConsumerDemo</code> with a status of queued, then publishes durable <code>widget.consumer_demo.processing_requested.v1</code> messages to the <code>cm.widget.consumer-demo</code> exchange. Each worker consumes from the same <code>cm.widget.consumer-demo.processing</code> queue with prefetch set to 1, so RabbitMQ gives each message to only one available worker. A faster worker finishes and acknowledges messages sooner, making it available for more work while slower workers are still processing.
          </p>
        </div>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ul class="mb-0 text-muted">
          <li>${sharedRabbitMqDemoNote.trim()}</li>
          <li>Each message is delivered to only one available worker, so fast and slow consumers compete for work from the same queue.</li>
          <li>The worker that finishes first becomes available for another message sooner, which is why faster workers usually process more rows.</li>
        </ul>
      </div>

      ${statusMessage(widgetConsumerState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">RabbitMQ messages</div>
            <div class="fs-3 fw-semibold">${widgetConsumerQueueState.rabbitMqMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Queued / Processing</div>
            <div class="fs-3 fw-semibold">${queuedCount} / ${processingCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Processed / Failed</div>
            <div class="fs-3 fw-semibold">${processedCount} / ${failedCount}</div>
          </div>
        </div>
        ${consumerProcessedCards()}
      </div>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-outline-secondary" type="button" data-action="refresh-consumer-widgets" ${isSubmitting ? "disabled" : ""}>Refresh</button>
          <button class="btn btn-primary" type="button" data-action="create-consumer-widget" data-count="10" ${isSubmitting ? "disabled" : ""}>Create 10</button>
          <button class="btn btn-primary" type="button" data-action="create-consumer-widget" data-count="25" ${isSubmitting ? "disabled" : ""}>Create 25</button>
        </div>
        <button class="btn btn-outline-danger ms-sm-auto" type="button" data-action="delete-consumer-widgets" ${isSubmitting ? "disabled" : ""}>Delete All Widgets</button>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped widget-table consumer-widget-table">
          <thead>
            <tr>
              <th class="widget-col-id">ID</th>
              <th>Name</th>
              <th class="widget-col-status">Status</th>
              <th class="consumer-col-worker">Processed By</th>
              <th class="consumer-col-seconds">Seconds</th>
              <th class="widget-col-date">Created</th>
              <th class="widget-col-date">Processed</th>
            </tr>
          </thead>
          <tbody>
            ${widgetConsumerQueueState.widgets.length ? consumerWidgetRows() : `<tr><td colspan="7" class="text-muted">No consumer widgets yet.</td></tr>`}
          </tbody>
        </table>
      </div>
      ${backToTopButton()}
    </div>
  `;
}

function topicRoutingPage(): string {
  const isSubmitting = topicRoutingFormState.status === "submitting";
  const totalMessages = topicRoutingState.queues.reduce((sum, queue) => sum + queue.messageCount, 0);
  const activeQueues = topicRoutingState.queues.filter((queue) => queue.messageCount > 0).length;

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-2">Topic Routing with RabbitMQ</h1>
          <p class="text-muted mb-0">
            This demonstration publishes one durable event to the cm.topic-demo topic exchange with a routing key such as widget.important.v1. RabbitMQ compares that routing key to each queue binding pattern, then copies the message into every matching queue. The producer only describes the event; the queue bindings decide which consumers would receive it.
          </p>
        </div>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ul class="mb-0 text-muted">
          <li>${sharedRabbitMqDemoNote.trim()}</li>
          <li>An exchange receives published messages and decides which queues should receive them.</li>
          <li>Producers publish to an exchange with a routing key; they do not need to know every queue.</li>
          <li>Queue bindings connect queues to an exchange and define the matching rules.</li>
          <li>A topic exchange uses binding patterns with * and # to match routing keys.</li>
          <li>One published message can be copied into multiple queues when multiple bindings match.</li>
        </ul>
      </div>

      ${statusMessage(topicRoutingFormState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Total queued copies</div>
            <div class="fs-3 fw-semibold">${totalMessages}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Queues with messages</div>
            <div class="fs-3 fw-semibold">${activeQueues}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Bindings</div>
            <div class="fs-3 fw-semibold">${topicRoutingState.queues.length}</div>
          </div>
        </div>
      </div>

      <form class="row g-2 align-items-end mb-4" data-form="topic-routing">
        <div class="col-12 col-lg">
          <label class="form-label">Routing key</label>
          <select class="form-select" name="routingKey">
            ${topicRoutingOptions()}
          </select>
        </div>
        <div class="col-12 col-sm-auto">
          <button class="btn btn-primary w-100" type="submit" ${isSubmitting ? "disabled" : ""}>Publish Event</button>
        </div>
        <div class="col-12 col-sm-auto ms-sm-auto">
          <button class="btn btn-outline-danger w-100" type="button" data-action="purge-topic-routing" ${isSubmitting ? "disabled" : ""}>Purge Queues</button>
        </div>
      </form>

      <div class="topic-routing-grid">
        ${topicRoutingState.queues.length ? topicRoutingQueueCards() : `<div class="text-muted">No topic routing queues loaded.</div>`}
      </div>
      ${backToTopButton()}
    </div>
  `;
}

function priorityQueuePage(): string {
  const isSubmitting = priorityQueueFormState.status === "submitting";

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="mb-4">
        <h1 class="h3 mb-2">Priority Queue with RabbitMQ</h1>
        <p class="text-muted mb-0">
          This demonstration uses one RabbitMQ queue declared with x-max-priority. Publishing assigns each job a priority number, and RabbitMQ prefers higher-priority waiting messages when the process buttons pull work from the queue. Priority only affects messages still waiting in the queue; work already delivered to a consumer is not taken back.
        </p>
        <p class="text-muted mb-0 mt-2">
          x-max-priority is a queue argument that enables priority handling for that queue and defines the highest supported priority value. In this demo, the queue supports priorities from 0 through 10; each published message sets its own priority, and RabbitMQ uses those values when choosing the next waiting message to deliver.
        </p>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ul class="mb-0 text-muted">
          <li>${sharedRabbitMqDemoNote.trim()}</li>
          <li>x-max-priority is set on the queue, not the exchange.</li>
          <li>It must be declared when the queue is created.</li>
          <li>RabbitMQ rejects conflicting declarations if the queue already exists without that argument.</li>
          <li>Higher number means higher priority.</li>
          <li>Priority only affects messages still waiting in the queue; delivered messages are not taken back from consumers.</li>
        </ul>
      </div>

      ${statusMessage(priorityQueueFormState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Waiting messages</div>
            <div class="fs-3 fw-semibold">${priorityQueueState.queue.messageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Published history</div>
            <div class="fs-3 fw-semibold">${priorityQueueState.publishedMessages.length}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Processed history</div>
            <div class="fs-3 fw-semibold">${priorityQueueState.processedMessages.length}</div>
          </div>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="d-flex flex-wrap gap-2">
          ${priorityQueuePublishButtons(isSubmitting)}
          <button class="btn btn-outline-primary" type="button" data-action="process-priority-queue" data-count="1" ${isSubmitting ? "disabled" : ""}>Process 1</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-priority-queue" data-count="5" ${isSubmitting ? "disabled" : ""}>Process 5</button>
        </div>
        <button class="btn btn-outline-danger ms-sm-auto" type="button" data-action="purge-priority-queue" ${isSubmitting ? "disabled" : ""}>Purge Queue</button>
      </div>

      <div class="row g-4">
        <div class="col-12 col-xl-6">
          <h2 class="h5 mb-2">Published Order</h2>
          <div class="table-responsive">
            <table class="table table-sm table-striped priority-queue-table">
              <thead>
                <tr>
                  <th>Published #</th>
                  <th>Priority</th>
                  <th>Job</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                ${priorityQueueState.publishedMessages.length ? priorityQueuePublishedRows(priorityQueueState.publishedMessages) : `<tr><td colspan="4" class="text-muted">No published messages.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="col-12 col-xl-6">
          <h2 class="h5 mb-2">Processed Order</h2>
          <div class="table-responsive">
            <table class="table table-sm table-striped priority-queue-table">
              <thead>
                <tr>
                  <th>Processed #</th>
                  <th>Published #</th>
                  <th>Priority</th>
                  <th>Job</th>
                  <th>Processed</th>
                </tr>
              </thead>
              <tbody>
                ${priorityQueueState.processedMessages.length ? priorityQueueProcessedRows(priorityQueueState.processedMessages) : `<tr><td colspan="5" class="text-muted">No processed messages.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      ${backToTopButton()}
    </div>
  `;
}

function loginPage(): string {
  const isSubmitting = loginState.status === "submitting";

  return `
    <div class="auth-panel">
      <h1 class="h3 mb-2">Login</h1>
      <p class="text-muted">Use your email address and password to access your account.</p>

      ${statusMessage(loginState)}

      <form data-form="login">
        <div class="mb-3">
          <label class="form-label">Email address</label>
          <input class="form-control" name="emailAddress" type="email" autocomplete="email" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" name="password" type="password" autocomplete="current-password" required />
        </div>

        <button class="btn btn-primary w-100" type="submit" ${isSubmitting ? "disabled" : ""}>
          ${isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <div class="mt-3 text-center">
        <a href="#register">Create account</a>
      </div>
    </div>
  `;
}

function registerPage(): string {
  const isSubmitting = registerState.status === "submitting";

  return `
    <div class="auth-panel">
      <h1 class="h3 mb-2">Create Account</h1>
      <p class="text-muted">
        Creating an account is not required to use the CM Platform demos. If you do create one, you can participate in the account creation workflow, including email confirmation and session inspection. You can delete your account at any time from My Account / Session State.
      </p>

      ${statusMessage(registerState)}

      <form data-form="register">
        <div class="mb-3">
          <label class="form-label">Email address</label>
          <input class="form-control" name="emailAddress" type="email" autocomplete="email" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" name="password" type="password" minlength="8" maxlength="200" autocomplete="new-password" required />
        </div>

        <button class="btn btn-primary w-100" type="submit" ${isSubmitting ? "disabled" : ""}>
          ${isSubmitting ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div class="mt-3 text-center">
        <a href="#login">Already have an account?</a>
      </div>
    </div>
  `;
}

function mongodbPage(): string {
  const isLoading = mongoWebhookFormState.status === "submitting";
  const liveCount = mongoWebhookExplorerState.sourceCounts.find((item) => item._id === "webhook")?.count ?? 0;

  return `
    <div class="platform-overview queue-panel">
      <section class="platform-hero">
        <div>
          <div class="platform-kicker">Document-oriented NoSQL</div>
          <h1 class="h3 mb-2">Email Webhook Explorer with MongoDB</h1>
          <p class="platform-lede">
            CM Platform includes email delivery through the Resend API and a webhook that tracks delivery outcomes.
            Each webhook arrives as a JSON payload and is stored as a document in MongoDB. This page demonstrates
            how a document database can store these payloads and search specific fields within them.
          </p>
          <p class="platform-lede mt-3">
            MongoDB stores each provider webhook as one document containing normalized searchable fields, nested
            processing metadata, recipient arrays, and the original payload when available. SQL Server remains
            responsible for relational business state.
          </p>
        </div>
        <div class="platform-stack">
          <div class="platform-stack-row">
            <span>Collection</span>
            <strong>emailWebhookEvents</strong>
          </div>
          <div class="platform-stack-row">
            <span>Persistence</span>
            <strong>Docker volume cm_platform_mongodb_data</strong>
          </div>
          <div class="platform-stack-row">
            <span>Privacy</span>
            <strong>Public API masks email addresses recursively</strong>
          </div>
          <div class="mongodb-credentials">
            <span class="mongodb-credentials-heading">MongoDB University skills</span>
            <div class="mongodb-credential-grid">
              <div class="mongodb-credential">
                <img
                  src="/mongodb-university-overview-badge.png"
                  alt="MongoDB University MongoDB Overview skill badge"
                >
                <strong>MongoDB Overview</strong>
              </div>
              <div class="mongodb-credential">
                <img
                  src="/mongodb-university-relational-document-badge.png"
                  alt="MongoDB University Relational to Document Model skill badge"
                >
                <strong>Relational to Document Model</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      ${statusMessage(mongoWebhookFormState)}

      <section class="row g-3">
        ${metricCard("Matching documents", mongoWebhookExplorerState.total)}
        ${metricCard("Live webhooks", liveCount)}
        ${metricCard("Event types", mongoWebhookExplorerState.eventTypeCounts.length)}
      </section>

      <section class="card shadow-sm">
        <div class="card-body">
          <form class="row g-3 align-items-end" data-form="mongodb-search">
            <div class="col-lg-5">
              <label class="form-label" for="mongodb-search">Search document fields</label>
              <input
                class="form-control"
                id="mongodb-search"
                name="q"
                value="${escapeHtml(mongoWebhookFilters.q)}"
                placeholder="Recipient, subject, email ID, sender..."
              >
            </div>
            <div class="col-md-4 col-lg-3">
              <label class="form-label" for="mongodb-event-type">Event type</label>
              <select class="form-select" id="mongodb-event-type" name="eventType">
                <option value="">All event types</option>
                ${mongoEventTypeOptions()}
              </select>
            </div>
            <div class="col-md-4 col-lg-2 d-grid">
              <button class="btn btn-primary" type="submit" ${isLoading ? "disabled" : ""}>
                ${isLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
          <div class="small text-muted mt-3">
            Indexed fields include receivedAt, eventType, recipients, emailId, and providerEventId.
          </div>
        </div>
      </section>

      <section class="card shadow-sm">
        <div class="card-header d-flex align-items-center justify-content-between gap-3">
          <strong>Webhook documents</strong>
          <button class="btn btn-sm btn-outline-secondary" type="button" data-action="refresh-mongodb" ${isLoading ? "disabled" : ""}>
            Refresh
          </button>
        </div>
        <div class="table-responsive">
          <table class="table table-hover align-middle mb-0 mongodb-webhook-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Event</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              ${mongoWebhookExplorerState.events.length
                ? mongoWebhookRows()
                : `<tr><td colspan="5" class="text-muted p-4">No MongoDB documents matched these filters.</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="card-footer d-flex align-items-center justify-content-between">
          <span class="text-muted small">
            Page ${mongoWebhookExplorerState.page} of ${mongoWebhookExplorerState.pageCount}
          </span>
          <div class="btn-group">
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              data-action="mongodb-page"
              data-page="${mongoWebhookExplorerState.page - 1}"
              ${mongoWebhookExplorerState.page <= 1 || isLoading ? "disabled" : ""}
            >Previous</button>
            <button
              class="btn btn-sm btn-outline-secondary"
              type="button"
              data-action="mongodb-page"
              data-page="${mongoWebhookExplorerState.page + 1}"
              ${mongoWebhookExplorerState.page >= mongoWebhookExplorerState.pageCount || isLoading ? "disabled" : ""}
            >Next</button>
          </div>
        </div>
      </section>
      ${backToTopButton()}
    </div>
  `;
}

function backToTopButton(): string {
  return `
    <div class="mobile-back-to-top">
      <button class="btn btn-sm btn-outline-secondary" type="button" data-action="back-to-top">
        Back to top
      </button>
    </div>
  `;
}

function metricCard(label: string, value: number): string {
  return `
    <div class="col-sm-6 col-xl-3">
      <div class="card h-100 shadow-sm">
        <div class="card-body">
          <div class="text-muted small">${escapeHtml(label)}</div>
          <div class="fs-3 fw-semibold">${value}</div>
        </div>
      </div>
    </div>
  `;
}

function mongoEventTypeOptions(): string {
  return mongoWebhookExplorerState.eventTypeCounts.map((item) => `
    <option value="${escapeHtml(item._id)}" ${mongoWebhookFilters.eventType === item._id ? "selected" : ""}>
      ${escapeHtml(item._id)} (${item.count})
    </option>
  `).join("");
}

function mongoWebhookRows(): string {
  return mongoWebhookExplorerState.events.map((event) => `
    <tr>
      <td class="text-nowrap">${formatDate(event.receivedAt)}</td>
      <td><code>${escapeHtml(event.eventType)}</code></td>
      <td>${event.recipients.length ? event.recipients.map(escapeHtml).join("<br>") : "None"}</td>
      <td>${escapeHtml(event.subject ?? "Not supplied")}</td>
      <td>
        <details>
          <summary class="mongodb-document-summary">View fields</summary>
          <pre class="mongodb-document mt-2 mb-0">${escapeHtml(JSON.stringify(event, null, 2))}</pre>
        </details>
      </td>
    </tr>
  `).join("");
}

function accountPage(): string {
  if (!account) {
    return `
      <div class="auth-panel">
        <h1 class="h3 mb-2">Account</h1>
        <p class="text-muted">You are not logged in.</p>
        <a class="btn btn-primary w-100" href="#login">Login</a>
      </div>
    `;
  }

  return `
    <div class="auth-panel auth-panel-wide">
      <h1 class="h3 mb-2">My Account</h1>
      <p class="text-muted">This page shows the authenticated session state.</p>

      ${statusMessage(accountState)}
      ${emailVerificationNotice(account)}

      <dl class="row mb-4">
        <dt class="col-sm-4">Account ID</dt>
        <dd class="col-sm-8">${account.accountId}</dd>

        <dt class="col-sm-4">Email address</dt>
        <dd class="col-sm-8">${escapeHtml(account.emailAddress)}</dd>

        <dt class="col-sm-4">Status</dt>
        <dd class="col-sm-8">${escapeHtml(account.status)}</dd>

        <dt class="col-sm-4">Email verified</dt>
        <dd class="col-sm-8">${account.emailVerifiedAt ? "Yes" : "No"}</dd>

        <dt class="col-sm-4">Created</dt>
        <dd class="col-sm-8">${formatDate(account.createdAt)}</dd>

        <dt class="col-sm-4">Last login</dt>
        <dd class="col-sm-8">${account.lastLoginAt ? formatDate(account.lastLoginAt) : "Never"}</dd>
      </dl>

      <h2 class="h5 mb-3">Current Session</h2>
      <dl class="row mb-4">
        <dt class="col-sm-4">Session ID</dt>
        <dd class="col-sm-8">${authSession ? authSession.authSessionId : "Unknown"}</dd>

        <dt class="col-sm-4">Cookie name</dt>
        <dd class="col-sm-8">cm_session</dd>

        <dt class="col-sm-4">Created</dt>
        <dd class="col-sm-8">${authSession ? formatDate(authSession.createdAt) : "Unknown"}</dd>

        <dt class="col-sm-4">Expires</dt>
        <dd class="col-sm-8">${authSession ? formatDate(authSession.expiresAt) : "Unknown"}</dd>

        <dt class="col-sm-4">Revoked</dt>
        <dd class="col-sm-8">${authSession?.revokedAt ? formatDate(authSession.revokedAt) : "No"}</dd>

        <dt class="col-sm-4">Time remaining</dt>
        <dd class="col-sm-8">${authSession ? formatRelativeExpiration(authSession.expiresAt) : "Unknown"}</dd>
      </dl>

      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" type="button" data-action="logout">Logout</button>
        <button class="btn btn-outline-danger ms-auto" type="button" data-action="delete-account">
          Delete Account
        </button>
      </div>
    </div>
  `;
}

function statusMessage(state: FormState): string {
  if (state.status === "success") {
    return `<div class="alert alert-success">${escapeHtml(state.message ?? "Success.")}</div>`;
  }

  if (state.status === "error") {
    return `<div class="alert alert-danger">${escapeHtml(state.message ?? "Request failed.")}</div>`;
  }

  return "";
}

function emailVerificationNotice(authAccount: AuthAccount): string {
  if (authAccount.emailVerifiedAt) {
    return "";
  }

  return `
    <div class="alert alert-warning">
      Your email address has not been verified yet. Check your email for the verification link.
    </div>
  `;
}

function resetFormState(state: FormState): void {
  state.status = "idle";
  state.message = undefined;
}

function resetStateForPageChange(nextPage: Page): void {
  if (currentPage === nextPage) {
    return;
  }

  if (nextPage !== "login") {
    resetFormState(loginState);
  }

  if (nextPage !== "register") {
    resetFormState(registerState);
  }

  if (nextPage !== "account") {
    resetFormState(accountState);
  }

  if (nextPage !== "widgets") {
    resetFormState(widgetState);
  }

  if (nextPage !== "competing-consumers") {
    resetFormState(widgetConsumerState);
  }

  if (nextPage !== "topic-routing") {
    resetFormState(topicRoutingFormState);
  }

  if (nextPage !== "priority-queue") {
    resetFormState(priorityQueueFormState);
  }

  if (nextPage !== "mongodb") {
    resetFormState(mongoWebhookFormState);
  }
}

function getCredentials(form: HTMLFormElement): { emailAddress: string; password: string } {
  const formData = new FormData(form);

  return {
    emailAddress: String(formData.get("emailAddress") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", token);

  return fetch(input, {
    ...init,
    headers,
  });
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch("/auth/csrf");

  if (!response.ok) {
    throw new Error(await readError(response, "Unable to initialize request protection"));
  }

  const body = await response.json() as { csrfToken?: string };

  if (!body.csrfToken) {
    throw new Error("Unable to initialize request protection.");
  }

  csrfToken = body.csrfToken;
  return csrfToken;
}

async function submitRegister(form: HTMLFormElement): Promise<void> {
  registerState.status = "submitting";
  registerState.message = undefined;
  render();

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(getCredentials(form)),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to create account"));
    }

    form.reset();
    resetFormState(registerState);
    loginState.status = "success";
    loginState.message = "Complete the verification process by checking your email and clicking on the Verify link. Clicking on the verification link will open a new page in your browser and you may continue to work in that session. You may close this browser window.";
    window.location.hash = "login";
  } catch (err) {
    registerState.status = "error";
    registerState.message = err instanceof Error ? err.message : "Unable to create account.";
  }

  render();
}

async function submitLogin(form: HTMLFormElement): Promise<void> {
  loginState.status = "submitting";
  loginState.message = undefined;
  render();

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(getCredentials(form)),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to log in"));
    }

    await response.json();
    await loadCurrentAccount();
    loginState.status = "idle";
    form.reset();
    window.location.hash = "account";
    render();
  } catch (err) {
    loginState.status = "error";
    loginState.message = err instanceof Error ? err.message : "Unable to log in.";
    render();
  }
}

async function loadCurrentAccount(): Promise<void> {
  try {
    const response = await fetch("/auth/me");

    if (!response.ok) {
      account = null;
      authSession = null;
      return;
    }

    const body = (await response.json()) as { account: AuthAccount; session?: AuthSession | null };
    account = body.account;
    authSession = body.session ?? null;
  } catch {
    account = null;
    authSession = null;
  }
}

async function logout(): Promise<void> {
  await csrfFetch("/auth/logout", { method: "POST" });
  account = null;
  authSession = null;
  accountState.status = "idle";
  window.location.hash = "login";
  render();
}

async function deleteAccount(): Promise<void> {
  const confirmed = window.confirm(
    "Delete this account? This frees the email address so you can repeat the flow.",
  );

  if (!confirmed) {
    return;
  }

  accountState.status = "submitting";
  accountState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/auth/me", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to delete account"));
    }

    account = null;
    authSession = null;
    resetFormState(accountState);
    resetFormState(registerState);
    window.location.hash = "register";
    render();
  } catch (err) {
    accountState.status = "error";
    accountState.message = err instanceof Error ? err.message : "Unable to delete account.";
    render();
  }
}

async function loadWidgets(): Promise<void> {
  try {
    const response = await fetch("/widgets");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load widgets"));
    }

    widgetQueueState = await response.json() as WidgetQueueState;
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to load widgets.";
  }
}

async function createWidgets(count: number): Promise<void> {
  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/widgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to create widgets"));
    }

    await loadWidgets();
    widgetState.status = "success";
    widgetState.message = `Created ${count} widget${count === 1 ? "" : "s"}.`;
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to create widgets.";
  }

  render();
}

async function processWidgets(count?: number): Promise<void> {
  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/widgets/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(count ? { count } : {}),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to process widgets"));
    }

    const body = await response.json() as {
      processedCount: number;
      retryCount: number;
      failedCount: number;
      invalidCount: number;
    };
    await loadWidgets();
    widgetState.status = "success";
    widgetState.message = `Processed ${body.processedCount} widget message${body.processedCount === 1 ? "" : "s"}.`;

    if (body.retryCount > 0) {
      widgetState.message += ` Scheduled ${body.retryCount} delayed retry${body.retryCount === 1 ? "" : "ies"}. After the retry delay (10 seconds), click Refresh, then Process again.`;
    }

    if (body.failedCount > 0) {
      widgetState.message += ` Dead-lettered ${body.failedCount} demo failure${body.failedCount === 1 ? "" : "s"}.`;
    }

    if (body.invalidCount > 0) {
      widgetState.message += ` Rejected ${body.invalidCount} invalid message${body.invalidCount === 1 ? "" : "s"}.`;
    }
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to process widgets.";
  }

  render();
}

async function deleteWidgets(): Promise<void> {
  const confirmed = window.confirm(
    "Delete all widget rows and purge the widget RabbitMQ queues?",
  );

  if (!confirmed) {
    return;
  }

  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/widgets", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to delete widgets"));
    }

    widgetQueueState = await response.json() as WidgetQueueState;
    widgetState.status = "success";
    widgetState.message = "Deleted all widget rows and purged widget queues.";
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to delete widgets.";
  }

  render();
}

async function replayDeadLetter(messageId: string): Promise<void> {
  await handleDeadLetterAction(messageId, "replay");
}

async function repairDeadLetter(messageId: string): Promise<void> {
  await handleDeadLetterAction(messageId, "repair");
}

async function handleDeadLetterAction(
  messageId: string,
  action: "repair" | "replay",
): Promise<void> {
  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await csrfFetch(`/widgets/dead-letter/${encodeURIComponent(messageId)}/${action}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(await readError(response, `Unable to ${action} dead-letter message`));
    }

    await loadWidgets();
    widgetState.status = "success";
    widgetState.message = action === "repair"
      ? "Repaired and replayed dead-letter message."
      : "Replayed dead-letter message.";
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : `Unable to ${action} dead-letter message.`;
  }

  render();
}

async function loadConsumerWidgets(): Promise<void> {
  try {
    const response = await fetch("/consumer-widgets");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load competing consumer widgets"));
    }

    widgetConsumerQueueState = await response.json() as WidgetConsumerQueueState;
  } catch (err) {
    widgetConsumerState.status = "error";
    widgetConsumerState.message = err instanceof Error ? err.message : "Unable to load competing consumer widgets.";
  }
}

async function createConsumerWidgets(count: number): Promise<void> {
  widgetConsumerState.status = "submitting";
  widgetConsumerState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/consumer-widgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to create competing consumer widgets"));
    }

    widgetConsumerQueueState = await response.json() as WidgetConsumerQueueState;
    widgetConsumerState.status = "success";
    widgetConsumerState.message = `Created ${count} competing consumer widget${count === 1 ? "" : "s"}. Refresh after the workers have time to process them.`;
  } catch (err) {
    widgetConsumerState.status = "error";
    widgetConsumerState.message = err instanceof Error ? err.message : "Unable to create competing consumer widgets.";
  }

  render();
}

async function deleteConsumerWidgets(): Promise<void> {
  const confirmed = window.confirm(
    "Delete all competing consumer widget rows and purge the RabbitMQ queue?",
  );

  if (!confirmed) {
    return;
  }

  widgetConsumerState.status = "submitting";
  widgetConsumerState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/consumer-widgets", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to delete competing consumer widgets"));
    }

    widgetConsumerQueueState = await response.json() as WidgetConsumerQueueState;
    widgetConsumerState.status = "success";
    widgetConsumerState.message = "Deleted all competing consumer widgets and purged the queue.";
  } catch (err) {
    widgetConsumerState.status = "error";
    widgetConsumerState.message = err instanceof Error ? err.message : "Unable to delete competing consumer widgets.";
  }

  render();
}

async function loadTopicRouting(): Promise<void> {
  try {
    const response = await fetch("/topic-routing");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load topic routing demo"));
    }

    topicRoutingState = await response.json() as TopicRoutingState;
  } catch (err) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = err instanceof Error ? err.message : "Unable to load topic routing demo.";
  }
}

async function publishTopicRoutingEvent(routingKey: string): Promise<void> {
  const selectedRoutingKey = routingKey.trim();

  if (!selectedRoutingKey) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = "Choose a routing key before publishing a topic routing event.";
    render();
    return;
  }

  topicRoutingFormState.status = "submitting";
  topicRoutingFormState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/topic-routing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ routingKey: selectedRoutingKey }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to publish topic routing event"));
    }

    topicRoutingState = await response.json() as TopicRoutingState;
    topicRoutingFormState.status = "success";
    topicRoutingFormState.message = `Published ${selectedRoutingKey}. RabbitMQ copied it into each queue with a matching binding pattern.`;
  } catch (err) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = err instanceof Error ? err.message : "Unable to publish topic routing event.";
  }

  render();
}

async function purgeTopicRoutingQueues(): Promise<void> {
  const confirmed = window.confirm("Purge all topic routing demo queues?");

  if (!confirmed) {
    return;
  }

  topicRoutingFormState.status = "submitting";
  topicRoutingFormState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/topic-routing", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to purge topic routing queues"));
    }

    topicRoutingState = await response.json() as TopicRoutingState;
    topicRoutingFormState.status = "success";
    topicRoutingFormState.message = "Purged all topic routing demo queues.";
  } catch (err) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = err instanceof Error ? err.message : "Unable to purge topic routing queues.";
  }

  render();
}

async function loadPriorityQueue(): Promise<void> {
  try {
    const response = await fetch("/priority-queue");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load priority queue demo"));
    }

    priorityQueueState = await response.json() as PriorityQueueState;
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to load priority queue demo.";
  }
}

async function loadPlatformStatus(): Promise<void> {
  try {
    const response = await fetch("/platform/status");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load platform infrastructure status"));
    }

    platformStatus = await response.json() as PlatformStatus;
    platformStatusState.status = "success";
    platformStatusState.message = undefined;
  } catch (err) {
    platformStatus = buildUnavailablePlatformStatus(err);
    platformStatusState.status = "error";
    platformStatusState.message = `Live platform status is unavailable; showing expected requirements instead. ${err instanceof Error ? err.message : "Unable to load platform infrastructure status."}`;
  }
}

function buildUnavailablePlatformStatus(err: unknown): PlatformStatus {
  const checkedAt = new Date().toISOString();
  const evidence = err instanceof Error ? err.message : "Unable to reach /platform/status.";
  const unavailableRequirements: Array<{
    key: string;
    name: string;
    disposition: InfrastructureDisposition;
    detail: string;
  }> = [
    {
      key: "api-service",
      name: "API Service",
      disposition: "offline",
      detail: "The public web app could not reach the platform status API.",
    },
    {
      key: "database",
      name: "Database",
      disposition: "unknown",
      detail: "Database status cannot be checked until the API service is running.",
    },
    {
      key: "rabbitmq-email-dispatcher",
      name: "RabbitMQ - Email Dispatcher",
      disposition: "unknown",
      detail: "Email dispatcher status cannot be checked until the API service is running.",
    },
    {
      key: "rabbitmq-slow-consumer",
      name: "RabbitMQ - slow-consumer",
      disposition: "unknown",
      detail: "Worker status cannot be checked until the API service is running.",
    },
    {
      key: "rabbitmq-fast-consumer",
      name: "RabbitMQ - fast-consumer",
      disposition: "unknown",
      detail: "Worker status cannot be checked until the API service is running.",
    },
    {
      key: "email-webhook",
      name: "Email Webhook",
      disposition: "unknown",
      detail: "Webhook event history cannot be checked until the API service is running.",
    },
  ];

  return {
    checkedAt,
    requirements: unavailableRequirements.map((requirement) => ({
      ...requirement,
      evidence,
      checkedAt,
    })),
    notes: [
      "These rows are a local fallback because /platform/status did not return a live status payload.",
      "Start the API and supporting infrastructure to replace these fallback dispositions with live checks. Use npm run infra:workers:up to start the Docker-managed background workers.",
    ],
  };
}

async function refreshPlatformStatus(): Promise<void> {
  platformStatusState.status = "submitting";
  platformStatusState.message = undefined;
  render();

  await loadPlatformStatus();
  render();
}

async function publishPriorityQueueJob(priority: number): Promise<void> {
  priorityQueueFormState.status = "submitting";
  priorityQueueFormState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/priority-queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ priority }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to publish priority queue job"));
    }

    priorityQueueState = await response.json() as PriorityQueueState;
    priorityQueueFormState.status = "success";
    priorityQueueFormState.message = `Published priority ${priority} job.`;
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to publish priority queue job.";
  }

  render();
}

async function processPriorityQueue(count: number): Promise<void> {
  priorityQueueFormState.status = "submitting";
  priorityQueueFormState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/priority-queue/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to process priority queue jobs"));
    }

    const body = await response.json() as PriorityQueueState & { processedCount: number };
    priorityQueueState = body;
    priorityQueueFormState.status = "success";
    priorityQueueFormState.message = `Processed ${body.processedCount} priority queue job${body.processedCount === 1 ? "" : "s"}.`;
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to process priority queue jobs.";
  }

  render();
}

async function purgePriorityQueue(): Promise<void> {
  const confirmed = window.confirm("Purge the priority queue and clear processed history?");

  if (!confirmed) {
    return;
  }

  priorityQueueFormState.status = "submitting";
  priorityQueueFormState.message = undefined;
  render();

  try {
    const response = await csrfFetch("/priority-queue", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to purge priority queue"));
    }

    priorityQueueState = await response.json() as PriorityQueueState;
    priorityQueueFormState.status = "success";
    priorityQueueFormState.message = "Purged priority queue and cleared processed history.";
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to purge priority queue.";
  }

  render();
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${response.status})`;
}

async function loadMongoWebhookEvents(page = 1): Promise<void> {
  mongoWebhookFormState.status = "submitting";
  mongoWebhookFormState.message = undefined;

  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(mongoWebhookExplorerState.pageSize),
  });

  if (mongoWebhookFilters.q) {
    query.set("q", mongoWebhookFilters.q);
  }

  if (mongoWebhookFilters.eventType) {
    query.set("eventType", mongoWebhookFilters.eventType);
  }

  try {
    const response = await fetch(`/email-webhook-events?${query}`);

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load MongoDB webhook events"));
    }

    mongoWebhookExplorerState = await response.json() as MongoWebhookExplorerState;
    mongoWebhookFormState.status = "idle";
    mongoWebhookFormState.message = undefined;
  } catch (err) {
    mongoWebhookFormState.status = "error";
    mongoWebhookFormState.message = err instanceof Error
      ? err.message
      : "Unable to load MongoDB webhook events.";
  }
}

async function submitMongoWebhookSearch(form: HTMLFormElement): Promise<void> {
  const formData = new FormData(form);
  mongoWebhookFilters = {
    q: String(formData.get("q") ?? "").trim(),
    eventType: String(formData.get("eventType") ?? ""),
  };
  await loadMongoWebhookEvents(1);
  render();
}

function bindEvents(): void {
  const registerForm = document.querySelector<HTMLFormElement>('[data-form="register"]');
  const loginForm = document.querySelector<HTMLFormElement>('[data-form="login"]');
  const topicRoutingForm = document.querySelector<HTMLFormElement>('[data-form="topic-routing"]');
  const mongoSearchForm = document.querySelector<HTMLFormElement>('[data-form="mongodb-search"]');

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitRegister(registerForm);
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitLogin(loginForm);
  });

  topicRoutingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(topicRoutingForm);
    void publishTopicRoutingEvent(String(formData.get("routingKey") ?? ""));
  });

  mongoSearchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitMongoWebhookSearch(mongoSearchForm);
  });

  document.querySelectorAll<HTMLAnchorElement>("#publicSidebarNav .public-nav-link").forEach((link) => {
    link.addEventListener("click", () => {
      const sidebarNav = document.querySelector<HTMLElement>("#publicSidebarNav");
      const collapse = sidebarNav ? Collapse.getOrCreateInstance(sidebarNav, { toggle: false }) : null;

      if (collapse && window.matchMedia("(max-width: 991.98px)").matches) {
        collapse.hide();
      }
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="logout"]')?.addEventListener("click", () => {
    void logout();
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-account"]')?.addEventListener("click", () => {
    void deleteAccount();
  });

  document.querySelector<HTMLButtonElement>('[data-action="refresh-widgets"]')?.addEventListener("click", () => {
    void loadWidgets().then(render);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="create-widget"]').forEach((button) => {
    button.addEventListener("click", () => {
      void createWidgets(Number(button.dataset.count ?? "1"));
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="process-widgets"]').forEach((button) => {
    button.addEventListener("click", () => {
      void processWidgets(Number(button.dataset.count ?? "1"));
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="process-all-widgets"]')?.addEventListener("click", () => {
    void processWidgets();
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-widgets"]')?.addEventListener("click", () => {
    void deleteWidgets();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="replay-dead-letter"]').forEach((button) => {
    button.addEventListener("click", () => {
      const messageId = button.dataset.messageId;

      if (messageId) {
        void replayDeadLetter(messageId);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="repair-dead-letter"]').forEach((button) => {
    button.addEventListener("click", () => {
      const messageId = button.dataset.messageId;

      if (messageId) {
        void repairDeadLetter(messageId);
      }
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="refresh-consumer-widgets"]')?.addEventListener("click", () => {
    void loadConsumerWidgets().then(render);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="create-consumer-widget"]').forEach((button) => {
    button.addEventListener("click", () => {
      void createConsumerWidgets(Number(button.dataset.count ?? "10"));
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-consumer-widgets"]')?.addEventListener("click", () => {
    void deleteConsumerWidgets();
  });

  document.querySelector<HTMLButtonElement>('[data-action="purge-topic-routing"]')?.addEventListener("click", () => {
    void purgeTopicRoutingQueues();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="publish-priority-job"]').forEach((button) => {
    button.addEventListener("click", () => {
      void publishPriorityQueueJob(Number(button.dataset.priority ?? "1"));
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="process-priority-queue"]').forEach((button) => {
    button.addEventListener("click", () => {
      void processPriorityQueue(Number(button.dataset.count ?? "1"));
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="purge-priority-queue"]')?.addEventListener("click", () => {
    void purgePriorityQueue();
  });

  document.querySelector<HTMLButtonElement>('[data-action="refresh-platform-status"]')?.addEventListener("click", () => {
    void refreshPlatformStatus();
  });

  document.querySelector<HTMLButtonElement>('[data-action="refresh-mongodb"]')?.addEventListener("click", () => {
    void loadMongoWebhookEvents(mongoWebhookExplorerState.page).then(render);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="mongodb-page"]').forEach((button) => {
    button.addEventListener("click", () => {
      void loadMongoWebhookEvents(Number(button.dataset.page ?? "1")).then(render);
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="back-to-top"]').forEach((button) => {
    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  });
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    throw new Error("Missing #app element");
  }

  syncSidebarSectionsFromDom();

  const page = getCurrentPage();
  resetStateForPageChange(page);
  currentPage = page;
  applyRouteMessage();

  const content =
    page === "home"
      ? homePage()
      : page === "infrastructure"
        ? infrastructurePage()
        : page === "cicd"
          ? cicdPage()
          : page === "secrets"
            ? secretsPage()
            : page === "security"
              ? securityPage()
              : page === "iam"
                ? iamPage()
                : page === "register"
                  ? registerPage()
                  : page === "account"
                    ? accountPage()
                    : page === "widgets"
                      ? widgetsPage()
                      : page === "competing-consumers"
                        ? competingConsumersPage()
                        : page === "topic-routing"
                          ? topicRoutingPage()
                          : page === "priority-queue"
                            ? priorityQueuePage()
                            : page === "mongodb"
                              ? mongodbPage()
                              : loginPage();

  app.innerHTML = layout(content);
  bindEvents();
}

function syncSidebarSectionsFromDom(): void {
  const platformPanel = document.querySelector<HTMLElement>("#platformNav");
  const identityPanel = document.querySelector<HTMLElement>("#identityAccessNav");
  const accountPanel = document.querySelector<HTMLElement>("#myAccountNav");
  const messagingPanel = document.querySelector<HTMLElement>("#queueDemosNav");
  const dataPanel = document.querySelector<HTMLElement>("#dataStoresNav");

  sidebarSectionsOpen = {
    platform: platformPanel ? platformPanel.classList.contains("show") : sidebarSectionsOpen.platform,
    identity: identityPanel ? identityPanel.classList.contains("show") : sidebarSectionsOpen.identity,
    account: accountPanel ? accountPanel.classList.contains("show") : sidebarSectionsOpen.account,
    messaging: messagingPanel ? messagingPanel.classList.contains("show") : sidebarSectionsOpen.messaging,
    data: dataPanel ? dataPanel.classList.contains("show") : sidebarSectionsOpen.data,
  };
}

function applyRouteMessage(): void {
  if (window.location.hash === "#login-email-verified") {
    loginState.status = "success";
    loginState.message = "Email address verified. Log in below to continue.";
    window.history.replaceState(null, "", "#login");
    return;
  }

  if (window.location.hash === "#login-email-verification-failed") {
    loginState.status = "error";
    loginState.message = "Email verification failed or the link has expired.";
    window.history.replaceState(null, "", "#login");
  }
}

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeExpiration(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();

  if (!Number.isFinite(diffMs)) {
    return "Unknown";
  }

  if (diffMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function widgetRows(): string {
  return widgetQueueState.widgets.map((widget) => `
    <tr>
      <td>${widget.widgetId}</td>
      <td>${escapeHtml(widget.widgetName)}</td>
      <td>${statusBadge(widget.status)}</td>
      <td>${widget.processCount}</td>
      <td>${formatDate(widget.createdAt)}</td>
      <td>${widget.processedAt ? formatDate(widget.processedAt) : ""}</td>
    </tr>
  `).join("");
}

function deadLetterRows(isSubmitting: boolean): string {
  return widgetQueueState.deadLetterMessages.map((message) => `
    <tr>
      <td>${message.widgetId}</td>
      <td>${escapeHtml(message.widgetName)}</td>
      <td><span class="badge text-bg-danger">dead-letter</span></td>
      <td></td>
      <td>${formatDate(message.requestedAt)}</td>
      <td>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-outline-secondary" type="button" data-action="replay-dead-letter" data-message-id="${escapeHtml(message.messageId)}" ${isSubmitting ? "disabled" : ""}>Replay</button>
          <button class="btn btn-sm btn-outline-primary" type="button" data-action="repair-dead-letter" data-message-id="${escapeHtml(message.messageId)}" ${isSubmitting ? "disabled" : ""}>Repair</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function consumerProcessedCards(): string {
  const entries = Object.entries(widgetConsumerQueueState.processedBy)
    .sort(([left], [right]) => left.localeCompare(right));

  if (!entries.length) {
    return `
      <div class="col-sm-6 col-lg">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small">Workers</div>
          <div class="fs-3 fw-semibold">0</div>
        </div>
      </div>
    `;
  }

  return entries.map(([consumerName, count]) => `
    <div class="col-sm-6 col-lg">
      <div class="border rounded p-3 h-100">
        <div class="text-muted small">${escapeHtml(consumerName)}</div>
        <div class="fs-3 fw-semibold">${count}</div>
      </div>
    </div>
  `).join("");
}

function consumerWidgetRows(): string {
  return widgetConsumerQueueState.widgets.map((widget) => `
    <tr>
      <td>${widget.widgetId}</td>
      <td>${escapeHtml(widget.widgetName)}</td>
      <td>${statusBadge(widget.status)}</td>
      <td>${widget.processedBy ? escapeHtml(widget.processedBy) : ""}</td>
      <td>${widget.processingSeconds ?? ""}</td>
      <td>${formatDate(widget.createdAt)}</td>
      <td>${widget.processedAt ? formatDate(widget.processedAt) : ""}</td>
    </tr>
  `).join("");
}

function topicRoutingOptions(): string {
  const routingKeys = topicRoutingState.sampleRoutingKeys.length
    ? topicRoutingState.sampleRoutingKeys
    : fallbackTopicRoutingSampleKeys;

  return routingKeys.map((routingKey) => `
    <option value="${escapeHtml(routingKey)}">${escapeHtml(routingKey)}</option>
  `).join("");
}

function topicRoutingQueueCards(): string {
  return topicRoutingState.queues.map((queue) => `
    <section class="topic-routing-card">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
        <div>
          <h2 class="h6 mb-1">${escapeHtml(queue.key)}</h2>
          <div class="text-muted small">${escapeHtml(queue.queue)}</div>
        </div>
        <span class="badge text-bg-secondary">${queue.messageCount}</span>
      </div>
      <dl class="row small mb-3">
        <dt class="col-sm-4">Binding</dt>
        <dd class="col-sm-8"><code>${escapeHtml(queue.bindingPattern)}</code></dd>
        <dt class="col-sm-4">Purpose</dt>
        <dd class="col-sm-8">${escapeHtml(queue.description)}</dd>
      </dl>
      <div class="table-responsive">
        <table class="table table-sm mb-0 topic-routing-table">
          <thead>
            <tr>
              <th>Routing Key</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            ${queue.messages.length ? topicRoutingMessageRows(queue.messages) : `<tr><td colspan="2" class="text-muted">No messages.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `).join("");
}

function topicRoutingMessageRows(messages: TopicRoutingDemoMessage[]): string {
  return messages.map((message) => `
    <tr>
      <td><code>${escapeHtml(message.routingKey)}</code></td>
      <td>${formatDate(message.requestedAt)}</td>
    </tr>
  `).join("");
}

function priorityQueuePublishButtons(isSubmitting: boolean): string {
  return priorityQueueState.levels.map((level) => `
    <button
      class="btn ${level.priority >= 9 ? "btn-danger" : level.priority >= 5 ? "btn-warning" : "btn-primary"}"
      type="button"
      data-action="publish-priority-job"
      data-priority="${level.priority}"
      ${isSubmitting ? "disabled" : ""}
    >
      Publish ${escapeHtml(level.label)}
    </button>
  `).join("");
}

function priorityQueuePublishedRows(messages: PriorityQueueMessage[]): string {
  return messages.map((message) => `
    <tr>
      <td>${message.publishSequence}</td>
      <td>${priorityBadge(message.priority)}</td>
      <td>${escapeHtml(message.jobName)}</td>
      <td>${formatDate(message.requestedAt)}</td>
    </tr>
  `).join("");
}

function priorityQueueProcessedRows(messages: ProcessedPriorityQueueMessage[]): string {
  return messages.map((message) => `
    <tr>
      <td>${message.processedSequence}</td>
      <td>${message.publishSequence}</td>
      <td>${priorityBadge(message.priority)}</td>
      <td>${escapeHtml(message.jobName)}</td>
      <td>${formatDate(message.processedAt)}</td>
    </tr>
  `).join("");
}

function infrastructureRows(requirements: InfrastructureRequirement[]): string {
  return requirements.map((requirement) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(requirement.name)}</div>
        <div class="text-muted small">${escapeHtml(requirement.detail)}</div>
      </td>
      <td>${infrastructureBadge(requirement.disposition)}</td>
      <td>
        <div>${escapeHtml(requirement.evidence)}</div>
        <div class="text-muted small">Checked ${formatDate(requirement.checkedAt)}</div>
      </td>
    </tr>
  `).join("");
}

function infrastructureBadge(disposition: InfrastructureDisposition): string {
  const badgeClass =
    disposition === "online"
      ? "text-bg-success"
      : disposition === "degraded"
        ? "text-bg-warning"
        : disposition === "offline"
          ? "text-bg-danger"
          : "text-bg-secondary";

  return `<span class="badge ${badgeClass}">${escapeHtml(disposition)}</span>`;
}

function priorityBadge(priority: number): string {
  const badgeClass =
    priority >= 9
      ? "text-bg-danger"
      : priority >= 5
        ? "text-bg-warning"
        : "text-bg-secondary";

  return `<span class="badge ${badgeClass}">${priority}</span>`;
}

function statusBadge(status: WidgetStatus | WidgetConsumerStatus): string {
  const badgeClass =
    status === "processed"
      ? "text-bg-success"
      : status === "failed"
        ? "text-bg-danger"
        : status === "processing"
          ? "text-bg-warning"
          : status === "retrying"
            ? "text-bg-info"
            : "text-bg-secondary";

  return `<span class="badge ${badgeClass}">${escapeHtml(status)}</span>`;
}


window.addEventListener("hashchange", render);

await loadCurrentAccount();
await loadWidgets();
await loadConsumerWidgets();
await loadTopicRouting();
await loadPriorityQueue();
await loadMongoWebhookEvents();
await loadPlatformStatus();
render();
