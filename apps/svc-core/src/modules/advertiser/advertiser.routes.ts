import type { FastifyInstance } from "fastify";
import {
  getAdvertiserById,
  listAdvertisers,
} from "./advertiser.repo.js";
import { AdvertiserParamsSchema } from "./advertiser.schema.js";

export async function advertiserRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
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
