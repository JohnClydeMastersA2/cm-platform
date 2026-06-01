import "fastify";
import sql from "mssql";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { MessagingClient } from "../plugins/messaging.js";

declare module "fastify" {
  interface FastifyInstance {
    db: sql.ConnectionPool;
    adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    messaging: MessagingClient;
  }
}
