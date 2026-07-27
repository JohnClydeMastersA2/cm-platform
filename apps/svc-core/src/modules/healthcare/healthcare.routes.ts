import type { FastifyInstance, FastifyReply } from "fastify";
import { HealthcareTransformClient, sendHealthcareResponse } from "./healthcare.client.js";
import {
  HealthcareDocumentParamsSchema,
  SourceDocumentParamsSchema,
} from "./healthcare.schema.js";

type HealthcareRoutesOptions = {
  healthcareTransformBaseUrl: string;
};

export async function healthcareRoutes(
  app: FastifyInstance,
  opts: HealthcareRoutesOptions,
): Promise<void> {
  const client = new HealthcareTransformClient({
    baseUrl: opts.healthcareTransformBaseUrl,
  });

  app.get("/source-documents", async (_request, reply) => {
    await forwardHealthcareRequest(() => client.listSourceDocuments(), reply);
  });

  app.get("/source-documents/:sourceId", async (request, reply) => {
    const parsed = SourceDocumentParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid sourceId",
        details: parsed.error.flatten(),
      });
      return;
    }

    await forwardHealthcareRequest(() => client.getSourceDocument(parsed.data.sourceId), reply);
  });

  app.post("/source-documents/:sourceId/process", async (request, reply) => {
    const parsed = SourceDocumentParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid sourceId",
        details: parsed.error.flatten(),
      });
      return;
    }

    await forwardHealthcareRequest(() => client.processSourceDocument(parsed.data.sourceId), reply);
  });

  app.get("/documents/:documentId", async (request, reply) => {
    const parsed = HealthcareDocumentParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid documentId",
        details: parsed.error.flatten(),
      });
      return;
    }

    await forwardHealthcareRequest(() => client.getDocument(parsed.data.documentId), reply);
  });

  app.get("/documents/:documentId/json", async (request, reply) => {
    const parsed = HealthcareDocumentParamsSchema.safeParse(request.params);
    if (!parsed.success) {
      reply.code(400).send({
        error: "Invalid documentId",
        details: parsed.error.flatten(),
      });
      return;
    }

    await forwardHealthcareRequest(() => client.getDocumentJson(parsed.data.documentId), reply);
  });
}

async function forwardHealthcareRequest(
  request: () => Promise<Response>,
  reply: FastifyReply,
): Promise<void> {
  try {
    await sendHealthcareResponse(await request(), reply);
  } catch (err) {
    reply.code(502).send({
      error: "Healthcare transform service unavailable",
      detail: err instanceof Error ? err.message : "Unknown healthcare transform upstream error",
    });
  }
}
