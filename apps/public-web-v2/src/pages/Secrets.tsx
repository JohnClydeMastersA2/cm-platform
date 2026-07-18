type SecretConcern = {
  title: string;
  body: string;
};

type EnvironmentRow = {
  environment: string;
  source: string;
  note: string;
};

const secretConcerns: SecretConcern[] = [
  {
    title: "Where secrets live",
    body:
      "Local development can use a machine-local env file. Production uses GitHub and Azure-managed secret injection instead of committed files."
  },
  {
    title: "How each environment gets them",
    body:
      "The same variable names should work in development and production, but the source changes: development reads local files, while production receives injected runtime values."
  },
  {
    title: "How the app proves configuration",
    body:
      "Services should validate required settings on startup and report readiness without logging or exposing the actual secret values. The Infrastructure Status API provides runtime evidence by checking whether configured dependencies are reachable and healthy; the Infrastructure Status page displays those results."
  }
];

const environmentRows: EnvironmentRow[] = [
  {
    environment: "Development",
    source: "packages/secrets/cm-platform.env",
    note: "Developer-owned local values used by npm scripts and Docker Compose."
  },
  {
    environment: "Production",
    source: "GitHub production secrets and Azure Container Apps secrets",
    note:
      "Production database, RabbitMQ, email, webhook, signing, and runtime values injected by the deployment and hosting platforms."
  }
];

const providerBindingExamples = [
  "Email capability: currently bound to Resend credentials",
  "Database capability: bound to local SQL Server or Azure SQL",
  "Messaging capability: bound to local RabbitMQ or CloudAMQP",
  "Edge access: bound to Cloudflare DNS and Access policy",
  "Future governance: Azure Key Vault could become the secret source without changing application variable names"
];

const configurationCards = [
  {
    title: "Committed example",
    body:
      "Keep a safe example file with variable names and placeholder values so each environment knows what it must provide.",
    proof: "packages/secrets/cm-platform.env.example"
  },
  {
    title: "Local-only values",
    body:
      "The real development env file can remain useful locally, but it should stay ignored by Git and treated as workstation state.",
    proof: "packages/secrets/cm-platform.env"
  },
  {
    title: "Runtime validation",
    body:
      "Backend services should fail fast or report degraded readiness when required variables are missing, without printing secret values.",
    proof: "startup validation and status checks"
  }
];

export function Secrets() {
  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">Containers / Secrets</p>
          <h1>Secret Handling Across Environments</h1>
          <p className="platform-lede">
            Secrets are part of the runtime contract for cm-platform. The goal is to keep local
            development convenient while making production depend on injected secrets rather than values
            committed to the repository or baked into Docker images.
          </p>
          <div className="platform-hero-actions">
            <span>Same image, same variable names, different secret sources per environment.</span>
          </div>
        </div>
        <div className="platform-stack" aria-label="Secret handling summary">
          <StackRow label="Development" value="Local env file stays machine-local and out of Git" />
          <StackRow label="Production" value="GitHub and Azure inject production values at deploy and runtime" />
        </div>
      </div>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Three Concerns</h2>
          <p>
            The secrets model should be evaluated through three practical questions. This keeps the
            design clear whether the app is running from npm scripts, Docker Compose, Kubernetes, or
            another container platform.
          </p>
        </div>
        <div className="platform-card-grid">
          {secretConcerns.map((concern) => (
            <article className="platform-card" key={concern.title}>
              <h3>{concern.title}</h3>
              <p>{concern.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <div>
          <h2>Environment Model</h2>
          <p>
            Development can stay simple with packages/secrets/cm-platform.env. Production should use the
            same variable names, but those values should be supplied by GitHub Actions and Azure
            Container Apps at deploy and runtime.
          </p>
        </div>
        <div className="platform-callout">
          <span>Docker rule</span>
          <strong>Secrets should be mounted or injected into containers, not copied into image layers.</strong>
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Disposition By Environment</h2>
          <p>
            This is the intended direction for cm-platform as it moves between local development and
            production hosting.
          </p>
          <p>
            cm-platform does not currently use a staging environment because this is a technical
            portfolio site with low production risk and direct owner validation. A staging environment
            could be added later by creating a separate GitHub environment, Azure Container Apps
            deployment, database, DNS name, and secret set that follow the same variable contract shown
            here.
          </p>
        </div>
        <div className="infrastructure-table-wrap">
          <table className="table table-sm infrastructure-table">
            <thead>
              <tr>
                <th>Environment</th>
                <th>Secret Source</th>
                <th>Disposition</th>
              </tr>
            </thead>
            <tbody>
              {environmentRows.map((row) => (
                <tr key={row.environment}>
                  <td>{row.environment}</td>
                  <td>{row.source}</td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Configuration Versus Secrets</h2>
          <p>
            Public URLs, ports, feature flags, and log levels are configuration. Database passwords,
            session signing keys, RabbitMQ credentials, SMTP keys, and webhook signing values are
            secrets.
          </p>
          <p>
            Frontend values bundled into the Vite public web app should be treated as public. Anything
            exposed through a VITE_* variable must be safe for a browser user to see.
          </p>
        </div>
        <div className="platform-card-grid">
          {configurationCards.map((card) => (
            <article className="platform-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <div className="platform-proof">{card.proof}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <div>
          <h2>Provider Binding</h2>
          <p>
            Application code should depend on platform capabilities, while each environment binds those
            capabilities to concrete providers through configuration and secrets. For example, the
            platform needs an email-sending capability; production currently binds that capability to
            Resend by providing the expected credentials.
          </p>
          <p>
            If a provider changes later, the adapter and secret values may change, but the rest of the
            platform should continue to ask for the same capability rather than spreading
            provider-specific assumptions across the codebase.
          </p>
        </div>
        <div className="future-list">
          {providerBindingExamples.map((example) => (
            <span key={example}>{example}</span>
          ))}
        </div>
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
