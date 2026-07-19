import { AuthLoginSchema, AuthRegisterSchema, AuthVerifyEmailSchema } from "@cm/contracts";
import { emailMessageTypes, type EmailVerificationRequestedMessage } from "@cm/messaging/email";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import {
  createEmailVerificationChallenge,
  deleteDemoAccount,
  getAccountBySessionToken,
  getSessionByToken,
  loginAccount,
  registerAccount,
  revokeSessionToken,
  SESSION_COOKIE_NAME,
  verifyEmailChallenge,
} from "./auth.repo.js";
import type { AuthAccount } from "./auth.schema.js";

const secureCookieAttribute = process.env.NODE_ENV === "production" ? "; Secure" : "";
const sessionCookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureCookieAttribute}`;
const expiredSessionCookie = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureCookieAttribute}`;
const emailVerificationExpirationText = "5 minutes";
const registerRateLimiter = createRateLimiter({
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000,
});
const loginRateLimiter = createRateLimiter({
  maxAttempts: 10,
  windowMs: 15 * 60 * 1000,
});

type AuthRoutesOptions = {
  authApiBaseUrl: string;
  publicWebBaseUrl: string;
};

type AuthenticatedSession = {
  account: AuthAccount;
  sessionToken: string;
};

export async function authRoutes(app: FastifyInstance, opts: AuthRoutesOptions): Promise<void> {
  const authApiBaseUrl = trimTrailingSlash(opts.authApiBaseUrl);
  const publicWebBaseUrl = trimTrailingSlash(opts.publicWebBaseUrl);

  app.post("/register", async (request, reply) => {
    if (!allowAuthAttempt(registerRateLimiter, buildIpRateLimitKey("register", request), request, reply, "registration")) {
      return;
    }

    const parsed = AuthRegisterSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid registration",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const account = await registerAccount(app.db, parsed.data);
      const verificationToken = await createEmailVerificationChallenge(app.db, account.accountId);
      await queueVerificationEmail(app, account, verificationToken, authApiBaseUrl);

      reply.code(201).send({ account });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (message.includes("UX_Account_EmailAddress")) {
        reply.code(409).send({ error: "Account already exists" });
        return;
      }

      throw err;
    }
  });

  app.get("/verify-email", async (request, reply) => {
    const parsed = AuthVerifyEmailSchema.safeParse(request.query);

    if (!parsed.success) {
      reply.redirect(`${publicWebBaseUrl}/login?verified=0`);
      return;
    }

    const account = await verifyEmailChallenge(app.db, parsed.data.token);

    if (!account) {
      reply.redirect(`${publicWebBaseUrl}/login?verified=0`);
      return;
    }

    reply.redirect(`${publicWebBaseUrl}/login?verified=1`);
  });

  app.post("/login", async (request, reply) => {
    const parsed = AuthLoginSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid login",
        details: parsed.error.flatten(),
      });
      return;
    }

    const loginKey = buildEmailRateLimitKey("login", request, parsed.data.emailAddress);

    if (!allowAuthAttempt(loginRateLimiter, loginKey, request, reply, "login")) {
      return;
    }

    const result = await loginAccount(app.db, parsed.data);

    if (!result) {
      reply.code(401).send({ error: "Invalid email or password" });
      return;
    }

    setSessionCookie(reply, result.sessionToken);
    return { account: result.account };
  });

  app.get("/me", async (request, reply) => {
    const session = await requireSession(app, request, reply);

    if (!session) {
      return;
    }

    return {
      account: session.account,
      session: await getSessionByToken(app.db, session.sessionToken),
    };
  });

  app.post("/logout", async (request, reply) => {
    const sessionToken = readCookie(request, SESSION_COOKIE_NAME);

    if (sessionToken) {
      await revokeSessionToken(app.db, sessionToken);
    }

    clearSessionCookie(reply);
    return { ok: true };
  });

  app.delete("/me", async (request, reply) => {
    const session = await requireSession(app, request, reply);

    if (!session) {
      return;
    }

    await deleteDemoAccount(app.db, session.account.accountId);
    clearSessionCookie(reply);
    return { ok: true };
  });
}

type RateLimiterOptions = {
  maxAttempts: number;
  windowMs: number;
};

type RateLimiterDecision = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimiter = {
  check: (key: string) => RateLimiterDecision;
  maxAttempts: number;
  windowMs: number;
};

