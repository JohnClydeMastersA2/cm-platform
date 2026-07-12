import type { FastifyInstance } from "fastify";
import { advertiserRoutes } from "../modules/advertiser/advertiser.routes.js";
import { offerRoutes } from "../modules/offer/offer.routes.js";
import { publisherRoutes } from "../modules/publisher/publisher.routes.js";
import { resetPriorityQueueDemoMemory } from "../modules/priority_queue/priority_queue.routes.js";

export async function internalSurface(app: FastifyInstance): Promise<void> {
  app.register(
    async function internalRoot(internalApp) {
      internalApp.addHook("preHandler", internalApp.adminAuth);

      internalApp.get("/ping", async () => {
        return { ok: true, surface: "internal" };
      });

      internalApp.post("/maintenance/reset-priority-queue-demo", async () => {
        await internalApp.messaging.purgePriorityQueue();
        resetPriorityQueueDemoMemory();
        return { ok: true };
      });

      internalApp.register(advertiserRoutes, { prefix: "/advertisers" });
      internalApp.register(offerRoutes, { prefix: "/offers" });
      internalApp.register(publisherRoutes, { prefix: "/publishers" });
    },
    { prefix: "/internal" },
  );
}
