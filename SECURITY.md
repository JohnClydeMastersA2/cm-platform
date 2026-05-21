# Security Policy

## Reporting A Vulnerability

If you find a security issue in CM Platform, please report it privately rather than opening a public issue.

Use GitHub private vulnerability reporting if it is available for this repository. If it is not available, contact the repository owner directly through the contact information on the GitHub profile.

Please include:

- A short description of the issue
- Steps to reproduce it
- The affected file, endpoint, dependency, or workflow
- Any relevant logs or screenshots with secrets removed

## Supported Version

This repository currently tracks active development on the `main` branch. Security fixes are applied directly to `main`.

## Current Security Practices

This project uses GitHub security features and local repository hygiene to reduce common public-repository risks:

- Dependency graph is enabled for dependency visibility.
- Dependabot alerts are enabled for known vulnerable dependencies.
- Dependabot security updates are enabled.
- Secret scanning and push protection are enabled.
- Local `.env` files are ignored by Git.
- Real email test recipients are stored in `tools/email-send-test/.env`, which is ignored by Git.
- A committed `tools/email-send-test/.env.example` documents the required local setting without exposing real addresses.
- Repository history was cleaned after moving local email test recipients out of tracked source code.

## Recent Security Maintenance

- Fixed Dependabot alerts for transitive `fast-uri` and `uuid` vulnerabilities.
- Updated the lockfile so `fast-uri` resolves to `3.1.2`.
- Updated the lockfile so `@azure/msal-node` resolves to `5.2.2`, removing the vulnerable transitive `uuid` dependency path.
- Verified the dependency tree with `npm audit`.
- Verified the project still builds with `npm run build`.

## Secret Handling

Do not commit secrets, API keys, SMTP credentials, local database passwords, tokens, personal email recipient lists, or generated log files.

Local secret and environment files should stay in ignored `.env` files. Example files may be committed only when they contain placeholders.