function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const attempts = new Map<string, RateLimitEntry>();

  return {
    maxAttempts: opts.maxAttempts,
    windowMs: opts.windowMs,
    check(key: string): RateLimiterDecision {
      const now = Date.now();

      for (const [entryKey, entry] of attempts) {
        if (entry.resetAt <= now) {
          attempts.delete(entryKey);
        }
      }

      const current = attempts.get(key);

      if (!current || current.resetAt <= now) {
        attempts.set(key, {
          count: 1,
          resetAt: now + opts.windowMs,
        });

        return {
          allowed: true,
          retryAfterSeconds: 0,
        };
      }

      if (current.count >= opts.maxAttempts) {
        return {
          allowed: false,
          retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)),
        };
      }

      current.count += 1;

      return {
        allowed: true,
        retryAfterSeconds: 0,
      };
    },
  };
}

function allowAuthAttempt(
  limiter: RateLimiter,
  key: string,
  request: FastifyRequest,
  reply: FastifyReply,
  operation: "login" | "registration",
): boolean {
  const decision = limiter.check(key);

  if (decision.allowed) {
    return true;
  }

  request.log.warn(
    {
      operation,
      retryAfterSeconds: decision.retryAfterSeconds,
      maxAttempts: limiter.maxAttempts,
      windowSeconds: Math.ceil(limiter.windowMs / 1000),
    },
    "Auth rate limit exceeded",
  );

  reply
    .code(429)
    .header("retry-after", String(decision.retryAfterSeconds))
    .send({ error: "Too many attempts. Please wait before trying again." });

  return false;
}

function buildIpRateLimitKey(operation: string, request: FastifyRequest): string {
  return `${operation}:ip:${getClientAddress(request)}`;
}

function buildEmailRateLimitKey(operation: string, request: FastifyRequest, emailAddress: string): string {
  return `${operation}:ip-email:${getClientAddress(request)}:${emailAddress.trim().toLowerCase()}`;
}

function getClientAddress(request: FastifyRequest): string {
  const cloudflareIp = getHeaderValue(request, "cf-connecting-ip");

  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwardedFor = getHeaderValue(request, "x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || request.ip;
  }

  return request.ip;
}

function getHeaderValue(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

async function requireSession(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthenticatedSession | null> {
  const sessionToken = readCookie(request, SESSION_COOKIE_NAME);

  if (!sessionToken) {
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }

  const account = await getAccountBySessionToken(app.db, sessionToken);

  if (!account) {
    clearSessionCookie(reply);
    reply.code(401).send({ error: "Unauthorized" });
    return null;
  }

  return { account, sessionToken };
}

async function queueVerificationEmail(
  app: FastifyInstance,
  account: AuthAccount,
  verificationToken: string,
  authApiBaseUrl: string,
): Promise<void> {
  const verificationUrl = `${authApiBaseUrl}/auth/verify-email?token=${encodeURIComponent(verificationToken)}`;

  const message: EmailVerificationRequestedMessage = {
    messageType: emailMessageTypes.emailVerificationRequested,
    messageId: randomUUID(),
    requestedAt: new Date().toISOString(),
    source: "svc-core.auth",
    email: {
      to: account.emailAddress,
      subject: "Verify your CM Platform account",
      html: [
        "<p>Welcome to CM Platform.</p>",
        "<p>Please verify your email address to finish setting up your account.</p>",
        `<p><a href="${verificationUrl}">Verify email address</a></p>`,
        `<p>This verification link expires in ${emailVerificationExpirationText}.</p>`,
      ].join("\n"),
      text: [
        "Welcome to CM Platform.",
        "",
        "Please verify your email address to finish setting up your account.",
        "",
        `Verify email address: ${verificationUrl}`,
        "",
        `This verification link expires in ${emailVerificationExpirationText}.`,
      ].join("\n"),
    },
  };

  await app.messaging.publishEmailVerificationRequested(message);
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function setSessionCookie(reply: FastifyReply, sessionToken: string): void {
  reply.header("set-cookie", `${SESSION_COOKIE_NAME}=${sessionToken}; ${sessionCookieOptions}`);
}

function clearSessionCookie(reply: FastifyReply): void {
  reply.header("set-cookie", `${SESSION_COOKIE_NAME}=; ${expiredSessionCookie}`);
}

function readCookie(request: FastifyRequest, name: string): string | undefined {
  const cookieHeader = request.headers.cookie;

  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(";")) {
    const [rawName, ...rawValueParts] = cookie.trim().split("=");

    if (rawName === name) {
      const value = rawValueParts.join("=");
      return value ? decodeURIComponent(value) : undefined;
    }
  }

  return undefined;
}
