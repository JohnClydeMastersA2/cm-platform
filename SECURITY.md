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
- Tighter application-level registration and login rate limits
- Administrative key protection for internal API routes
- Signature verification for production email webhooks
- Environment-based secret handling for local and deployed environments
- Automated builds, container validation, and CodeQL analysis in GitHub Actions
- Non-destructive public endpoint checks and a reproducible [OWASP ZAP baseline scan](security/zap.yaml)

Additional hardening remains part of the project roadmap. Current considerations include trusted proxy handling, route- and identity-specific rate limits, HSTS, selected scanner warning dispositions, production authentication-flow validation, expanded static analysis, and Azure security and auditing options. These are evaluated according to the scope, cost, and learning value of a public technical portfolio.

A public overview of the implemented controls, security testing, findings, and current hardening priorities is available on the [CM Platform Security Review](https://cmplatform.dev/security) page.

## Security Contact

If you notice a security issue, please contact the repository owner privately through the contact information on the [GitHub profile](https://github.com/JohnClydeMastersA2).
