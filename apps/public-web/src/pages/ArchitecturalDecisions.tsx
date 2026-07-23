import { BackToTop } from "../components/BackToTop";

const decisions = [
  {
    title: "Why Build CM Platform?",
    body:
      "CM Platform began as an exploration of modern backend technologies but has evolved into a comprehensive software engineering portfolio. Rather than building isolated demonstrations of individual frameworks, the project is intended to show how modern software systems are conceived, organized, implemented, deployed, secured, monitored, and maintained. It serves as both a learning platform and a long-term record of my continued growth as a software engineer."
  },
  {
    title: "Why Simplicity?",
    body:
      "A recurring objective throughout CM Platform is to favor simple, understandable solutions over unnecessary complexity. Modern software engineering often rewards sophisticated frameworks and abstractions, but long-term maintainability depends on systems that developers can quickly understand, modify, and support. Throughout the platform, architectural decisions intentionally prioritize clarity, explicitness, and operational simplicity. New technologies are introduced only when they provide meaningful value to the platform rather than simply expanding the technology stack."
  },
  {
    title: "Why Fastify?",
    body:
      "Fastify was selected as the primary backend framework after evaluating several alternatives, including Java/Spring Boot. The decision was based on its lightweight architecture, excellent TypeScript support, plugin-based extensibility, and high-performance request handling. More importantly, Fastify encourages clean separation of concerns through plugins, decorators, and route registration, making it well suited for a modular platform intended to evolve over time. The choice also provided an opportunity to gain practical experience with the modern Node.js ecosystem while preserving a strong focus on software architecture rather than framework-specific conventions."
  },
  {
    title: "Why TypeScript?",
    body:
      "TypeScript was chosen to improve maintainability and correctness as the platform grew. Strong typing provides better documentation, improved tooling, safer refactoring, and earlier detection of integration errors. Because contracts are shared between services, workers, and client applications, TypeScript allows those contracts to be defined once and validated throughout the platform. The goal was not simply to write JavaScript with types, but to establish a consistent development experience across backend services, frontend applications, and shared packages."
  },
  {
    title: "Why React?",
    body:
      "React was introduced to give the public website a more maintainable structure as the portfolio grew from static content into a collection of routed pages, account workflows, infrastructure status views, and interactive RabbitMQ and MongoDB demos. React keeps page behavior close to the page that owns it, supports reusable layout and UI components, and provides a market-relevant frontend model without replacing the existing Bootstrap visual foundation."
  },
  {
    title: "Why SQL Server?",
    body:
      "SQL Server remains the primary transactional database because it is a mature, highly capable relational platform with which I have extensive professional experience. The platform stores durable workflow state, configuration, and operational data where relational integrity, transactional consistency, and structured querying are important. Choosing SQL Server also demonstrates that modern application architecture can successfully combine established enterprise technologies with newer cloud-native components."
  },
  {
    title: "Why MongoDB?",
    body:
      "MongoDB was introduced to demonstrate document-oriented persistence where preserving the original structure of externally supplied data is more valuable than forcing it into a relational model. Email webhook payloads provide a good example; storing them as documents allows the platform to retain complete provider responses for troubleshooting, auditing, and future analysis without requiring frequent schema changes. Using both SQL Server and MongoDB illustrates that different persistence technologies are appropriate for different workloads."
  },
  {
    title: "Why RabbitMQ?",
    body:
      "RabbitMQ demonstrates asynchronous communication and loose coupling between services. Rather than performing every operation synchronously within an HTTP request, the platform can publish work for independent background processing, improving responsiveness and resilience. The project intentionally explores concepts such as durable messaging, retries, dead-letter queues, priority queues, topic routing, and competing consumers because these patterns are common in modern distributed systems."
  },
  {
    title: "Why Docker?",
    body:
      "Docker provides a consistent development environment and significantly reduces the effort required to bring new developers onto the project. Containers allow databases, messaging infrastructure, and supporting services to be provisioned predictably while keeping host system configuration to a minimum. Containerization also provides a natural path toward cloud deployment and automated CI/CD pipelines."
  },
  {
    title: "Why GitHub Actions?",
    body:
      "Continuous Integration and Continuous Deployment are treated as first-class engineering concerns rather than afterthoughts. GitHub Actions automates builds, validation, container publishing, infrastructure deployment, and production promotion, ensuring that deployments are repeatable and reducing manual operational effort. The objective is to demonstrate that modern software engineering includes delivery automation in addition to writing application code."
  },
  {
    title: "Why Azure?",
    body:
      "Azure was selected as the deployment platform because it provides a broad collection of managed services that integrate well with containerized applications and Infrastructure as Code. The project uses Azure not simply as a hosting provider, but as an opportunity to learn cloud networking, identity, deployment automation, secret management, monitoring, and production operations."
  },
  {
    title: "Why Infrastructure as Code?",
    body:
      "I am considering the idea that infrastructure should be versioned, reviewed, and deployed using the same engineering discipline as application code (which is admittedly, new to me). Using Bicep allows cloud resources to be recreated consistently across environments while reducing configuration drift and improving repeatability. Treating infrastructure as source code also supports automated deployments and simplifies disaster recovery."
  },
  {
    title: "Why PowerShell?",
    body:
      "PowerShell serves as the operational automation language for the platform. It provides a consistent command surface for developers working in Windows environments and simplifies repetitive operational tasks such as environment setup, database management, infrastructure control, backup procedures, and deployment support. The objective is to automate routine operations so that documented procedures become executable rather than manual."
  },
  {
    title: "Why AI-Assisted Development?",
    body:
      "CM Platform is intentionally developed using AI as an engineering partner rather than as a replacement for engineering judgment. AI has been invaluable for exploring unfamiliar technologies, generating implementation alternatives, accelerating routine coding tasks, reviewing architectural ideas, and improving documentation. However, architectural direction, technology selection, system integration, validation, and final engineering decisions remain deliberate human responsibilities. The project reflects my belief that effective software engineers will increasingly combine their experience with AI-assisted workflows to deliver higher-quality software more efficiently."
  }
];

export function ArchitecturalDecisions() {
  return (
    <section className="platform-overview">
      <section className="platform-section platform-section-block platform-page-heading">
        <div>
          <p className="platform-kicker">Platform architecture</p>
          <h1>Architectural Decisions</h1>
        </div>
      </section>

      {decisions.map((decision) => (
        <section className="platform-section platform-section-block" key={decision.title}>
          <div>
            <h2>{decision.title}</h2>
            <p>{decision.body}</p>
          </div>
        </section>
      ))}
      <BackToTop />
    </section>
  );
}
