import type { Pool } from "pg";
import type { PlatformCostDailyRow, PlatformCostQuery } from "./platform_cost.schema.js";

const defaultRangeDays = 30;
const maxRangeDays = 60;

export async function queryPlatformCosts(
  db: Pool,
  query: PlatformCostQuery,
): Promise<{
  from: string;
  to: string;
  rows: PlatformCostDailyRow[];
}> {
  const to = query.to ?? toDateOnly(new Date());
  const from = query.from ?? toDateOnly(addDays(new Date(`${to}T00:00:00Z`), -defaultRangeDays + 1));
  const boundedFrom = boundFromDate(from, to);

  const result = await db.query<{
    usageDate: Date;
    resourceType: string;
    currency: string;
    pretaxCost: string;
    fetchedAt: Date;
  }>(
    `
      select
        usage_date as "usageDate",
        resource_type as "resourceType",
        currency,
        pretax_cost as "pretaxCost",
        fetched_at as "fetchedAt"
      from azure_cost_daily
      where usage_date between $1::date and $2::date
      order by usage_date desc, resource_type asc;
    `,
    [boundedFrom, to],
  );

  return {
    from: boundedFrom,
    to,
    rows: result.rows.map((row) => ({
      usageDate: toDateOnly(row.usageDate),
      resourceType: row.resourceType,
      currency: row.currency,
      pretaxCost: Number(row.pretaxCost),
      fetchedAt: row.fetchedAt.toISOString(),
    })),
  };
}

function boundFromDate(from: string, to: string): string {
  const earliest = toDateOnly(addDays(new Date(`${to}T00:00:00Z`), -maxRangeDays + 1));

  return from < earliest ? earliest : from;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
