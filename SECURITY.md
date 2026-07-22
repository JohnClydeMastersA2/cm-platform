# Security Policy

## Reporting a Vulnerability

Report suspected vulnerabilities privately through [GitHub private vulnerability reporting](https://github.com/JohnClydeMastersA2/cm-platform/security/advisories/new).

Do not open a public issue, discussion, or pull request for an undisclosed vulnerability. Do not include secrets, personal data, or sensitive exploit details in public channels.

Include as much of the following as is safely available:

- A concise description of the issue and its potential impact
- The affected component, endpoint, dependency, workflow, or configuration
- Reproduction steps or a minimal proof of concept
- Relevant versions, commit identifiers, and environment details
- Suggested remediation, if known
- Sanitized logs or screenshots with credentials and personal data removed

If private vulnerability reporting is unavailable, contact the repository owner privately through the contact information on the [GitHub profile](https://github.com/JohnClydeMastersA2). Do not fall back to a public report.

## What to Expect

The maintainer will make a reasonable effort to acknowledge a complete report, investigate its impact, and provide status updates while remediation is in progress. Response and remediation time depend on severity, reproducibility, and maintainer availability; this project does not currently guarantee a service-level response time.

Please allow time for investigation and coordinate public disclosure with the maintainer. This project does not currently operate a paid bug-bounty program.

## Supported Versions

CM Platform is under active development and does not currently maintain versioned release branches.

| Version | Supported |
| --- | --- |
| Current `main` branch | Yes |
| Older commits, forks, and unofficial deployments | No |

Security fixes are applied to `main`. Operators are responsible for tracking a known revision and updating their deployments when fixes become available.

## Report Scope

Useful reports include vulnerabilities affecting:

- Authentication, authorization, sessions, cookies, or CSRF protection
- Internal API administration and access control
- Webhook signature verification or replay handling
- SQL Server, MongoDB, or RabbitMQ data and access boundaries
- Secret loading, logging, GitHub Actions, containers, or Azure infrastructure
- Email delivery and account-verification workflows
- Dependency vulnerabilities with a demonstrated impact on this project
- Exposure of personal, credential, or operational data

Avoid disruptive testing against live systems. Do not use denial-of-service techniques, social engineering, automated credential attacks, persistence, data destruction, or access to data beyond what is necessary to demonstrate the issue. Use local environments and test data whenever possible.

## Security Controls

The repository includes controls such as:

- GitHub Actions builds for Node.js and Java components
- CodeQL analysis for JavaScript and TypeScript on pushes, pull requests, and a weekly schedule
- Ignored local environment and secret files with committed placeholder examples
- Password hashing and hashed session and challenge tokens
- HTTP-only, same-site session cookies, with secure cookies in production
- CSRF validation for state-changing browser requests
- Application-level registration and login rate limits
- Administrative API key protection for internal routes
- Signed Resend webhook verification, required in production

These are defense-in-depth measures, not a claim that the project is free of vulnerabilities. CodeQL does not currently analyze the Java service, and in-memory application rate limits are not a substitute for production edge or distributed controls.

Repository-host security settings—such as dependency alerts, automated security updates, secret scanning, and push protection—may be enabled independently of versioned source files. Their current GitHub configuration should be verified before relying on them as controls.

## Secret and Data Handling

Never commit or publish:

- API keys, passwords, database connection credentials, SMTP credentials, or webhook secrets
- Session, verification, administration, or cloud-access tokens
- Real recipient lists, customer data, personal data, or production payloads
- Sensitive logs, screenshots, database backups, generated environment files, or private certificates

Use ignored local `.env` files for development secrets and placeholders in committed examples. Store deployment secrets in the approved GitHub or Azure secret mechanism rather than source code or workflow output.

If a secret is exposed, treat it as compromised: revoke or rotate it promptly, remove it from active systems, assess logs and downstream access, and then clean repository history if necessary. Removing a secret from the latest commit alone does not invalidate or erase it.

Use synthetic data for local development and demonstrations. Sanitize diagnostic material before attaching it to any report.
