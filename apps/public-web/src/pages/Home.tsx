import { BackToTop } from "../components/BackToTop";

const sourceCodeUrl = "https://github.com/JohnClydeMastersA2/cm-platform";

const credentials = [
  "API-first platform design",
  "TypeScript full-stack development",
  "Fastify service architecture",
  "Postgres workflow persistence",
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
      "Postgres stores visible workflow state and account data, while MongoDB stores document-shaped webhook events for provider payload inspection and delivery history.",
    proof: "Postgres workflow tables, MongoDB Atlas, /email-webhook-events"
  },
  {
    title: "React Frontend",
    body:
      "React organizes the public website into reusable pages, shared layout, route-aware navigation, and interactive demo views while Bootstrap provides the visual foundation.",
    proof: "React, Vite, Bootstrap, apps/public-web"
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
  ["Data & Persistence", "Postgres, MongoDB, RabbitMQ-backed workflow state"],
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
            CM Platform is a modern software engineering platform built to demonstrate how
            production-oriented applications can be designed, developed, deployed, and operated using
            contemporary backend, cloud, and DevOps technologies.
          </p>
          <p className="platform-lede mt-3">
            The project demonstrates an API-first architecture, REST services, asynchronous messaging,
            durable workflow state, relational and document persistence, background processing,
            Infrastructure as Code, CI/CD automation, and cloud deployments.
          </p>
          <p className="platform-lede mt-3">
            Rather than showcasing individual technologies in isolation, CM Platform demonstrates how
            these capabilities can work together to build a maintainable, scalable, and production-ready
            software system.
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
            CM Platform is a software engineering portfolio. Every feature represents technology that I
            have studied, implemented, and integrated into the project, providing a practical review of
            my approach to software engineering and my commitment to continuously expanding my technical
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
      <BackToTop />
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
