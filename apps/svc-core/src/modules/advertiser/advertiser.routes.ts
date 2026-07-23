import type { FastifyInstance } from "fastify";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { allowRateLimitedRequest } from "../../lib/route_rate_limit.js";
import {
  getAdvertiserById,
  listAdvertisers,
} from "./advertiser.repo.js";
import { AdvertiserParamsSchema } from "./advertiser.schema.js";

const listAdvertisersRateLimiter = new RateLimiterMemory({
  points: 120,
  duration: 60,
});

export async function advertiserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    if (!await allowRateLimitedRequest(listAdvertisersRateLimiter.consume(request.ip), reply)) {
      return;
    }

    return listAdvertisers(app.db);
  });

  app.get("/:advertiserId", async (request, reply) => {
    const parsed = AdvertiserParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid advertiserId",
        details: parsed.error.flatten(),
      });
      return;
    }

    const advertiser = await getAdvertiserById(app.db, parsed.data.advertiserId);

    if (!advertiser) {
      reply.code(404).send({ error: "Advertiser not found" });
      return;
    }

    return advertiser;
  });
}
