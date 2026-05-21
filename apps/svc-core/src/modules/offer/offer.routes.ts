import type { FastifyInstance } from "fastify";
import {
  getOfferById,
  listOffers,
} from "./offer.repo.js";
import { OfferParamsSchema } from "./offer.schema.js";

export async function offerRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return listOffers(app.db);
  });

  app.get("/:offerId", async (request, reply) => {
    const parsed = OfferParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid offerId",
        details: parsed.error.flatten(),
      });
      return;
    }

    const offer = await getOfferById(app.db, parsed.data.offerId);

    if (!offer) {
      reply.code(404).send({ error: "Offer not found" });
      return;
    }

    return offer;
  });
}
