import { useEffect, useState } from "react";
import { BackToTop } from "../components/BackToTop";
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
  const [workerRun, setWorkerRun] = useState<WorkerRunState | null>(null);

  useEffect(() => {
    void loadConsumerWidgets();
  }, []);

  useEffect(() => {
    if (!workerRun || workerRun.status === "complete" || workerRun.status === "failed") {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadConsumerWidgets();
    }, 2500);

    return () => window.clearTimeout(timeoutId);
  }, [queueState, workerRun]);

  const isSubmitting = formState.status === "submitting";

  async function loadConsumerWidgets(): Promise<WidgetConsumerQueueState | null> {
    try {
      const response = await fetch("/consumer-widgets");

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load competing consumer widgets"));
      }

      const nextState = (await response.json()) as WidgetConsumerQueueState;
      setQueueState(nextState);
      updateWorkerRun(nextState);
      return nextState;
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load competing consumer widgets."
      });
      setWorkerRun((current) => current ? { ...current, status: "failed" } : current);
      return null;
    }
  }

  async function createConsumerWidgets(count: number) {
    setFormState({ status: "submitting" });
    setWorkerRun({
      count,
      widgetIds: [],
      submittedAt: new Date().toISOString(),
      status: "queued"
    });

    try {
      const response = await csrfFetch("/consumer-widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to create competing consumer widgets"));
      }

      const nextState = (await response.json()) as WidgetConsumerQueueState;
      const createdWidgetIds = nextState.widgets
        .slice()
        .sort((left, right) => right.widgetId - left.widgetId)
        .slice(0, count)
        .map((widget) => widget.widgetId);

      setQueueState(nextState);
      updateWorkerRun(nextState, createdWidgetIds);
      setFormState({
        status: "success",
        message: `Created ${count} competing consumer widget${count === 1 ? "" : "s"}. The worker status below will update while the background consumers start and process the queue.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to create competing consumer widgets."
      });
      setWorkerRun((current) => current ? { ...current, status: "failed" } : current);
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
      setWorkerRun(null);
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

  function updateWorkerRun(nextState: WidgetConsumerQueueState, nextWidgetIds?: number[]) {
    setWorkerRun((current) => {
      const widgetIds = nextWidgetIds ?? current?.widgetIds ?? [];

      if (!current || !widgetIds.length) {
        return current;
      }

      const trackedWidgets = nextState.widgets.filter((widget) => widgetIds.includes(widget.widgetId));

      if (!trackedWidgets.length) {
        return current;
      }

      const isComplete = trackedWidgets.every((widget) => widget.status === "processed" || widget.status === "failed");

      return {
        ...current,
        widgetIds,
        status: isComplete ? "complete" : "active"
      };
    });
  }

  return (
    <div className="demo-panel queue-panel">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div className="rabbitmq-demo-copy">
          <p className="platform-kicker">Worker scaling pattern</p>
          <h1 className="h3 mb-2">Competing Consumers</h1>
          <p className="text-muted mb-0">
            This demonstration uses one RabbitMQ queue and multiple worker instances to show competing
            consumers. Creating widgets writes rows to Postgres with a status of queued, then publishes
            durable messages to the RabbitMQ processing queue. Each worker consumes from the same queue
            with prefetch set to 1, so RabbitMQ gives each message to only one available worker. A faster
            worker finishes and acknowledges messages sooner, making it available for more work while
            slower workers are still processing.{" "}
            <a href="/competing-consumers-flow.svg" target="_blank" rel="noreferrer">
              Open full-size diagram
            </a>
            .
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
      <WorkerRunPanel workerRun={workerRun} queueState={queueState} />

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

type WorkerRunState = {
  count: number;
  widgetIds: number[];
  submittedAt: string;
  status: "queued" | "active" | "complete" | "failed";
};

function WorkerRunPanel({
  workerRun,
  queueState
}: {
  workerRun: WorkerRunState | null;
  queueState: WidgetConsumerQueueState;
}) {
  if (!workerRun) {
    return null;
  }

  const trackedWidgets = queueState.widgets.filter((widget) => workerRun.widgetIds.includes(widget.widgetId));
  const queuedCount = trackedWidgets.filter((widget) => widget.status === "queued").length;
  const processingCount = trackedWidgets.filter((widget) => widget.status === "processing").length;
  const processedCount = trackedWidgets.filter((widget) => widget.status === "processed").length;
  const failedCount = trackedWidgets.filter((widget) => widget.status === "failed").length;
  const completedCount = processedCount + failedCount;
  const hasWorkerActivity = processingCount > 0 || completedCount > 0;
  const isComplete = workerRun.status === "complete";
  const isFailed = workerRun.status === "failed";

  const steps: WorkerStep[] = [
    {
      label: "Queued",
      detail: `${workerRun.count} widget${workerRun.count === 1 ? "" : "s"} accepted by the API.`,
      status: workerRun.widgetIds.length ? "complete" : "active"
    },
    {
      label: "Starting worker",
      detail: hasWorkerActivity
        ? "A background consumer has picked up work from RabbitMQ."
        : "Low-cost mode may need a short moment to start an idle consumer.",
      status: hasWorkerActivity ? "complete" : "active"
    },
    {
      label: "Processing",
      detail: `${completedCount} complete, ${processingCount} processing, ${queuedCount} queued.`,
      status: isComplete ? "complete" : hasWorkerActivity ? "active" : "pending"
    },
    {
      label: "Done",
      detail: failedCount ? `${processedCount} processed, ${failedCount} failed.` : `${processedCount} processed.`,
      status: isFailed ? "failed" : isComplete ? "complete" : "pending"
    }
  ];

  return (
    <section className="worker-run-panel mb-4" aria-label="Background worker progress">
      <div className="worker-run-summary">
        <div>
          <h2 className="h6 mb-1">Background worker status</h2>
          <p className="text-muted mb-0">
            This demo runs in low-cost mode. If the consumers are sleeping, the queue is still safe; processing starts after Azure wakes a worker.
          </p>
        </div>
        <span className={`worker-run-state ${isComplete ? "complete" : isFailed ? "failed" : "active"}`}>
          {isComplete ? "Complete" : isFailed ? "Needs attention" : "In progress"}
        </span>
      </div>
      <ol className="worker-run-steps">
        {steps.map((step) => (
          <li className={`worker-run-step ${step.status}`} key={step.label}>
            <span className="worker-run-dot" aria-hidden="true" />
            <span>
              <strong>{step.label}</strong>
              <small>{step.detail}</small>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

type WorkerStep = {
  label: string;
  detail: string;
  status: "pending" | "active" | "complete" | "failed";
};

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
