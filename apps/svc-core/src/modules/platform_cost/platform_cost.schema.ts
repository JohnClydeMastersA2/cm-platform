import { z } from "zod";

const DateString = z.iso.date();

export const PlatformCostQuerySchema = z.object({
  from: DateString.optional(),
  to: DateString.optional(),
});

export type PlatformCostQuery = z.infer<typeof PlatformCostQuerySchema>;

export type PlatformCostDailyRow = {
  usageDate: string;
  resourceType: string;
  currency: string;
  pretaxCost: number;
  fetchedAt: string;
};
