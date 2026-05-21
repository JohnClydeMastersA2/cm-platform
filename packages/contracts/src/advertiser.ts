import { z } from "zod";
import { AuditFieldsSchema, PositiveIntFromParamSchema } from "./common.js";

export const AdvertiserParamsSchema = z.object({
  advertiserId: PositiveIntFromParamSchema,
});

export const AdvertiserSchema = AuditFieldsSchema.extend({
  advertiserId: z.number().int().positive(),
  advertiserName: z.string(),
});

export const AdvertiserListSchema = z.array(AdvertiserSchema);

export type AdvertiserParams = z.infer<typeof AdvertiserParamsSchema>;
export type Advertiser = z.infer<typeof AdvertiserSchema>;
