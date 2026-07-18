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
  "Docker local infrastructure"
];

const platformCards = [
  {
    title: "API-first Core",
    body:
      "Fastify owns the public and internal route surfaces so web apps, HTTP engines, workers, and tools can all integrate through explicit service boundaries.",
    proof: "svc-core, /auth, /internal, webhook endpoints"
  },
  {
    title: "Messaging",
    body:
      "RabbitMQ demos show durable publishing, retries, dead-letter handling, topic routing, priority queues, and competing consumers.",
    proof: "widget, topic-routing, priority-queue demos"
  },
  {
    title: "Processing engines",
    body:
      "Background services consume platform work independently from user-facing pages. Future HTTP processing engines can call the same API surfaces.",
    proof: "services/email-dispatcher and services/widget-consumer"
  },
  {
    title: "Persistence",
    body:
      "SQL Server stores visible workflow state and event history, while MongoDB stores document-shaped webhook events for provider payload inspection and delivery history.",
    proof: "SQL Server workflow tables, MongoDB Atlas, /email-webhook-events"
  },
  {
    title: "CI/CD",
    body:
      "GitHub Actions builds source, validates production container images, publishes SHA-tagged GHCR images, gates production deployments, and records deployment evidence as part of the platform learning path.",
    proof: "GitHub Actions, GHCR, protected production environment, docs/deployment-plan.md"
  },
  {
    title: "Secure by Design",
    body:
      "The platform applies Content Security Policy, CSRF request protection, rate limiting, Cloudflare edge controls, and gateway security headers as part of the application design.",
    proof: "CSP, CSRF token headers, auth rate limits, Cloudflare, Nginx security headers"
  },
  {
    title: "Developer operations",
    body:
      "PowerShell and npm scripts provide a repeatable local command surface for infrastructure, schema updates, workers, smoke tests, and webhook tooling.",
    proof: "scripts, tools, docker, README runbooks"
  },
  {
    title: "AI-assisted Development",
    body:
      "CM Platform is developed using AI as an engineering partner. AI assists with design exploration, implementation alternatives, code generation, documentation, testing, and architectural review, while engineering decisions, integration, validation, and overall platform direction remain intentionally owned by the project.",
    proof: "agent-guided implementation notes and docs/deployment-plan.md"
  }
];

const capabilities = [
  ["Backend Services & APIs", "Node.js, Fastify, TypeScript, REST APIs"],
  ["Data & Persistence", "SQL Server, MongoDB, ETL Pipelines"],
  ["Messaging & Background Processing", "RabbitMQ, Durable Messaging, Worker Services"],
  ["Frontend", "TypeScript, Vite, Bootstrap, React"],
  ["Cloud & DevOps", "Azure, Docker, GitHub Actions, Bicep, CI/CD"],
  ["Architecture & Operations", "Health Checks, Structured Logging, Configuration Management, Operational Automation"],
  ["Engineering Practices", "Git, Documentation, Testing, Security, CI/CD, Infrastructure as Code"],
  ["Current Expansion", "Java, Spring Boot Microservices, React"]
];

export function Home() {
  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">API-first application platform</p>
          <h1>CM Platform</h1>
          <p className="platform-lede">
            CM Platform is a modern software engineering platform built to demonstrate the design,
            development, deployment and operation of production-oriented applications using contemporary
            backend, cloud, and DevOps technologies. It serves as the foundation for demonstrating
            platform architecture, REST APIs, asynchronous messaging, durable workflow state, SQL and
            NoSQL persistence, background processing, Infrastructure as Code, CI/CD automation, and
            operational engineering practices. Rather than focusing on individual technologies, CM
            Platform demonstrates how these capabilities work together to build maintainable, scalable,
            and production-ready software systems.
          </p>
        </div>
        <div className="platform-stack" aria-label="Platform architecture summary">
          <StackRow label="Clients" value="Public web, future HTTP engines, tools" />
          <StackRow label="API" value="Fastify public, private, and webhook surfaces" />
          <StackRow label="Platform" value="Contracts, messaging, persistence, services" />
        </div>
      </div>

      <section className="platform-credentials">
        <div>
          <p className="platform-kicker">Engineering Portfolio</p>
          <h2>Built by John Clyde Masters</h2>
          <p>
            CM Platform is my long-term software engineering portfolio. Rather than presenting isolated
            code samples or proof-of-concept applications, it demonstrates complete engineering
            solutions, from architecture and implementation through testing, deployment, monitoring, and
            continuous delivery. Every feature represents technology that I have intentionally studied,
            implemented, and integrated into a cohesive platform, providing practical evidence of my
            approach to software engineering and my commitment to continuously expanding my technical
            capabilities.
          </p>
          <div className="platform-card-actions">
            <a className="platform-small-link" href={sourceCodeUrl} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a className="platform-secondary-link" href="/john_clyde_masters_resume.pdf" download>
              Download Resume
            </a>
          </div>
        </div>
        <div className="platform-credential-list" aria-label="Technical credentials demonstrated by this project">
          {credentials.map((credential) => (
            <span key={credential}>{credential}</span>
          ))}
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>At a Glance</h2>
          <div className="infrastructure-table-wrap">
            <table className="table table-sm infrastructure-table at-a-glance-table">
              <thead>
                <tr>
                  <th>Capability</th>
                  <th>Technologies</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map(([capability, technologies]) => (
                  <tr key={capability}>
                    <td>
                      <strong>{capability}</strong>
                    </td>
                    <td>{technologies}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Technology Evidence</h2>
          <p>
            These cards describe platform objectives and technologies implemented. They are meant to
            complement the navigation, not repeat it.
          </p>
        </div>
        <div className="platform-card-grid">
          {platformCards.map((card) => (
            <article className="platform-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
              <div className="platform-proof">{card.proof}</div>
            </article>
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
