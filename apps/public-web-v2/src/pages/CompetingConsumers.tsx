import { useEffect, useState } from "react";
import { BackToTop } from "../components/BackToTop";
import { MetricCard } from "../components/MetricCard";
import { StatusMessage } from "../components/StatusMessage";
import { formatDate } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";
import type { FormState } from "../types/forms";

type WidgetConsumerStatus = "queued" | "processing" | "processed" | "failed";

type WidgetConsumerDemoItem = {
  widgetId: number;
  widgetName: string;
  status: WidgetConsumerStatus;
  createdAt: string;
  queuedAt: string | null;
  processingStartedAt: string | null;
  processedAt: string | null;
  processedBy: string | null;
  processingSeconds: number | null;
  lastMessageId: string | null;
  lastError: string | null;
};

type WidgetConsumerQueueState = {
  widgets: WidgetConsumerDemoItem[];
  rabbitMqMessageCount: number;
  processedBy: Record<string, number>;
};

const emptyQueueState: WidgetConsumerQueueState = {
  widgets: [],
  rabbitMqMessageCount: 0,
  processedBy: {}
};

export function CompetingConsumers() {
  const [queueState, setQueueState] = useState<WidgetConsumerQueueState>(emptyQueueState);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    void loadConsumerWidgets();
  }, []);

  const isSubmitting = formState.status === "submitting";
  const queuedCount = queueState.widgets.filter((widget) => widget.status === "queued").length;
  const processingCount = queueState.widgets.filter((widget) => widget.status === "processing").length;
  const processedCount = queueState.widgets.filter((widget) => widget.status === "processed").length;
  const failedCount = queueState.widgets.filter((widget) => widget.status === "failed").length;

  async function loadConsumerWidgets() {
    try {
      const response = await fetch("/consumer-widgets");

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load competing consumer widgets"));
      }

      setQueueState((await response.json()) as WidgetConsumerQueueState);
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load competing consumer widgets."
      });
    }
  }

  async function createConsumerWidgets(count: number) {
    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/consumer-widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to create competing consumer widgets"));
      }

      setQueueState((await response.json()) as WidgetConsumerQueueState);
      setFormState({
        status: "success",
        message: `Created ${count} competing consumer widget${count === 1 ? "" : "s"}. Refresh after the workers have time to process them.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to create competing consumer widgets."
      });
    }
  }

  async function deleteConsumerWidgets() {
    const confirmed = window.confirm("Delete all competing consumer widget rows and purge the RabbitMQ queue?");

    if (!confirmed) {
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/consumer-widgets", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to delete competing consumer widgets"));
      }

      setQueueState((await response.json()) as WidgetConsumerQueueState);
      setFormState({
        status: "success",
        message: "Deleted all competing consumer widgets and purged the queue."
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to delete competing consumer widgets."
      });
    }
  }

  return (
    <div className="demo-panel queue-panel">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div className="rabbitmq-demo-copy">
          <p className="platform-kicker">Worker scaling pattern</p>
          <h1 className="h3 mb-2">Competing Consumers with RabbitMQ</h1>
          <p className="text-muted mb-0">
            This demonstration uses one RabbitMQ queue and multiple worker instances to show competing
            consumers. Creating widgets writes rows into <code>dbo.WidgetConsumerDemo</code> with a
            status of queued, then publishes durable{" "}
            <code>widget.consumer_demo.processing_requested.v1</code> messages to the{" "}
            <code>cm.widget.consumer-demo</code> exchange. Each worker consumes from the same{" "}
            <code>cm.widget.consumer-demo.processing</code> queue with prefetch set to 1, so RabbitMQ
            gives each message to only one available worker. A faster worker finishes and acknowledges
            messages sooner, making it available for more work while slower workers are still processing.
          </p>
        </div>
      </div>

      <div className="messaging-notes mb-4">
        <h2 className="h6 mb-2">Important Notes</h2>
        <ul className="mb-0 text-muted">
          <li>
            These demo queues are shared globally. If more than one visitor uses the demo at the same
            time, one visitor may see or process messages created by another visitor. This behavior is
            known and accepted for this portfolio demo.
          </li>
          <li>
            Each message is delivered to only one available worker, so fast and slow consumers compete
            for work from the same queue.
          </li>
          <li>
            The worker that finishes first becomes available for another message sooner, which is why
            faster workers usually process more rows.
          </li>
        </ul>
      </div>

      <StatusMessage state={formState} />

      <div className="row g-3 mb-4">
        <MetricCard label="RabbitMQ messages" value={queueState.rabbitMqMessageCount} />
        <MetricCard label="Queued / Processing" value={`${queuedCount} / ${processingCount}`} />
        <MetricCard label="Processed / Failed" value={`${processedCount} / ${failedCount}`} />
        <ConsumerProcessedCards processedBy={queueState.processedBy} />
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-secondary" type="button" onClick={() => void loadConsumerWidgets()} disabled={isSubmitting}>
            Refresh
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void createConsumerWidgets(10)} disabled={isSubmitting}>
            Create 10
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void createConsumerWidgets(25)} disabled={isSubmitting}>
            Create 25
          </button>
        </div>
        <button className="btn btn-outline-danger ms-sm-auto" type="button" onClick={() => void deleteConsumerWidgets()} disabled={isSubmitting}>
          Delete All Widgets
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-striped widget-table consumer-widget-table">
          <thead>
            <tr>
              <th className="widget-col-id">ID</th>
              <th>Name</th>
              <th className="widget-col-status">Status</th>
              <th className="consumer-col-worker">Processed By</th>
              <th className="consumer-col-seconds">Seconds</th>
              <th className="widget-col-date">Created</th>
              <th className="widget-col-date">Processed</th>
            </tr>
          </thead>
          <tbody>
            {queueState.widgets.length ? (
              queueState.widgets.map((widget) => (
                <tr key={widget.widgetId}>
                  <td>{widget.widgetId}</td>
                  <td>{widget.widgetName}</td>
                  <td>
                    <StatusBadge status={widget.status} />
                  </td>
                  <td>{widget.processedBy ?? ""}</td>
                  <td>{widget.processingSeconds ?? ""}</td>
                  <td>{formatDate(widget.createdAt)}</td>
                  <td>{widget.processedAt ? formatDate(widget.processedAt) : ""}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-muted">
                  No consumer widgets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <BackToTop />
    </div>
  );
}

function ConsumerProcessedCards({ processedBy }: { processedBy: Record<string, number> }) {
  const entries = Object.entries(processedBy).sort(([left], [right]) => left.localeCompare(right));

  if (!entries.length) {
    return <MetricCard label="Workers" value={0} />;
  }

  return entries.map(([consumerName, count]) => <MetricCard label={consumerName} value={count} key={consumerName} />);
}

function StatusBadge({ status }: { status: WidgetConsumerStatus }) {
  const badgeClass =
    status === "processed"
      ? "text-bg-success"
      : status === "failed"
        ? "text-bg-danger"
        : status === "processing"
          ? "text-bg-primary"
          : "text-bg-secondary";

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}
