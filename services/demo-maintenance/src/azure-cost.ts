import { Pool } from "pg";
import type { Env } from "./config/env.js";

const azureManagementResource = "https://management.azure.com/";
const containerAppsIdentityApiVersion = "2019-08-01";
const costManagementApiVersion = "2025-03-01";
const costManagementMaxAttempts = 4;

type CostManagementResponse = {
  properties?: {
    rows?: Array<[number, number, string, string]>;
  };
};

export type CostSnapshotSummary = {
  enabled: boolean;
  rowsStored: number;
  from: string | null;
  to: string | null;
  totalCost: number;
  currency: string | null;
};

export async function captureAzureCostSnapshots(env: Env): Promise<CostSnapshotSummary> {
  if (!env.COST_REPORTING_ENABLED) {
    return {
      enabled: false,
      rowsStored: 0,
      from: null,
      to: null,
      totalCost: 0,
      currency: null,
    };
  }

  if (!env.AZURE_SUBSCRIPTION_ID) {
    throw new Error("AZURE_SUBSCRIPTION_ID is required when cost reporting is enabled");
  }

  const to = toDateOnly(new Date());
  const from = toDateOnly(addDays(new Date(`${to}T00:00:00Z`), -env.COST_REPORTING_LOOKBACK_DAYS + 1));
  const rows = await queryAzureCosts({
    subscriptionId: env.AZURE_SUBSCRIPTION_ID,
    resourceGroupName: env.AZURE_RESOURCE_GROUP_NAME,
    from,
    to,
  });

  const pool = new Pool({
    connectionString: env.DATABASE_URL,
    connectionTimeoutMillis: 30_000,
    idleTimeoutMillis: 30_000,
    max: 2,
    ssl: env.PGSSLMODE !== "disable",
  });

  try {
    await upsertCostRows(pool, rows);
    await pruneOldCostRows(pool, env.COST_REPORTING_RETENTION_DAYS);
  } finally {
    await pool.end();
  }

  return {
    enabled: true,
    rowsStored: rows.length,
    from,
    to,
    totalCost: rows.reduce((total, row) => total + row.pretaxCost, 0),
    currency: rows[0]?.currency ?? null,
  };
}

type AzureCostRow = {
  usageDate: string;
  resourceType: string;
  currency: string;
  pretaxCost: number;
};

async function queryAzureCosts(opts: {
  subscriptionId: string;
  resourceGroupName: string;
  from: string;
  to: string;
}): Promise<AzureCostRow[]> {
  const token = await getManagedIdentityToken();
  const url = new URL(
    `/subscriptions/${opts.subscriptionId}/resourceGroups/${opts.resourceGroupName}/providers/Microsoft.CostManagement/query`,
    azureManagementResource,
  );
  url.searchParams.set("api-version", costManagementApiVersion);

  const request = {
    type: "Usage",
    timeframe: "Custom",
    timePeriod: {
      from: `${opts.from}T00:00:00Z`,
      to: `${opts.to}T23:59:59Z`,
    },
    dataset: {
      granularity: "Daily",
      aggregation: {
        totalCost: {
          name: "PreTaxCost",
          function: "Sum",
        },
      },
      grouping: [
        {
          type: "Dimension",
          name: "ResourceType",
        },
      ],
    },
  };

  const response = await fetchCostManagementWithRetry(url, token, request);

  if (!response.ok) {
    throw new Error(`Azure Cost Management query failed with ${response.status}: ${await response.text()}`);
  }

  if (response.status === 204) {
    return [];
  }

  const result = await response.json() as CostManagementResponse;

  return (result.properties?.rows ?? []).map((row) => ({
    pretaxCost: Number(row[0]),
    usageDate: formatUsageDate(row[1]),
    resourceType: row[2],
    currency: row[3],
  }));
}

async function fetchCostManagementWithRetry(url: URL, token: string, request: unknown): Promise<Response> {
  let lastStatus = 0;
  let lastBody = "";

  for (let attempt = 1; attempt <= costManagementMaxAttempts; attempt += 1) {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (response.ok || !isRetryableCostResponse(response.status) || attempt === costManagementMaxAttempts) {
      return response;
    }

    lastStatus = response.status;
    lastBody = await response.text();
    await sleep(getRetryDelayMillis(response, attempt));
  }

  throw new Error(`Azure Cost Management query failed with ${lastStatus}: ${lastBody}`);
}

function isRetryableCostResponse(status: number): boolean {
  return status === 429 || status >= 500;
}

function getRetryDelayMillis(response: Response, attempt: number): number {
  const retryAfterSeconds = Number(response.headers.get("retry-after"));

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return retryAfterSeconds * 1_000;
  }

  return attempt * 10_000;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getManagedIdentityToken(): Promise<string> {
  const identityEndpoint = process.env.IDENTITY_ENDPOINT;
  const identityHeader = process.env.IDENTITY_HEADER;

  if (!identityEndpoint || !identityHeader) {
    throw new Error("Container Apps managed identity endpoint is unavailable");
  }

  const url = new URL(identityEndpoint);
  url.searchParams.set("api-version", containerAppsIdentityApiVersion);
  url.searchParams.set("resource", azureManagementResource);

  const response = await fetch(url, {
    headers: {
      "X-IDENTITY-HEADER": identityHeader,
    },
  });

  if (!response.ok) {
    throw new Error(`Managed identity token request failed with ${response.status}: ${await response.text()}`);
  }

  const tokenResponse = await response.json() as { access_token?: string };

  if (!tokenResponse.access_token) {
    throw new Error("Managed identity token response did not include an access token");
  }

  return tokenResponse.access_token;
}

async function upsertCostRows(pool: Pool, rows: AzureCostRow[]): Promise<void> {
  for (const row of rows) {
    await pool.query(
      `
        insert into azure_cost_daily (
          usage_date,
          resource_type,
          currency,
          pretax_cost,
          fetched_at
        )
        values ($1::date, $2, $3, $4, now())
        on conflict (usage_date, resource_type, currency)
        do update set
          pretax_cost = excluded.pretax_cost,
          fetched_at = excluded.fetched_at;
      `,
      [row.usageDate, row.resourceType, row.currency, row.pretaxCost],
    );
  }
}

async function pruneOldCostRows(pool: Pool, retentionDays: number): Promise<void> {
  await pool.query(
    `
      delete from azure_cost_daily
      where usage_date < current_date - ($1::int - 1);
    `,
    [retentionDays],
  );
}

function formatUsageDate(value: number): string {
  const text = String(value);
  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
