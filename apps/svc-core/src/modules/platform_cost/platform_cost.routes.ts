import type { FastifyInstance } from "fastify";
import { queryPlatformCosts } from "./platform_cost.repo.js";
import { PlatformCostQuerySchema } from "./platform_cost.schema.js";

export async function platformCostRoutes(app: FastifyInstance): Promise<void> {
  app.get("/", async (request, reply) => {
    const parsed = PlatformCostQuerySchema.safeParse(request.query);

    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid platform cost query",
        details: parsed.error.flatten(),
      });
      return;
    }

    return queryPlatformCosts(app.db, parsed.data);
  });
}
