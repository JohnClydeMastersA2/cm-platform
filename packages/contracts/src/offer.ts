import { z } from "zod";
import { AuditFieldsSchema, PositiveIntFromParamSchema } from "./common.js";

export const OfferParamsSchema = z.object({
  offerId: PositiveIntFromParamSchema,
});

export const OfferSchema = AuditFieldsSchema.extend({
  offerId: z.number().int().positive(),
  advertiserId: z.number().int().positive(),
  advertiserName: z.string(),
  offerName: z.string(),
});

export const OfferListSchema = z.array(OfferSchema);

export type OfferParams = z.infer<typeof OfferParamsSchema>;
export type Offer = z.infer<typeof OfferSchema>;
