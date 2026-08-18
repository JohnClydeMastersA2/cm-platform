import "fastify";
import type { Pool } from "pg";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { MessagingClient } from "../plugins/messaging.js";
import type { Db as MongoDb } from "mongodb";

declare module "fastify" {
  interface FastifyInstance {
    db: Pool;
    adminAuth: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    messaging: MessagingClient;
    mongoDb: MongoDb;
  }
}
