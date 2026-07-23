import { useEffect, useState } from "react";
import { BackToTop } from "../components/BackToTop";
import { MetricCard } from "../components/MetricCard";
import { StatusMessage } from "../components/StatusMessage";
import { formatDate } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";
import type { FormState } from "../types/forms";

type WidgetStatus = "queued" | "retrying" | "processing" | "processed" | "failed";

type Widget = {
  widgetId: number;
  widgetName: string;
  status: WidgetStatus;
  createdAt: string;
  queuedAt: string | null;
  processingStartedAt: string | null;
  processedAt: string | null;
  processCount: number;
  lastMessageId: string | null;
  lastError: string | null;
};

type WidgetDeadLetterMessage = {
  messageId: string;
  requestedAt: string;
  source: string;
  widgetId: number;
  widgetName: string;
  repairAttempt: boolean;
};

type WidgetQueueState = {
  widgets: Widget[];
  rabbitMqMessageCount: number;
  rabbitMqRetryMessageCount: number;
  rabbitMqDeadLetterMessageCount: number;
  deadLetterMessages: WidgetDeadLetterMessage[];
};

const emptyWidgetQueueState: WidgetQueueState = {
  widgets: [],
  rabbitMqMessageCount: 0,
  rabbitMqRetryMessageCount: 0,
  rabbitMqDeadLetterMessageCount: 0,
  deadLetterMessages: []
};

