# Security

## Project Context

CM Platform is a technical portfolio project that demonstrates practical software engineering across application development, CI/CD, and cloud deployment. It is not a commercial service or a formally supported software product.

Security is treated as part of the engineering work demonstrated by the project. The goal is to apply appropriate safeguards, validate the public boundary, and document areas for continued learning without presenting the project as a security-certified platform.

## Security Approach

The project currently demonstrates:

- HTTPS delivery through Cloudflare
- Restrictive browser security headers at the Nginx gateway
- Password hashing and hashed session and verification tokens
- Secure, HTTP-only, same-site cookies in production
- CSRF validation for state-changing browser requests
- An application-wide, in-memory API request ceiling that does not rely on forwarded client-address headers
- Tighter in-memory limits for authentication, signed webhooks, database-backed reads, and destructive demo operations
- Administrative key protection for internal API routes
- Signature verification for production email webhooks
- Environment-based secret handling for local and deployed environments
- Automated builds, container validation, and CodeQL analysis in GitHub Actions
- Production deployment gates for known dependency vulnerabilities
- Review and documented disposition of scanner findings that are already covered by runtime controls
- Non-destructive public endpoint checks and a reproducible [OWASP ZAP baseline scan](security/zap.yaml)

## Production Vulnerability Policy

CM Platform should not be promoted to production with known open dependency
vulnerabilities.

The GitHub Actions build runs `npm audit` after dependency
installation. The protected Container Apps deployment workflow also checks open
Dependabot alerts before Azure deployment begins and fails when any alert is
still open.

Dependabot remains useful as the discovery and remediation mechanism: it raises
alerts and update PRs. The deployment workflow is the enforcement mechanism that
prevents those alerts from being ignored during production release.

CodeQL does not currently recognize the Fastify rate-limiting patterns used around four authorization-related handlers. Those findings were reviewed and dismissed as false positives because the handlers remain protected by the application-wide request ceiling and explicit route-level limits. The disposition records a scanner-model limitation rather than adding code solely to satisfy static analysis.

Additional hardening remains part of the project roadmap. Current considerations include trusted proxy handling, identity-specific and distributed rate limits, HSTS, production authentication-flow validation, expanded static analysis, and Azure security and auditing options. These are evaluated according to the scope, cost, and learning value of a public technical portfolio.

A public overview of the implemented controls, security testing, findings, and current hardening priorities is available on the [CM Platform Security Review](https://cmplatform.dev/security) page.

## Security Contact

If you notice a security issue, please contact the repository owner privately through the contact information on the [GitHub profile](https://github.com/JohnClydeMastersA2).
