import type { FastifyInstance } from "fastify";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { allowRateLimitedRequest } from "../../lib/route_rate_limit.js";
import {
  createPublisherRegistration,
  getPublisherById,
  listPublishers,
  loginPublisher,
  setPublisherPassword,
} from "./publisher.repo.js";
import {
  PublisherLoginSchema,
  PublisherParamsSchema,
  PublisherPasswordSetupSchema,
  PublisherRegistrationSchema,
} from "./publisher.schema.js";

const listPublishersRateLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
});
const publisherLoginRateLimiter = new RateLimiterMemory({
  points: 10,
  duration: 15 * 60,
});

export async function publisherRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    if (!await allowRateLimitedRequest(listPublishersRateLimiter.consume(request.ip), reply)) {
      return;
    }

    return listPublishers(app.db);
  });

  app.post("/", async (request, reply) => {
    const parsed = PublisherRegistrationSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid publisher registration",
        details: parsed.error.flatten(),
      });
      return;
    }

    try {
      const publisher = await createPublisherRegistration(app.db, parsed.data);
      reply.code(201).send(publisher);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";

      if (message.includes("UX_Publisher_Name")) {
        reply.code(409).send({ error: "Publisher name already exists" });
        return;
      }

      throw err;
    }
  });

  app.post("/password", async (request, reply) => {
    const parsed = PublisherPasswordSetupSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid password setup",
        details: parsed.error.flatten(),
      });
      return;
    }

    const publisher = await setPublisherPassword(app.db, parsed.data);

    if (!publisher) {
      reply.code(404).send({ error: "Approved active publisher account not found" });
      return;
    }

    return publisher;
  });

  app.post("/password-reset", async (request, reply) => {
    const parsed = PublisherPasswordSetupSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid password reset",
        details: parsed.error.flatten(),
      });
      return;
    }

    const publisher = await setPublisherPassword(app.db, parsed.data);

    if (!publisher) {
      reply.code(404).send({ error: "Approved active publisher account not found" });
      return;
    }

    return publisher;
  });

  app.post("/login", async (request, reply) => {
    if (!await allowRateLimitedRequest(publisherLoginRateLimiter.consume(request.ip), reply)) {
      return;
    }

    const parsed = PublisherLoginSchema.safeParse(request.body);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid login",
        details: parsed.error.flatten(),
      });
      return;
    }

    const publisher = await loginPublisher(app.db, parsed.data);

    if (!publisher) {
      reply.code(401).send({ error: "Invalid email or password" });
      return;
    }

    return publisher;
  });

  app.get("/:publisherId", async (request, reply) => {
    const parsed = PublisherParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid publisherId",
        details: parsed.error.flatten(),
      });
      return;
    }

    const publisher = await getPublisherById(app.db, parsed.data.publisherId);

    if (!publisher) {
      reply.code(404).send({ error: "Publisher not found" });
      return;
    }

    return publisher;
  });
}
