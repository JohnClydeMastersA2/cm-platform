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
  const yesterday = toDateInputValue(addDays(new Date(), -1));
  const [platformCosts, setPlatformCosts] = useState<PlatformCosts | null>(null);
  const [costLoadState, setCostLoadState] = useState<LoadState>("idle");
  const [costMessage, setCostMessage] = useState<string | undefined>();
  const [fromDate, setFromDate] = useState(yesterday);
  const [toDate, setToDate] = useState(yesterday);

  useEffect(() => {
    void loadCosts(fromDate, toDate);
  }, [fromDate, toDate]);

  async function loadCosts(from: string, to: string) {
    setCostLoadState("submitting");
    setCostMessage(undefined);

    try {
      const params = new URLSearchParams({ from, to });
      const response = await fetch(`/platform/costs?${params.toString()}`, {
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

  function showYesterday() {
    setRange(yesterday, yesterday);
  }

  function showLastDays(days: number) {
    setRange(toDateInputValue(addDays(new Date(`${yesterday}T00:00:00Z`), -days + 1)), yesterday);
  }

  function showAllRetained() {
    showLastDays(60);
  }

  function setRange(from: string, to: string) {
    setFromDate(from);
    setToDate(to);
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
      {costLoadState === "submitting" ? (
        <div className="alert alert-secondary" role="status">
          Loading cached infrastructure costs...
        </div>
      ) : null}

      <section className="platform-section platform-section-block">
        <div>
          <h2>Automated Cost Snapshots</h2>
          <p>
            Automated rows are grouped by provider resource type. The scheduled job captures yesterday
            once per day, and retained snapshots can be reviewed by date range.
          </p>
        </div>
        <div className="cost-filter-bar" aria-label="Cost date range">
          <div className="cost-filter-presets">
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={showYesterday}>
              Yesterday
            </button>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => showLastDays(7)}>
              Last 7
            </button>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => showLastDays(30)}>
              Last 30
            </button>
            <button className="btn btn-sm btn-outline-secondary" type="button" onClick={showAllRetained}>
              All Retained
            </button>
          </div>
          <div className="cost-date-controls">
            <label>
              <span>From</span>
              <input
                className="form-control form-control-sm"
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(event) => setFromDate(event.target.value)}
              />
            </label>
            <label>
              <span>To</span>
              <input
                className="form-control form-control-sm"
                type="date"
                value={toDate}
                min={fromDate}
                max={toDateInputValue(new Date())}
                onChange={(event) => setToDate(event.target.value)}
              />
            </label>
          </div>
        </div>
        <CostSnapshotTable platformCosts={platformCosts} />
      </section>
      <BackToTop />
    </section>
  );
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
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
