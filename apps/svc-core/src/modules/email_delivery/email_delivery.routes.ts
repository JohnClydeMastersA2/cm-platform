import type { FastifyInstance } from "fastify";
import {
  listEmailDeliveries,
  listEmailDeliveryEvents,
} from "./email_delivery.repo.js";
import { EmailDeliveryParamsSchema } from "./email_delivery.schema.js";

export async function emailDeliveryRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async () => {
    return listEmailDeliveries(app.db);
  });

  app.get("/:emailDeliveryId/events", async (request, reply) => {
    const parsed = EmailDeliveryParamsSchema.safeParse(request.params);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid emailDeliveryId",
        details: parsed.error.flatten(),
      });
      return;
    }

    return listEmailDeliveryEvents(app.db, parsed.data.emailDeliveryId);
  });
}
