import type { FastifyReply } from "fastify";
import type { RateLimiterRes } from "rate-limiter-flexible";

export async function allowRateLimitedRequest(
  consumption: Promise<RateLimiterRes>,
  reply: FastifyReply,
): Promise<boolean> {
  try {
    await consumption;
    return true;
  } catch (error) {
    const retryAfterSeconds = getRetryAfterSeconds(error);

    reply
      .code(429)
      .header("retry-after", String(retryAfterSeconds))
      .send({ error: "Too many requests. Please wait before trying again." });

    return false;
  }
}

function getRetryAfterSeconds(error: unknown): number {
  if (
    error
    && typeof error === "object"
    && "msBeforeNext" in error
    && typeof error.msBeforeNext === "number"
  ) {
    return Math.max(1, Math.ceil(error.msBeforeNext / 1000));
  }

  return 1;
}
