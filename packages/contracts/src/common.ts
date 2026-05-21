import { z } from "zod";

export const AuditFieldsSchema = z.object({
  externalId: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.date(),
  createdBy: z.string().nullable(),
  updatedAt: z.date().nullable(),
  updatedBy: z.string().nullable(),
});

export const PositiveIntFromParamSchema = z.coerce.number().int().positive();
