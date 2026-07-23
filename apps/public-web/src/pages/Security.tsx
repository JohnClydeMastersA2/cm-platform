import { BackToTop } from "../components/BackToTop";

type CompletedCheck = {
  title: string;
  body: string;
  proof: string;
};

type FollowUpCheck = {
  title: string;
  body: string;
};

const completedChecks: CompletedCheck[] = [
  {
    title: "Public access",
    body: "The main site is reachable without Cloudflare Access login after removing the private preview Access application.",
    proof: "https://cmplatform.dev returned 200 OK through Cloudflare"
  },
  {
    title: "HTTPS and redirect",
    body:
      "The public HTTP endpoint redirects to HTTPS, and the HTTPS endpoint presents the live site through Cloudflare with a 200 OK response.",
    proof: "http://cmplatform.dev returned 301 to https://cmplatform.dev/; https://cmplatform.dev returned 200 OK"
  },
  {
    title: "HSTS disposition",
    body:
      "Strict-Transport-Security is not currently returned. That is acceptable for launch and should be considered after the public custom domain has remained stable.",
    proof: "No Strict-Transport-Security header observed on https://cmplatform.dev"
  },
  {
    title: "Health endpoint",
    body: "The production health endpoint responds with a minimal JSON status payload without exposing internal configuration.",
    proof: "GET /health returned { ok: true }"
  },
  {
    title: "Security headers",
    body: "The gateway returns the same protective header set on the public HTML page and representative JSON API routes.",
    proof: "CSP, X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy"
  },
  {
    title: "Header disposition",
    body:
      "Cross-origin isolation headers such as COOP and COEP are not currently required because the site does not use browser features that need cross-origin isolation. HSTS is tracked separately as a later hardening option.",
    proof: "No COOP/COEP dependency identified for current public portfolio behavior"
  },
  {
    title: "Public API behavior",
    body:
      "Read-only demo endpoints can be queried publicly, while state-changing requests use CSRF protection and application-level validation.",
    proof: "GET /topic-routing returned sample keys and queue metadata"
  },
  {
    title: "Application request ceiling",
    body:
      "Fastify applies an in-memory request ceiling across API routes without relying on unverified forwarded client-address headers. Health and readiness probes remain exempt.",
    proof: "300 API requests per minute per svc-core instance; excess requests receive HTTP 429"
  },
  {
    title: "Mutation boundary",
    body: "Representative state-changing demo routes reject requests that do not include the expected same-origin CSRF token.",
    proof: "DELETE /topic-routing and DELETE /widgets returned 403 Invalid CSRF token"
  },
  {
    title: "Auth input validation",
    body: "Authentication endpoints reject malformed or incomplete JSON bodies without creating accounts or sessions.",
    proof: "POST /auth/register and POST /auth/login with empty bodies returned 400 validation responses"
  },
  {
    title: "CSRF token cookie",
    body:
      "The CSRF bootstrap endpoint issues a token and sets a secure, HttpOnly, SameSite=Lax cookie for browser-mediated state changes.",
    proof: "GET /auth/csrf returned a csrfToken and Set-Cookie: cm_csrf; Secure; HttpOnly; SameSite=Lax"
  },
  {
    title: "Webhook boundary",
    body:
      "The Resend email webhook endpoint is not a browser page. Unsigned public POST attempts are rejected, while signed production email events have been accepted and recorded.",
    proof:
      "GET /webhooks/email-events returned 404; unsigned POST returned 400 Invalid webhook signature; production email test confirmed webhook processing"
  },
  {
    title: "OWASP ZAP baseline",
    body:
      "A non-destructive OWASP ZAP baseline scan was rerun against production after the React frontend cutover to exercise passive checks without attacking application state.",
    proof: "Post-cutover ZAP baseline reported FAIL-NEW 0, WARN-NEW 7, PASS 54; report retained locally under security-reports/"
  },
  {
    title: "Azure Advisor security review",
    body:
      "Azure Advisor was queried for subscription and resource-level security recommendations. Findings were grouped into governance items, paid Defender evaluations, and Azure SQL hardening choices.",
    proof:
      "az advisor recommendation list returned 15 security recommendations across subscription governance, Defender plans, and Azure SQL configuration"
  }
];

