import { useEffect, useState } from "react";
import { BackToTop } from "../components/BackToTop";
import { formatDateWithSeconds } from "../lib/date";
import { readError } from "../lib/http";

type PlatformCostRow = {
  usageDate: string;
  resourceType: string;
  currency: string;
  pretaxCost: number;
  fetchedAt: string;
};

type PlatformCosts = {
  from: string;
  to: string;
  rows: PlatformCostRow[];
};

type LoadState = "idle" | "submitting" | "success" | "error";

export function InfrastructureCost() {
  const [platformCosts, setPlatformCosts] = useState<PlatformCosts | null>(null);
  const [costLoadState, setCostLoadState] = useState<LoadState>("idle");
  const [costMessage, setCostMessage] = useState<string | undefined>();

  useEffect(() => {
    void loadCosts();
  }, []);

  async function loadCosts() {
    if (costLoadState === "submitting") {
      return;
    }

    setCostLoadState("submitting");
    setCostMessage(undefined);

    try {
      const response = await fetch(`/platform/costs?ts=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load Azure cost snapshots"));
      }

      setPlatformCosts(await response.json() as PlatformCosts);
      setCostLoadState("success");
    } catch (err) {
      setCostLoadState("error");
      setCostMessage(err instanceof Error ? err.message : "Unable to load Azure cost snapshots.");
    }
  }

  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">Platform operations</p>
          <h1>Infrastructure Cost</h1>
          <p className="platform-lede">
            Cached daily infrastructure cost snapshots for the production platform. Azure is the first
            automated source; external services can be added as integrations or manually tracked rows.
          </p>
          <p className="platform-lede mt-3">
            This keeps cost inquiry separate from live infrastructure probing, so reviewing the report
            reads Postgres only and does not wake the healthcare-transform demo service.
          </p>
          <div className="platform-hero-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void loadCosts()}
              disabled={costLoadState === "submitting"}
            >
              {costLoadState === "submitting" ? "Loading..." : "Refresh Costs"}
            </button>
          </div>
        </div>
        <div className="platform-stack" aria-label="Cost reporting summary">
          <StackRow label="First Source" value="Azure Cost Management daily snapshot" />
          <StackRow label="Storage" value="Postgres, retained for 60 days" />
          <StackRow label="Page Cost" value="Reads cached rows only" />
        </div>
      </div>

      {costMessage ? (
        <div className="alert alert-danger" role="alert">
          {costMessage}
        </div>
      ) : null}

      <section className="platform-section platform-section-block">
        <div>
          <h2>Automated Cost Snapshots</h2>
          <p>
            Automated rows are grouped by provider resource type. Azure may revise recent usage as
            billing data settles, so the scheduled job refreshes the whole retained window each day.
          </p>
        </div>
        <CostSnapshotTable platformCosts={platformCosts} />
      </section>
      <BackToTop />
    </section>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-stack-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CostSnapshotTable({ platformCosts }: { platformCosts: PlatformCosts | null }) {
  if (!platformCosts?.rows.length) {
    return (
      <div className="infrastructure-table-wrap">
        <table className="table table-sm infrastructure-table">
          <tbody>
            <tr>
              <td className="text-muted">
                No cached infrastructure cost snapshots are available yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const latestFetchedAt = platformCosts.rows
    .map((row) => row.fetchedAt)
    .sort()
    .at(-1);
  const totalCost = platformCosts.rows.reduce((total, row) => total + row.pretaxCost, 0);
  const currency = platformCosts.rows[0]?.currency ?? "USD";

  return (
    <div className="infrastructure-table-wrap">
      <table className="table table-sm infrastructure-table">
        <thead>
          <tr>
            <th>Period</th>
            <th>Total</th>
            <th>Latest Snapshot</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {platformCosts.from} to {platformCosts.to}
            </td>
            <td>{formatCurrency(totalCost, currency)}</td>
            <td>{latestFetchedAt ? formatDateWithSeconds(latestFetchedAt) : "Not captured yet"}</td>
          </tr>
        </tbody>
      </table>
      <table className="table table-sm infrastructure-table mt-3">
        <thead>
          <tr>
            <th>Date</th>
            <th>Resource Type</th>
            <th>Cost</th>
          </tr>
        </thead>
        <tbody>
          {platformCosts.rows.map((row) => (
            <tr key={`${row.usageDate}-${row.resourceType}-${row.currency}`}>
              <td>{row.usageDate}</td>
              <td>{row.resourceType}</td>
              <td>{formatCurrency(row.pretaxCost, row.currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(value);
}
