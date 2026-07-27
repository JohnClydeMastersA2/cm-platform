import { z } from "zod";

export const SourceDocumentParamsSchema = z.object({
  sourceId: z.string().min(1).max(120),
});

export const HealthcareDocumentParamsSchema = z.object({
  documentId: z.uuid(),
});
