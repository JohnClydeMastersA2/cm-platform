# Publisher Login Strategy

This document captures the current simple publisher account strategy and the intended direction.

## Current Strategy

Publisher registration creates an account request, not an immediately usable login.

The current lifecycle is:

```text
register -> pending/no password
approve -> approved/active
set password -> password hash stored
login -> email/password accepted
forgot password -> reset password directly for approved active account
```

Registration stores publisher profile and contact fields in `dbo.Publisher`:

```text
PublisherName
ContactName
ContactEmail
WebsiteUrl
RegistrationNotes
RegistrationStatus
```

New registrations are saved with:

```text
RegistrationStatus = pending
IsActive = 0
PasswordHash = null
```

An approved account must have both:

```text
RegistrationStatus = approved
IsActive = 1
```

Only approved active accounts can set a password or log in.

## Password Storage

Passwords are never stored as plaintext.

The API hashes passwords with Node `scrypt` and stores the result in:

```text
PasswordHash
PasswordSetAt
LastLoginAt
```

`PasswordHash` is intentionally not returned to the browser. API responses expose only derived account state such as `hasPassword`, `passwordSetAt`, and `lastLoginAt`.

## Current Endpoints

For the current local development phase, these endpoints live under the internal API and use `x-admin-key` like the other internal routes:

```text
POST /internal/publishers
POST /internal/publishers/password
POST /internal/publishers/password-reset
POST /internal/publishers/login
```

This is intentionally simple for local development. It is not the final production security shape.

The current forgot-password path is a local-development shortcut. The publisher enters an email address and a new password, and the API updates the password hash only if the account is approved and active. It does not send email and does not use a reset token yet.

## Future Direction

Later, approval should become an admin workflow:

```text
review pending publisher
approve or reject
send approval notification
publisher follows password setup link
publisher logs in
```

The production-oriented version should add:

```text
password setup tokens
token expiration and one-time use
email delivery
public publisher auth endpoints
server-issued sessions or tokens
logout/session invalidation
password reset
```

At that point, password setup should move away from the internal admin-key surface and into a publisher-facing auth surface.
