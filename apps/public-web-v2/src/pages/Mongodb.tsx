import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { BackToTop } from "../components/BackToTop";
import { MetricCard } from "../components/MetricCard";
import { formatDate } from "../lib/date";
import { readError } from "../lib/http";

type MongoWebhookEvent = {
  id: string;
  provider: string;
  eventType: string;
  emailId: string | null;
  recipients: string[];
  sender: string | null;
  subject: string | null;
  receivedAt: string;
  source: "webhook" | "imported-jsonl";
  payloadAvailable: boolean;
  payload: unknown | null;
  processing: {
    status: string;
    message?: string;
  };
};

type MongoWebhookExplorerState = {
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  eventTypeCounts: Array<{ _id: string; count: number }>;
  sourceCounts: Array<{ _id: string; count: number }>;
  events: MongoWebhookEvent[];
};

type MongoWebhookFilters = {
  q: string;
  eventType: string;
};

const emptyState: MongoWebhookExplorerState = {
  page: 1,
  pageSize: 10,
  total: 0,
  pageCount: 1,
  eventTypeCounts: [],
  sourceCounts: [],
  events: []
};

export function Mongodb() {
  const [explorerState, setExplorerState] = useState<MongoWebhookExplorerState>(emptyState);
  const [filters, setFilters] = useState<MongoWebhookFilters>({ q: "", eventType: "" });
  const [draftFilters, setDraftFilters] = useState<MongoWebhookFilters>({ q: "", eventType: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    void loadEvents(1, filters);
  }, []);

  const liveCount = explorerState.sourceCounts.find((item) => item._id === "webhook")?.count ?? 0;

  async function loadEvents(page: number, nextFilters = filters) {
    setIsLoading(true);
    setError(undefined);

    const query = new URLSearchParams({
      page: String(page),
      pageSize: String(explorerState.pageSize)
    });

    if (nextFilters.q) {
      query.set("q", nextFilters.q);
    }

    if (nextFilters.eventType) {
      query.set("eventType", nextFilters.eventType);
    }

    try {
      const response = await fetch(`/email-webhook-events?${query}`);

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load MongoDB webhook events"));
      }

      setExplorerState((await response.json()) as MongoWebhookExplorerState);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load MongoDB webhook events.");
    } finally {
      setIsLoading(false);
    }
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextFilters = {
      q: draftFilters.q.trim(),
      eventType: draftFilters.eventType
    };

    setFilters(nextFilters);
    void loadEvents(1, nextFilters);
  }

  return (
    <div className="platform-overview queue-panel">
      <section className="platform-hero">
        <div>
          <div className="platform-kicker">Document-oriented NoSQL</div>
          <h1 className="h3 mb-2">Email Webhook Explorer with MongoDB</h1>
          <p className="platform-lede">
            CM Platform includes email delivery through the Resend API and a webhook that tracks
            delivery outcomes. Each webhook arrives as a JSON payload and is stored as a document in
            MongoDB. This page demonstrates how a document database can store these payloads and search
            specific fields within them.
          </p>
          <p className="platform-lede mt-3">
            MongoDB stores each provider webhook as one document containing normalized searchable fields,
            nested processing metadata, recipient arrays, and the original payload when available. SQL
            Server remains responsible for relational business state.
          </p>
        </div>
        <div className="platform-stack">
          <StackRow label="Collection" value="emailWebhookEvents" />
          <StackRow label="Persistence" value="Docker volume cm_platform_mongodb_data" />
          <StackRow label="Privacy" value="Public API masks email addresses recursively" />
          <div className="mongodb-credentials">
            <span className="mongodb-credentials-heading">MongoDB University skills</span>
            <div className="mongodb-credential-grid">
              <MongoCredential
                src="/mongodb-university-overview-badge.png"
                alt="MongoDB University MongoDB Overview skill badge"
                label="MongoDB Overview"
              />
              <MongoCredential
                src="/mongodb-university-relational-document-badge.png"
                alt="MongoDB University Relational to Document Model skill badge"
                label="Relational to Document Model"
              />
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      ) : null}

      <section className="row g-3">
        <MetricCard label="Matching documents" value={explorerState.total} variant="card" />
        <MetricCard label="Live webhooks" value={liveCount} variant="card" />
        <MetricCard label="Event types" value={explorerState.eventTypeCounts.length} variant="card" />
      </section>

      <section className="card shadow-sm">
        <div className="card-body">
          <form className="row g-3 align-items-end" onSubmit={submitSearch}>
            <div className="col-lg-5">
              <label className="form-label" htmlFor="mongodb-search">
                Search document fields
              </label>
              <input
                className="form-control"
                id="mongodb-search"
                name="q"
                value={draftFilters.q}
                placeholder="Recipient, subject, email ID, sender..."
                onChange={(event) => setDraftFilters({ ...draftFilters, q: event.target.value })}
              />
            </div>
            <div className="col-md-4 col-lg-3">
              <label className="form-label" htmlFor="mongodb-event-type">
                Event type
              </label>
              <select
                className="form-select"
                id="mongodb-event-type"
                name="eventType"
                value={draftFilters.eventType}
                onChange={(event) => setDraftFilters({ ...draftFilters, eventType: event.target.value })}
              >
                <option value="">All event types</option>
                {explorerState.eventTypeCounts.map((item) => (
                  <option value={item._id} key={item._id}>
                    {item._id} ({item.count})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-4 col-lg-2 d-grid">
              <button className="btn btn-primary" type="submit" disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </button>
            </div>
          </form>
          <div className="small text-muted mt-3">
            Indexed fields include receivedAt, eventType, recipients, emailId, and providerEventId.
          </div>
        </div>
      </section>

      <section className="card shadow-sm">
        <div className="card-header d-flex align-items-center justify-content-between gap-3">
          <strong>Webhook documents</strong>
          <button
            className="btn btn-sm btn-outline-secondary"
            type="button"
            onClick={() => void loadEvents(explorerState.page)}
            disabled={isLoading}
          >
            Refresh
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 mongodb-webhook-table">
            <thead>
              <tr>
                <th>Received</th>
                <th>Event</th>
                <th>Recipient</th>
                <th>Subject</th>
                <th>Document</th>
              </tr>
            </thead>
            <tbody>
              {explorerState.events.length ? (
                explorerState.events.map((event) => (
                  <tr key={event.id}>
                    <td className="text-nowrap">{formatDate(event.receivedAt)}</td>
                    <td>
                      <code>{event.eventType}</code>
                    </td>
                    <td>
                      {event.recipients.length
                        ? event.recipients.map((recipient) => <div key={recipient}>{recipient}</div>)
                        : "None"}
                    </td>
                    <td>{event.subject ?? "Not supplied"}</td>
                    <td>
                      <details>
                        <summary className="mongodb-document-summary">View fields</summary>
                        <pre className="mongodb-document mt-2 mb-0">{JSON.stringify(event, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-muted p-4">
                    No MongoDB documents matched these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex align-items-center justify-content-between">
          <span className="text-muted small">
            Page {explorerState.page} of {explorerState.pageCount}
          </span>
          <div className="btn-group">
            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              onClick={() => void loadEvents(explorerState.page - 1)}
              disabled={explorerState.page <= 1 || isLoading}
            >
              Previous
            </button>
            <button
              className="btn btn-sm btn-outline-secondary"
              type="button"
              onClick={() => void loadEvents(explorerState.page + 1)}
              disabled={explorerState.page >= explorerState.pageCount || isLoading}
            >
              Next
            </button>
          </div>
        </div>
      </section>
      <BackToTop />
    </div>
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

function MongoCredential({ src, alt, label }: { src: string; alt: string; label: string }) {
  return (
    <div className="mongodb-credential">
      <img src={src} alt={alt} />
      <strong>{label}</strong>
    </div>
  );
}
