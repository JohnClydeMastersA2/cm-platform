const workflowSteps = [
  {
    title: "Create account",
    body: "The user submits an email address and password through the public registration form."
  },
  {
    title: "Queue verification email",
    body:
      "The API creates the account, issues a short-lived verification token, and queues an email request for asynchronous delivery."
  },
  {
    title: "Verify email",
    body: "The verification link calls the API, marks the address as verified, and returns the user to the login flow."
  },
  {
    title: "Start session",
    body:
      "A successful login establishes an HTTP-only session cookie that the browser can use without exposing credentials to client code. This is visible on the My Account/ Session State page."
  },
  {
    title: "Inspect or reset",
    body:
      "The account page shows current account and session state, and includes account deletion so the creation workflow can be repeated easily during demos."
  }
];

const futureItems = ["Password recovery", "Authenticator app support", "OAuth login", "Role-based access control"];

export function Iam() {
  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">Identity and access</p>
          <h1>Account Creation Workflow</h1>
          <p className="platform-lede">
            CM Platform includes a simple account workflow with email/password registration, basic
            password validation, email confirmation, login, session inspection, logout, and account
            deletion for repeatable demos.
          </p>
        </div>
        <div className="platform-stack" aria-label="Identity workflow summary">
          <StackRow label="Public API" value="Register, verify email, login, session lookup, logout, delete account" />
          <StackRow label="Email" value="Verification is queued through RabbitMQ and sent by a background dispatcher" />
          <StackRow label="Session" value="Login creates an HTTP-only browser session cookie" />
        </div>
      </div>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Current Workflow</h2>
          <p>
            The goal is not to present a complete identity product. It is to show a working
            authentication slice that connects browser forms, API validation, SQL-backed account state,
            asynchronous email delivery, and HTTP-only browser sessions.
          </p>
        </div>
        <div className="iam-workflow">
          {workflowSteps.map((step, index) => (
            <article className="iam-workflow-card" key={step.title}>
              <div className="iam-workflow-step">{index + 1}</div>
              <div>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <div>
          <h2>User Interface Design</h2>
          <p>
            The UI keeps the account lifecycle intentionally plain: Create Account, Login, and My
            Account. The My Account page shows the active session and verification state, with logout
            and delete-account actions so the demo can be replayed cleanly.
          </p>
        </div>
        <div className="platform-callout">
          <span>Demo design</span>
          <strong>Account deletion makes the lifecycle easy to replay without manual SQL cleanup.</strong>
        </div>
      </section>

      <section className="future-panel">
        <div>
          <p className="platform-kicker">Futures</p>
          <h2>Planned IAM Capabilities</h2>
          <p>
            Future work will extend the same API-first model into recovery, stronger authentication,
            external identity providers, and authorization policy.
          </p>
        </div>
        <div className="future-list">
          {futureItems.map((item) => (
            <span key={item}>{item}</span>
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
