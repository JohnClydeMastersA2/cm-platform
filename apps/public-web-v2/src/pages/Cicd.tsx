type EvidenceCard = {
  title: string;
  body: string;
  proof: string;
};

type AzureRow = {
  resource: string;
  purpose: string;
  value: string;
};

const cicdCards: EvidenceCard[] = [
  {
    title: "Build verification",
    body:
      "GitHub Actions runs the repository build from a clean Linux runner so the codebase is proven outside the developer workstation before deployment decisions are made.",
    proof: "Build workflow, CodeQL, npm audit, docs/deployment-plan.md"
  },
  {
    title: "Container image publication",
    body:
      "Production Docker images are built for the public web gateway, API, email dispatcher, widget consumers, and maintenance worker, then published with immutable commit SHA tags.",
    proof: "GHCR SHA-tagged images and Container Build jobs"
  },
  {
    title: "Protected production deployment",
    body:
      "Production deployment is gated by the GitHub production environment, manual approval, explicit deploy confirmations, and Azure OIDC rather than long-lived cloud passwords.",
    proof: "GitHub Environment production, Azure OIDC, Bicep deploy workflows"
  },
  {
    title: "Infrastructure as code",
    body:
      "Azure resources are modeled with Bicep so foundation, SQL, and Container Apps changes can be reviewed, previewed with what-if, and deployed through the same protected workflow path.",
    proof: "infra/bicep and docs/deployment-plan.md"
  },
  {
    title: "Runtime configuration",
    body:
      "Production containers receive configuration through environment variables and platform secrets, keeping source code, images, and local env files separate from production values.",
    proof: "Azure Container Apps secrets and GitHub production secrets"
  },
  {
    title: "Scheduled operations",
    body:
      "The demo maintenance worker is being prepared as a scheduled operations job to clean shared demo state and send email summaries, extending CI/CD into operation and hygiene.",
    proof: "services/demo-maintenance and Phase 5 notes"
  }
];

const containerRuntimeCards: EvidenceCard[] = [
  {
    title: "Local infrastructure",
    body:
      "Docker Compose owns SQL Server, MongoDB, and RabbitMQ locally so the platform can run repeatable dependencies without installing those services directly on the workstation.",
    proof: "docker/compose.dev.yml"
  },
  {
    title: "Production-style images",
    body:
      "The public web gateway, API, email dispatcher, widget consumers, and maintenance worker build into deployable images so CI can prove packaging before deployment.",
    proof: "docker/Dockerfile.* and GitHub Container Build jobs"
  },
  {
    title: "Same-origin gateway",
    body:
      "Nginx serves the compiled Vite site and proxies API routes to svc-core over localhost, preserving browser cookie behavior and matching the Azure Container Apps sidecar model.",
    proof: "docker/nginx.public-web.conf"
  },
  {
    title: "Production-like local runtime",
    body:
      "The production images can run together locally against SQL Server, MongoDB, and RabbitMQ with only the web gateway exposed, giving a final smoke test before cloud deployment.",
    proof: "npm run prod-local:up and npm run prod-local:verify"
  }
];

const azureRows: AzureRow[] = [
  {
    resource: "Resource group",
    purpose: "Groups the production Azure resources under one management and cost boundary.",
    value: "rg-cm-platform-prod"
  },
  {
    resource: "Azure Container Apps environment",
    purpose: "Hosts the public web/API app and worker Container Apps on the consumption plan.",
    value: "cae-cm-platform-prod-cus"
  },
  {
    resource: "Public web/API Container App",
    purpose: "Runs Nginx as the public gateway with svc-core as the API sidecar.",
    value: "ca-cmp-web-prod"
  },
  {
    resource: "Worker Container Apps",
    purpose: "Run the email dispatcher and widget consumer demos as separate observable workloads.",
    value: "ca-cmp-email-prod, ca-cmp-widget-fast-prod, ca-cmp-widget-slow-prod"
  },
  {
    resource: "Azure SQL Database",
    purpose: "Hosts the relational production schema with encrypted transport and separate migration/runtime identities.",
    value: "CMPlatform on Azure SQL"
  },
  {
    resource: "Log Analytics",
    purpose: "Receives Azure Container Apps logs with short retention for low-cost operational visibility.",
    value: "log-cm-platform-prod-cus"
  }
];

const deploymentFlow = [
  "GitHub commit",
  "Build and scan",
  "GHCR images",
  "Production approval",
  "Bicep what-if",
  "Azure deploy",
  "Smoke tests"
];

