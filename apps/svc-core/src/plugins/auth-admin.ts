import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type AdminAuthPluginOptions = {
  adminKey: string;
};

async function authAdminPluginImpl(
  app: FastifyInstance,
  opts: AdminAuthPluginOptions,
): Promise<void> {
  app.decorate(
    "adminAuth",
    async function adminAuth(request: FastifyRequest, reply: FastifyReply) {
      const headerValue = request.headers["x-admin-key"];

      if (headerValue !== opts.adminKey) {
        reply.code(401).send({ error: "Unauthorized" });
      }
    },
  );
}

export const authAdminPlugin = fp(authAdminPluginImpl, {
  name: "auth-admin-plugin",
});
