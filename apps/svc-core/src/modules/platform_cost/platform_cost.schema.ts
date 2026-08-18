import { z } from "zod";

const DateString = z.iso.date();

export const PlatformCostQuerySchema = z.object({
  from: DateString.optional(),
  to: DateString.optional(),
}).refine((query) => !query.from || !query.to || query.from <= query.to, {
  message: "from must be on or before to",
  path: ["from"],
});

export type PlatformCostQuery = z.infer<typeof PlatformCostQuerySchema>;

export type PlatformCostDailyRow = {
  usageDate: string;
  resourceType: string;
  currency: string;
  pretaxCost: number;
  fetchedAt: string;
};