export function Widgets() {
  const [queueState, setQueueState] = useState<WidgetQueueState>(emptyWidgetQueueState);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    void loadWidgets();
  }, []);

  const isSubmitting = formState.status === "submitting";
  const queuedCount = queueState.widgets.filter((widget) => widget.status === "queued").length;
  const retryingCount = queueState.widgets.filter((widget) => widget.status === "retrying").length;
  const processedCount = queueState.widgets.filter((widget) => widget.status === "processed").length;
  const failedCount = queueState.widgets.filter((widget) => widget.status === "failed").length;

  async function loadWidgets() {
    try {
      const response = await fetch("/widgets");

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load widgets"));
      }

      setQueueState((await response.json()) as WidgetQueueState);
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load widgets."
      });
    }
  }

  async function createWidgets(count: number) {
    await runWidgetAction(async () => {
      const response = await csrfFetch("/widgets", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to create widgets"));
      }

      await loadWidgets();
      return `Created ${count} widget${count === 1 ? "" : "s"}.`;
    }, "Unable to create widgets.");
  }

  async function processWidgets(count?: number) {
    await runWidgetAction(async () => {
      const response = await csrfFetch("/widgets/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(count ? { count } : {})
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to process widgets"));
      }

      const body = (await response.json()) as {
        processedCount: number;
        retryCount: number;
        failedCount: number;
        invalidCount: number;
      };

      await loadWidgets();

      let message = `Processed ${body.processedCount} widget message${body.processedCount === 1 ? "" : "s"}.`;

      if (body.retryCount > 0) {
        message += ` Scheduled ${body.retryCount} delayed retry${body.retryCount === 1 ? "" : "ies"}. After the retry delay (10 seconds), click Refresh, then Process again.`;
      }

      if (body.failedCount > 0) {
        message += ` Dead-lettered ${body.failedCount} demo failure${body.failedCount === 1 ? "" : "s"}.`;
      }

      if (body.invalidCount > 0) {
        message += ` Rejected ${body.invalidCount} invalid message${body.invalidCount === 1 ? "" : "s"}.`;
      }

      return message;
    }, "Unable to process widgets.");
  }

  async function deleteWidgets() {
    const confirmed = window.confirm("Delete all widget rows and purge the widget RabbitMQ queues?");

    if (!confirmed) {
      return;
    }

    await runWidgetAction(async () => {
      const response = await csrfFetch("/widgets", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to delete widgets"));
      }

      setQueueState((await response.json()) as WidgetQueueState);
      return "Deleted all widget rows and purged widget queues.";
    }, "Unable to delete widgets.");
  }

  async function handleDeadLetterAction(messageId: string, action: "repair" | "replay") {
    await runWidgetAction(async () => {
      const response = await csrfFetch(`/widgets/dead-letter/${encodeURIComponent(messageId)}/${action}`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await readError(response, `Unable to ${action} dead-letter message`));
      }

      await loadWidgets();
      return action === "repair" ? "Repaired and replayed dead-letter message." : "Replayed dead-letter message.";
    }, `Unable to ${action} dead-letter message.`);
  }

  async function runWidgetAction(action: () => Promise<string>, fallback: string) {
    setFormState({ status: "submitting" });

    try {
      const message = await action();
      setFormState({ status: "success", message });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : fallback
      });
    }
  }

  return (
    <div className="demo-panel queue-panel">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <p className="platform-kicker">Reliable messaging</p>
          <h1 className="h3 mb-2">Messaging with RabbitMQ + Retries & Dead Letter Queue</h1>
          <p className="text-muted mb-0">
            This demonstration uses RabbitMQ as the work queue and SQL Server as the visible state store.
            Creating widgets inserts rows into dbo.WidgetQueueDemo with a status of queued, then publishes
            durable widget.processing_requested.v1 messages to the cm.widget exchange, which routes them
            into the cm.widget.processing queue. The process buttons pull messages from that queue,
            validate the payload, update the matching SQL row, and ack successful messages so RabbitMQ
            removes them. Failed messages move first to a delayed retry queue, where RabbitMQ holds them
            briefly before routing them back to the main processing queue. If a retried message fails
            again, it is rejected without requeueing and sent to cm.widget.processing.dlq, where it can be
            replayed or repaired.
          </p>
        </div>
      </div>

      <div className="messaging-notes mb-4">
        <h2 className="h6 mb-2">Important Notes</h2>
        <ol className="mb-0 text-muted">
          <li>
            These demo queues are shared globally. If more than one visitor uses the demo at the same
            time, one visitor may see or process messages created by another visitor. This behavior is
            known and accepted for this portfolio demo.
          </li>
          <li>Start with an empty queue. Use the Delete All Widgets button if necessary.</li>
          <li>Note the five metrics displayed; they all begin at zero.</li>
          <li>Use the Create 5 button to publish five messages to the queue.</li>
          <li>
            Use the Process All button, and then immediately begin clicking the Refresh button about once
            every second for about 10 seconds. As you click Refresh, note the values of the five metrics.
            This will help you see and understand the retry capabilities of the queue.
          </li>
          <li>Note there are no rows in the DLQ at this time.</li>
          <li>
            Use the Process All button to retry any failures. Because this demo supports a single retry,
            this time the failures will land in the DLQ.
          </li>
          <li>
            Looking at the DLQ, you can choose Replay followed by the Process All button, which will
            publish the same broken message. This action does not qualify the message for another retry.
          </li>
          <li>
            Returning to the DLQ, you can also choose Repair followed by the Process All button. This
            allows the message to be processed successfully.
          </li>
        </ol>
      </div>

      <StatusMessage state={formState} />

      <div className="row g-3 mb-4">
        <MetricCard label="RabbitMQ messages" value={queueState.rabbitMqMessageCount} />
        <MetricCard label="Retry messages" value={queueState.rabbitMqRetryMessageCount} />
        <MetricCard label="DLQ messages" value={queueState.rabbitMqDeadLetterMessageCount} />
        <MetricCard label="Queued / Retrying" value={`${queuedCount} / ${retryingCount}`} />
        <MetricCard label="Processed / Failed" value={`${processedCount} / ${failedCount}`} />
      </div>

      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-outline-secondary" type="button" onClick={() => void loadWidgets()} disabled={isSubmitting}>
            Refresh
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void createWidgets(1)} disabled={isSubmitting}>
            Create 1
          </button>
          <button className="btn btn-primary" type="button" onClick={() => void createWidgets(5)} disabled={isSubmitting}>
            Create 5
          </button>
          <button className="btn btn-outline-primary" type="button" onClick={() => void processWidgets(1)} disabled={isSubmitting}>
            Process 1
          </button>
          <button className="btn btn-outline-primary" type="button" onClick={() => void processWidgets(5)} disabled={isSubmitting}>
            Process 5
          </button>
          <button className="btn btn-outline-primary" type="button" onClick={() => void processWidgets()} disabled={isSubmitting}>
            Process All
          </button>
        </div>
        <button className="btn btn-outline-danger ms-sm-auto" type="button" onClick={() => void deleteWidgets()} disabled={isSubmitting}>
          Delete All Widgets
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-sm table-striped widget-table widget-main-table">
          <thead>
            <tr>
              <th className="widget-col-id">ID</th>
              <th>Name</th>
              <th className="widget-col-status">Status</th>
              <th className="widget-col-count">Count</th>
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
                  <td>{widget.processCount}</td>
                  <td>{formatDate(widget.createdAt)}</td>
                  <td>{widget.processedAt ? formatDate(widget.processedAt) : ""}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-muted">
                  No widgets yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="h5 mt-4 mb-2">Dead Letter Queue</h2>
      <p className="text-muted">
        Widgets with IDs divisible by 3 fail once into delayed retry. If they fail again, they land
        here. Replay republishes the same work; repair republishes it with a repair flag so it can
        succeed.
      </p>
      <div className="table-responsive">
        <table className="table table-sm table-striped widget-table widget-dead-letter-table">
          <thead>
            <tr>
              <th className="widget-col-id">Widget ID</th>
              <th>Name</th>
              <th className="widget-col-status">Status</th>
              <th className="widget-col-count" aria-label="Count spacer"></th>
              <th className="widget-col-date">Requested</th>
              <th className="widget-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {queueState.deadLetterMessages.length ? (
              queueState.deadLetterMessages.map((message) => (
                <tr key={message.messageId}>
                  <td>{message.widgetId}</td>
                  <td>{message.widgetName}</td>
                  <td>
                    <span className="badge text-bg-danger">dead-letter</span>
                  </td>
                  <td></td>
                  <td>{formatDate(message.requestedAt)}</td>
                  <td>
                    <div className="d-flex flex-wrap gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        type="button"
                        onClick={() => void handleDeadLetterAction(message.messageId, "replay")}
                        disabled={isSubmitting}
                      >
                        Replay
                      </button>
                      <button
                        className="btn btn-sm btn-outline-primary"
                        type="button"
                        onClick={() => void handleDeadLetterAction(message.messageId, "repair")}
                        disabled={isSubmitting}
                      >
                        Repair
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="text-muted">
                  No dead-letter messages.
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

function StatusBadge({ status }: { status: WidgetStatus }) {
  const badgeClass =
    status === "processed"
      ? "text-bg-success"
      : status === "failed"
        ? "text-bg-danger"
        : status === "processing"
          ? "text-bg-primary"
          : status === "retrying"
            ? "text-bg-warning"
            : "text-bg-secondary";

  return <span className={`badge ${badgeClass}`}>{status}</span>;
}
