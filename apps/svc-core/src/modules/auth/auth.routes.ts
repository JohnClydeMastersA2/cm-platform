import { AuthLoginSchema, AuthRegisterSchema, AuthVerifyEmailSchema } from "@cm/contracts";
import { emailMessageTypes, type EmailVerificationRequestedMessage } from "@cm/messaging/email";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { allowRateLimitedRequest } from "../../lib/route_rate_limit.js";
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
const registerRateLimiter = new RateLimiterMemory({
  points: 5,
  duration: 15 * 60,
});
const verifyEmailRateLimiter = new RateLimiterMemory({
  points: 30,
  duration: 15 * 60,
});
const loginRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 15 * 60,
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
    if (!await allowRateLimitedRequest(registerRateLimiter.consume(request.ip), reply)) {
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
    if (!await allowRateLimitedRequest(verifyEmailRateLimiter.consume(request.ip), reply)) {
      return;
    }

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

    if (!await allowRateLimitedRequest(loginRateLimiter.consume(request.ip), reply)) {
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
