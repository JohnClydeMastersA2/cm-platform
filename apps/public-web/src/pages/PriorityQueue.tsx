import { useEffect, useState } from "react";
import { BackToTop } from "../components/BackToTop";
import { StatusMessage } from "../components/StatusMessage";
import { formatDate } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";
import type { FormState } from "../types/forms";

type PriorityQueueLevel = {
  label: string;
  priority: number;
};

type PriorityQueueMessage = {
  messageType: string;
  messageId: string;
  requestedAt: string;
  source: string;
  jobName: string;
  publishSequence: number;
  priority: number;
};

type ProcessedPriorityQueueMessage = PriorityQueueMessage & {
  processedSequence: number;
  processedAt: string;
};

type PriorityQueueState = {
  levels: PriorityQueueLevel[];
  queue: {
    messageCount: number;
  };
  publishedMessages: PriorityQueueMessage[];
  processedMessages: ProcessedPriorityQueueMessage[];
};

const emptyPriorityQueueState: PriorityQueueState = {
  levels: [],
  queue: {
    messageCount: 0
  },
  publishedMessages: [],
  processedMessages: []
};

export function PriorityQueue() {
  const [priorityQueueState, setPriorityQueueState] = useState<PriorityQueueState>(emptyPriorityQueueState);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [priorityRun, setPriorityRun] = useState<PriorityRunState | null>(null);

  useEffect(() => {
    void loadPriorityQueue();
  }, []);

  const isSubmitting = formState.status === "submitting";

  async function loadPriorityQueue(): Promise<PriorityQueueState | null> {
    try {
      const response = await fetch("/priority-queue");

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load priority queue demo"));
      }

      const nextState = (await response.json()) as PriorityQueueState;
      setPriorityQueueState(nextState);
      updatePriorityRun(nextState);
      return nextState;
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load priority queue demo."
      });
      return null;
    }
  }

  async function publishPriorityQueueJob(priority: number) {
    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/priority-queue", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ priority })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to publish priority queue job"));
      }

      const nextState = (await response.json()) as PriorityQueueState;
      const publishedMessage = findLatestPublishedMessage(nextState);

      setPriorityQueueState(nextState);
      setPriorityRun({
        kind: "published",
        messageId: publishedMessage?.messageId ?? null,
        jobName: publishedMessage?.jobName ?? `Priority ${priority} job`,
        priority,
        submittedAt: new Date().toISOString(),
        status: "waiting"
      });
      setFormState({
        status: "success",
        message: `Published priority ${priority} job.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to publish priority queue job."
      });
    }
  }

  async function processPriorityQueue(count: number) {
    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/priority-queue/process", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ count })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to process priority queue jobs"));
      }

      const body = (await response.json()) as PriorityQueueState & { processedCount: number };
      setPriorityQueueState(body);
      updatePriorityRun(body, body.processedCount);
      setFormState({
        status: "success",
        message: `Processed ${body.processedCount} priority queue job${body.processedCount === 1 ? "" : "s"}.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to process priority queue jobs."
      });
    }
  }

  async function purgePriorityQueue() {
    const confirmed = window.confirm("Purge the priority queue and clear processed history?");

    if (!confirmed) {
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/priority-queue", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to purge priority queue"));
      }

      setPriorityQueueState((await response.json()) as PriorityQueueState);
      setPriorityRun(null);
      setFormState({
        status: "success",
        message: "Purged priority queue and cleared processed history."
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to purge priority queue."
      });
    }
  }

  function updatePriorityRun(nextState: PriorityQueueState, processedCount?: number) {
    setPriorityRun((current) => {
      if (!current?.messageId) {
        return current;
      }

      const processedMessage = nextState.processedMessages.find((message) => message.messageId === current.messageId);

      if (processedMessage) {
        return {
          ...current,
          status: "processed",
          processedSequence: processedMessage.processedSequence
        };
      }

      if (typeof processedCount === "number" && processedCount > 0) {
        return {
          ...current,
          status: "waiting"
        };
      }

      return current;
    });
  }

  return (
    <div className="demo-panel queue-panel">
      <div className="mb-4 rabbitmq-demo-copy">
        <p className="platform-kicker">Priority messaging</p>
        <h1 className="h3 mb-2">Priority Queue</h1>
        <p className="text-muted mb-0">
          This demonstration uses one RabbitMQ queue declared with <code>x-max-priority</code>. Publishing
          assigns each job a priority number, and RabbitMQ prefers higher-priority waiting messages when
          the process buttons pull work from the queue. Priority only affects messages still waiting in the
          queue; work already delivered to a consumer is not taken back.
        </p>
        <p className="text-muted mb-0 mt-2">
          <code>x-max-priority</code> is a queue argument that enables priority handling for that queue and
          defines the highest supported priority value. In this demo, the queue supports priorities from 0
          through 10; each published message sets its own priority, and RabbitMQ uses those values when
          choosing the next waiting message to deliver.
        </p>
      </div>

      <div className="messaging-notes mb-4">
        <h2 className="h6 mb-2">Important Notes</h2>
        <ul className="mb-0 text-muted">
          <li>
            These RabbitMQ demos intentionally use shared global queues and disposable shared demo state. If
            multiple visitors use them at the same time, one visitor may process, purge, or change messages
            created by another visitor. We know about this behavior and accepted it for this portfolio slice
            because the goal is to demonstrate real queue behavior without adding the extra complexity of
            fully isolated per-user demo queues.
          </li>
          <li>
            <code>x-max-priority</code> is set on the queue, not the exchange.
          </li>
          <li>It must be declared when the queue is created.</li>
          <li>RabbitMQ rejects conflicting declarations if the queue already exists without that argument.</li>
          <li>Higher number means higher priority.</li>
          <li>Priority only affects messages still waiting in the queue; delivered messages are not taken back from consumers.</li>
        </ul>
      </div>

      <StatusMessage state={formState} />
      <PriorityRunPanel priorityRun={priorityRun} queueState={priorityQueueState} />

      <div className="d-flex flex-wrap gap-2 mb-4">
        <div className="d-flex flex-wrap gap-2">
          {priorityQueueState.levels.map((level) => (
            <button
              className={`btn ${priorityButtonClass(level.priority)}`}
              type="button"
              onClick={() => void publishPriorityQueueJob(level.priority)}
              disabled={isSubmitting}
              key={level.priority}
            >
              Publish {level.label}
            </button>
          ))}
          <button className="btn btn-outline-primary" type="button" onClick={() => void processPriorityQueue(1)} disabled={isSubmitting}>
            Process 1
          </button>
          <button className="btn btn-outline-primary" type="button" onClick={() => void processPriorityQueue(5)} disabled={isSubmitting}>
            Process 5
          </button>
        </div>
        <button className="btn btn-outline-danger ms-sm-auto" type="button" onClick={() => void purgePriorityQueue()} disabled={isSubmitting}>
          Purge Queue
        </button>
      </div>

      <div className="row g-4">
        <div className="col-12 col-xl-6">
          <h2 className="h5 mb-2">Published Order</h2>
          <div className="table-responsive">
            <table className="table table-sm table-striped priority-queue-table mobile-card-table">
              <thead>
                <tr>
                  <th>Published #</th>
                  <th>Priority</th>
                  <th>Job</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {priorityQueueState.publishedMessages.length ? (
                  priorityQueueState.publishedMessages.map((message) => (
                    <tr key={message.messageId}>
                      <td data-label="Published #">{message.publishSequence}</td>
                      <td data-label="Priority">
                        <PriorityBadge priority={message.priority} />
                      </td>
                      <td data-label="Job">{message.jobName}</td>
                      <td data-label="Published">{formatDate(message.requestedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="text-muted">
                      No published messages.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-12 col-xl-6">
          <h2 className="h5 mb-2">Processed Order</h2>
          <div className="table-responsive">
            <table className="table table-sm table-striped priority-queue-table mobile-card-table">
              <thead>
                <tr>
                  <th>Processed #</th>
                  <th>Published #</th>
                  <th>Priority</th>
                  <th>Job</th>
                  <th>Processed</th>
                </tr>
              </thead>
              <tbody>
                {priorityQueueState.processedMessages.length ? (
                  priorityQueueState.processedMessages.map((message) => (
                    <tr key={message.messageId}>
                      <td data-label="Processed #">{message.processedSequence}</td>
                      <td data-label="Published #">{message.publishSequence}</td>
                      <td data-label="Priority">
                        <PriorityBadge priority={message.priority} />
                      </td>
                      <td data-label="Job">{message.jobName}</td>
                      <td data-label="Processed">{formatDate(message.processedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-muted">
                      No processed messages.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <BackToTop />
    </div>
  );
}

type PriorityRunState = {
  kind: "published";
  messageId: string | null;
  jobName: string;
  priority: number;
  submittedAt: string;
  status: "waiting" | "processed";
  processedSequence?: number;
};

function PriorityRunPanel({
  priorityRun,
  queueState
}: {
  priorityRun: PriorityRunState | null;
  queueState: PriorityQueueState;
}) {
  if (!priorityRun) {
    return null;
  }

  const waitingMessages = queueState.queue.messageCount;
  const isProcessed = priorityRun.status === "processed";
  const messageLabel = priorityRun.messageId ? priorityRun.messageId.slice(0, 8) : "latest";

  const steps: PriorityRunStep[] = [
    {
      label: "Published",
      detail: `${priorityRun.jobName} (${messageLabel}) entered the priority queue.`,
      status: "complete"
    },
    {
      label: "Waiting",
      detail: `${waitingMessages} message${waitingMessages === 1 ? "" : "s"} currently waiting. Higher priorities are selected first. Use the Process buttons to advance the message processing.`,
      status: isProcessed ? "complete" : "active"
    },
    {
      label: "Selected",
      detail: isProcessed
        ? `RabbitMQ delivered this job as processed #${priorityRun.processedSequence}.`
        : "Click a Process button to let RabbitMQ choose the next waiting job.",
      status: isProcessed ? "complete" : "pending"
    },
    {
      label: "Compare order",
      detail: "Use the Published Order and Processed Order tables to see priority outrank publish order.",
      status: isProcessed ? "complete" : "pending"
    }
  ];

  return (
    <section className="worker-run-panel mb-4" aria-label="Priority queue progress">
      <div className="worker-run-summary">
        <div>
          <h2 className="h6 mb-1">Priority queue status</h2>
          <p className="text-muted mb-0">
            Priority affects messages still waiting in RabbitMQ. A lower-priority job can wait while newer urgent work is selected first.
          </p>
        </div>
        <span className={`worker-run-state ${isProcessed ? "complete" : "active"}`}>
          {isProcessed ? "Processed" : "Waiting"}
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

type PriorityRunStep = {
  label: string;
  detail: string;
  status: "pending" | "active" | "complete";
};

function findLatestPublishedMessage(state: PriorityQueueState): PriorityQueueMessage | null {
  return state.publishedMessages.reduce<PriorityQueueMessage | null>(
    (latest, message) => !latest || message.publishSequence > latest.publishSequence ? message : latest,
    null
  );
}

function PriorityBadge({ priority }: { priority: number }) {
  const badgeClass = priority >= 9 ? "text-bg-danger" : priority >= 5 ? "text-bg-warning" : "text-bg-secondary";

  return <span className={`badge ${badgeClass}`}>{priority}</span>;
}

function priorityButtonClass(priority: number): string {
  if (priority >= 9) {
    return "btn-danger";
  }

  if (priority >= 5) {
    return "btn-warning";
  }

  return "btn-primary";
}