const followUpChecks: FollowUpCheck[] = [
  {
    title: "Review ZAP warning dispositions",
    body:
      "Decide which ZAP warnings should become immediate changes and which should remain documented hardening follow-ups: cache headers, static-file nosniff behavior, CSP style policy, COOP/COEP, and HSTS."
  },
  {
    title: "Certificate and HSTS review",
    body:
      "Confirm the certificate chain and expiration date through browser tools or an external TLS report, then decide when to enable HSTS after the custom domain has remained stable."
  },
  {
    title: "Authentication flow and rate-limit smoke test",
    body:
      "Create and verify a test account, delete it through My Account, and perform a careful low-volume rate-limit check without locking out normal use or sending excessive email."
  },
  {
    title: "Refine route-specific rate limits",
    body:
      "Add tighter resource- and identity-based limits for sensitive routes, and introduce per-client limits only after the production proxy boundary can provide a trusted client address."
  },
  {
    title: "Azure posture follow-up",
    body:
      "Address low-cost Advisor items first: security contact email, high-severity alert notifications, and SQL auditing. Review SQL private endpoint and paid Defender recommendations separately because they can affect connectivity or cost."
  }
];

export function Security() {
  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">Launch readiness</p>
          <h1>Security Launch Review</h1>
          <p className="platform-lede">
            This page records lightweight public-launch security validation for cm-platform. It is not a
            formal penetration test; it is a practical review of exposure, browser protections, public
            health checks, and the next safe scanning steps for a technical portfolio site.
          </p>
        </div>
        <div className="platform-stack" aria-label="Security launch review summary">
          <StackRow label="Scope" value="Public site, public API reads, browser headers, Cloudflare edge behavior" />
          <StackRow label="Approach" value="Passive checks, public smoke tests, and non-destructive automated baseline scan" />
          <StackRow label="Limit" value="This is launch validation, not a third-party penetration test" />
        </div>
      </div>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Completed Public Checks</h2>
          <p>
            These checks were performed from outside the Azure origin path after the site was made public
            through Cloudflare. They are intentionally low-risk and repeatable.
          </p>
        </div>
        <div className="platform-card-grid">
          {completedChecks.map((check) => (
            <article className="platform-card" key={check.title}>
              <h3>{check.title}</h3>
              <p>{check.body}</p>
              <div className="platform-proof">{check.proof}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="platform-section">
        <div>
          <h2>Current Disposition</h2>
          <p>
            The site is public, HTTPS-only from the visitor perspective, fronted by Cloudflare, and
            returning a restrictive browser security header set. A non-destructive baseline scanner has
            been rerun after the React production cutover; the remaining work is to disposition warnings
            and decide which hardening items belong before the next production release.
          </p>
          <p>
            One optional hardening item is HSTS. That should be enabled only after DNS, HTTPS, and
            custom-domain behavior have remained stable, because HSTS tells browsers to insist on HTTPS
            for future visits.
          </p>
          <p>
            The ZAP baseline produced warning categories rather than failures. Current review items
            include cache-control tuning, HSTS, X-Content-Type-Options on static text files, CSP
            style-src usage, and cross-origin isolation headers. Several are expected for this portfolio
            launch and should be handled as conscious hardening choices rather than emergency defects.
          </p>
          <p>
            Azure Advisor added an internal cloud posture view. Its most actionable findings are not all
            equal: contact and alert settings are low-cost governance improvements, SQL auditing is a
            practical hardening candidate, and recommendations such as paid Defender plans or private SQL
            networking need a cost and connectivity review before implementation.
          </p>
        </div>
        <div className="platform-callout">
          <span>Portfolio framing</span>
          <strong>
            Security review is being treated as operational launch hygiene: verify the public boundary,
            record evidence, fix obvious issues, and avoid destructive testing against production.
          </strong>
        </div>
      </section>

      <section className="platform-section platform-section-block">
        <div>
          <h2>Next Safe Checks</h2>
          <p>These follow-up checks add learning value without crossing into aggressive production testing.</p>
        </div>
        <div className="platform-card-grid">
          {followUpChecks.map((check) => (
            <article className="platform-card" key={check.title}>
              <h3>{check.title}</h3>
              <p>{check.body}</p>
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
