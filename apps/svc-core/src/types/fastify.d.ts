import "fastify";
import sql from "mssql";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    db: sql.ConnectionPool;
    adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}