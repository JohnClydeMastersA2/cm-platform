import { z } from "zod";
import { AuditFieldsSchema, PositiveIntFromParamSchema } from "./common.js";

export const PublisherParamsSchema = z.object({
  publisherId: PositiveIntFromParamSchema,
});

export const PublisherSchema = AuditFieldsSchema.extend({
  publisherId: z.number().int().positive(),
  publisherName: z.string(),
  contactName: z.string().nullable(),
  contactEmail: z.string().nullable(),
  websiteUrl: z.string().nullable(),
  registrationNotes: z.string().nullable(),
  registrationStatus: z.string(),
  hasPassword: z.boolean(),
  passwordSetAt: z.date().nullable(),
  lastLoginAt: z.date().nullable(),
});

export const PublisherListSchema = z.array(PublisherSchema);

export const PublisherRegistrationSchema = z.object({
  publisherName: z.string().trim().min(1).max(255),
  contactName: z.string().trim().min(1).max(255),
  contactEmail: z.email().max(255),
  websiteUrl: z.url().max(500),
  registrationNotes: z.string().trim().max(4000).optional(),
});

export const PublisherPasswordSetupSchema = z.object({
  contactEmail: z.email().max(255),
  password: z.string().min(8).max(200),
});

export const PublisherLoginSchema = z.object({
  contactEmail: z.email().max(255),
  password: z.string().min(1).max(200),
});

export type PublisherParams = z.infer<typeof PublisherParamsSchema>;
export type Publisher = z.infer<typeof PublisherSchema>;
export type PublisherRegistration = z.infer<typeof PublisherRegistrationSchema>;
export type PublisherPasswordSetup = z.infer<typeof PublisherPasswordSetupSchema>;
export type PublisherLogin = z.infer<typeof PublisherLoginSchema>;
