import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { randomBytes, timingSafeEqual } from "node:crypto";

const csrfCookieName = "cm_csrf";
const csrfHeaderName = "x-csrf-token";
const secureCookieAttribute = process.env.NODE_ENV === "production" ? "; Secure" : "";
const csrfCookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureCookieAttribute}`;

const exemptRoutes = new Set([
  "POST /auth/register",
  "POST /auth/login",
  "POST /webhooks/email-events",
]);

export const csrfPlugin = fp(async (app) => {
  app.get("/auth/csrf", async (_request, reply) => {
    const token = createCsrfToken();
    setCsrfCookie(reply, token);
    return { csrfToken: token };
  });

  app.addHook("preHandler", async (request, reply) => {
    if (!requiresCsrf(request)) {
      return;
    }

    const cookieToken = readCookie(request, csrfCookieName);
    const headerToken = readHeader(request, csrfHeaderName);

    if (cookieToken && headerToken && secureEquals(cookieToken, headerToken)) {
      return;
    }

    request.log.warn(
      {
        method: request.method,
        url: request.url,
      },
      "Rejected state-changing request without a valid CSRF token",
    );

    reply.code(403).send({ error: "Invalid CSRF token" });
  });
});

function requiresCsrf(request: FastifyRequest): boolean {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
    return false;
  }

  if (request.url.startsWith("/internal/")) {
    return false;
  }

  return !exemptRoutes.has(`${request.method} ${request.routeOptions.url}`);
}

function createCsrfToken(): string {
  return randomBytes(32).toString("base64url");
}

function setCsrfCookie(reply: FastifyReply, token: string): void {
  reply.header("set-cookie", `${csrfCookieName}=${encodeURIComponent(token)}; ${csrfCookieOptions}`);
}

function secureEquals(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function readHeader(request: FastifyRequest, name: string): string | undefined {
  const value = request.headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
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
