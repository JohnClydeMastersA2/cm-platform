import type { FastifyReply } from "fastify";

type HealthcareClientOptions = {
  baseUrl: string;
};

export class HealthcareTransformClient {
  private readonly baseUrl: string;

  constructor(opts: HealthcareClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "");
  }

  listSourceDocuments(): Promise<Response> {
    return this.request("/api/source-documents");
  }

  getSourceDocument(sourceId: string): Promise<Response> {
    return this.request(`/api/source-documents/${encodeURIComponent(sourceId)}`);
  }

  processSourceDocument(sourceId: string): Promise<Response> {
    return this.request(`/api/source-documents/${encodeURIComponent(sourceId)}/process`, {
      method: "POST",
    });
  }

  getDocument(documentId: string): Promise<Response> {
    return this.request(`/api/documents/${encodeURIComponent(documentId)}`);
  }

  getDocumentJson(documentId: string): Promise<Response> {
    return this.request(`/api/documents/${encodeURIComponent(documentId)}/json`);
  }

  private request(path: string, init?: RequestInit): Promise<Response> {
    return fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...init?.headers,
      },
    });
  }
}

export async function sendHealthcareResponse(response: Response, reply: FastifyReply): Promise<void> {
  const contentType = response.headers.get("content-type");
  if (contentType) {
    reply.header("content-type", contentType);
  }

  reply.code(response.status);

  const text = await response.text();
  if (!text) {
    reply.send();
    return;
  }

  if (contentType?.toLowerCase().includes("application/json")) {
    reply.send(JSON.parse(text) as unknown);
    return;
  }

  reply.send(text);
}