export function Cicd() {
  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">CI/CD and Azure</p>
          <h1>Deployment Pipeline and Cloud Runtime</h1>
          <p className="platform-lede">
            CM Platform uses Docker, GitHub Actions, GHCR, Azure Bicep, Azure Container Apps,
            and Azure SQL to turn local TypeScript services into a protected, production-like
            public portfolio environment.
          </p>
          <div className="platform-hero-actions">
            <span>Reference: docs/deployment-plan.md</span>
          </div>
        </div>
        <div className="platform-stack" aria-label="CI/CD deployment summary">
          <StackRow label="Source" value="GitHub repository, protected production environment, GitHub Actions workflows" />
          <StackRow label="Artifacts" value="Docker images tagged by Git SHA and published to GitHub Container Registry" />
          <StackRow label="Runtime" value="Azure Container Apps, Azure SQL, managed external MongoDB/RabbitMQ/Resend services" />
        </div>
      </div>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Deployment Flow</h2>
          <p>
            The deployment plan intentionally separates build, image publication, infrastructure
            preview, database migration, runtime deployment, and smoke testing. That keeps each
            production change reviewable and gives the portfolio concrete evidence of modern CI/CD
            practice.
          </p>
          <p>
            Docker provides the container image contract. GitHub Actions builds and publishes those
            images to GHCR, and Azure Container Apps runs them in production.
          </p>
        </div>
        <div className="platform-flow platform-flow-separated" aria-label="CI/CD deployment flow">
          {deploymentFlow.map((step) => (
            <div className={step === "Production approval" ? "platform-flow-core" : undefined} key={step}>
              {step}
            </div>
          ))}
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>What Azure Runs</h2>
          <p>
            Azure is the production host for the container runtime, relational database, deployment
            identity, logs, budget controls, and custom-domain binding. MongoDB Atlas, CloudAMQP,
            Cloudflare, Resend, and GHCR remain managed services outside Azure.
          </p>
        </div>
        <div className="infrastructure-table-wrap">
          <table className="table table-sm infrastructure-table">
            <thead>
              <tr>
                <th>Azure Resource</th>
                <th>Purpose</th>
                <th>Current Name / Disposition</th>
              </tr>
            </thead>
            <tbody>
              {azureRows.map((row) => (
                <tr key={row.resource}>
                  <td>{row.resource}</td>
                  <td>{row.purpose}</td>
                  <td>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="platform-section">
        <div>
          <h2>Architecture View</h2>
          <p>
            Azure can help visualize deployed resources through portal resource views, resource group
            listings, topology-style blades, and exported diagrams from third-party tools. For this
            portfolio, the clearest diagram should be maintained in the repository because it can show
            both Azure and non-Azure services in one intentional picture.
          </p>
        </div>
        <div className="architecture-diagram-card">
          <a href="/cicd-architecture.svg" target="_blank" rel="noreferrer">
            <img
              src="/cicd-architecture.svg"
              alt="CM Platform CI/CD architecture showing GitHub Actions, GHCR, Azure Container Apps, Azure SQL, MongoDB Atlas, CloudAMQP, Resend, and Cloudflare"
            />
          </a>
          <p>
            Source: <code>docs/cicd-architecture.mmd</code>. Rendered asset:{" "}
            <code>apps/public-web/public/cicd-architecture.svg</code>.{" "}
            <a href="/cicd-architecture.svg" target="_blank" rel="noreferrer">
              Open full-size diagram
            </a>
            .
          </p>
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>How Containers Fit</h2>
          <p>
            Docker remains part of the deployment story because containers are the artifact that GitHub
            Actions builds, GHCR stores, and Azure Container Apps runs.
          </p>
        </div>
        <EvidenceGrid cards={containerRuntimeCards} />
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Technology Evidence</h2>
          <p>These cards summarize the CI/CD and Azure practices captured in docs/deployment-plan.md.</p>
        </div>
        <EvidenceGrid cards={cicdCards} />
      </section>
    </section>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-stack-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EvidenceGrid({ cards }: { cards: EvidenceCard[] }) {
  return (
    <div className="platform-card-grid">
      {cards.map((card) => (
        <article className="platform-card" key={card.title}>
          <h3>{card.title}</h3>
          <p>{card.body}</p>
          <div className="platform-proof">{card.proof}</div>
        </article>
      ))}
    </div>
  );
}
