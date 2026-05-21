# IAM Strategy

This document captures the working identity and access management direction for CM Platform.

## Goals

CM Platform should demonstrate practical IAM fundamentals without trying to become a full identity provider.

The first consumer is `apps/publisher-web`, but reusable server-side pieces should live in shared packages or `svc-core` modules when they can support other platform surfaces later.

## Account Model

The lowest common denominator account identity is:

```text
email address + password
```

The first implementation uses platform-owned accounts and HTTP-only session cookies:

```text
register -> email verification link -> login -> session cookie -> authenticated /auth/me -> logout
```

For development convenience, users can delete their own account and repeat the flow:

```text
My Account -> Delete Account
```

This is a reset capability for exercising the account lifecycle, not the final production account deletion policy.

## Email Verification

Account registration creates a five-minute `email_verification` challenge in `dbo.AuthChallenge`.

The raw verification token is sent by email through `@cm/email`. The database stores only a SHA-256 hash of the token. When the user clicks the verification link, `svc-core` validates the token, marks the challenge used, sets `Account.EmailVerifiedAt`, and redirects back to the publisher web login page.

Verification links use two `svc-core` environment variables so local development and production can use different public URLs:

```text
AUTH_API_BASE_URL=http://localhost:3000
PUBLISHER_WEB_BASE_URL=http://localhost:5173
```

With the local defaults, the verification email link targets:

```text
http://localhost:3000/auth/verify-email?token=<token>
```

The API redirects back to:

```text
http://localhost:5173/#login-email-verified
```

## Planned Layers

Build in this order:

```text
1. Email/password account creation and login
2. Email verification code/link
3. Password recovery by email
4. Email-based MFA challenge
5. Authenticator app / TOTP
6. GitHub OAuth login
7. RBAC roles and permissions
```

## Package Boundaries

```text
apps/publisher-web   auth UI and publisher-facing flows
apps/svc-core        auth API, sessions, account persistence
packages/contracts   shared request/response schemas
packages/email       verification/recovery email delivery
packages/secrets     OAuth/client secrets later
packages/auth        reusable password/session helpers
```

## Session Direction

For browser login, prefer HTTP-only cookies over browser-stored bearer tokens.

The server stores only a hash of the random session token. The browser receives the raw token in a cookie. Logout and account deletion revoke server-side sessions.

## RBAC Direction

RBAC should be layered on top of accounts, not mixed into login mechanics.

Future tables:

```text
Role
Permission
AccountRole
RolePermission
```

Initial likely roles:

```text
publisher_user
publisher_admin
platform_admin
```
