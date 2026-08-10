import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { BackToTop } from "../components/BackToTop";
import { StatusMessage } from "../components/StatusMessage";
import { formatDate } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";
import type { FormState } from "../types/forms";

type TopicRoutingDemoMessage = {
  messageType: string;
  messageId: string;
  requestedAt: string;
  source: string;
  routingKey: string;
  label: string;
};

type TopicRoutingQueueOverview = {
  key: string;
  queue: string;
  bindingPattern: string;
  description: string;
  messageCount: number;
  messages: TopicRoutingDemoMessage[];
};

type TopicRoutingState = {
  sampleRoutingKeys: string[];
  queues: TopicRoutingQueueOverview[];
};

const fallbackTopicRoutingSampleKeys = [
  "email.verification.requested.v1",
  "email.password_reset.requested.v1",
  "widget.created.v1",
  "widget.important.v1",
  "billing.invoice.paid.v1"
];

const emptyTopicRoutingState: TopicRoutingState = {
  sampleRoutingKeys: [],
  queues: []
};

export function TopicRouting() {
  const [topicRoutingState, setTopicRoutingState] = useState<TopicRoutingState>(emptyTopicRoutingState);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    void loadTopicRouting();
  }, []);

  const isSubmitting = formState.status === "submitting";
  const routingKeys = topicRoutingState.sampleRoutingKeys.length
    ? topicRoutingState.sampleRoutingKeys
    : fallbackTopicRoutingSampleKeys;

  async function loadTopicRouting() {
    try {
      const response = await fetch("/topic-routing");

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load topic routing demo"));
      }

      setTopicRoutingState((await response.json()) as TopicRoutingState);
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load topic routing demo."
      });
    }
  }

  async function publishTopicRoutingEvent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const selectedRoutingKey = String(formData.get("routingKey") ?? "").trim();

    if (!selectedRoutingKey) {
      setFormState({
        status: "error",
        message: "Choose a routing key before publishing a topic routing event."
      });
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/topic-routing", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ routingKey: selectedRoutingKey })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to publish topic routing event"));
      }

      setTopicRoutingState((await response.json()) as TopicRoutingState);
      setFormState({
        status: "success",
        message: `Published ${selectedRoutingKey}. RabbitMQ copied it into each queue with a matching binding pattern.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to publish topic routing event."
      });
    }
  }

  async function purgeTopicRoutingQueues() {
    const confirmed = window.confirm("Purge all topic routing demo queues?");

    if (!confirmed) {
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/topic-routing", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to purge topic routing queues"));
      }

      setTopicRoutingState((await response.json()) as TopicRoutingState);
      setFormState({
        status: "success",
        message: "Purged all topic routing demo queues."
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to purge topic routing queues."
      });
    }
  }

  return (
    <div className="demo-panel queue-panel">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div className="rabbitmq-demo-copy">
          <p className="platform-kicker">Exchange routing pattern</p>
          <h1 className="h3 mb-2">Topic Routing</h1>
          <p className="text-muted mb-0">
            This demonstration publishes one durable event to the <code>cm.topic-demo</code> topic exchange
            with a routing key such as <code>widget.important.v1</code>. RabbitMQ compares that routing key
            to each queue binding pattern, then copies the message into every matching queue. The producer
            only describes the event; the queue bindings decide which consumers would receive it.
          </p>
        </div>
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
          <li>An exchange receives published messages and decides which queues should receive them.</li>
          <li>Producers publish to an exchange with a routing key; they do not need to know every queue.</li>
          <li>Queue bindings connect queues to an exchange and define the matching rules.</li>
          <li>
            A topic exchange uses binding patterns with <code>*</code> and <code>#</code> to match routing keys.
          </li>
          <li>One published message can be copied into multiple queues when multiple bindings match.</li>
        </ul>
      </div>

      <StatusMessage state={formState} />
      <TopicRoutingGuide topicRoutingState={topicRoutingState} />

      <form className="row g-2 align-items-end mb-4" onSubmit={(event) => void publishTopicRoutingEvent(event)}>
        <div className="col-12 col-lg">
          <label className="form-label" htmlFor="topic-routing-key">
            Routing key
          </label>
          <select className="form-select" id="topic-routing-key" name="routingKey" disabled={isSubmitting}>
            {routingKeys.map((routingKey) => (
              <option value={routingKey} key={routingKey}>
                {routingKey}
              </option>
            ))}
          </select>
        </div>
        <div className="col-12 col-sm-auto">
          <button className="btn btn-primary w-100" type="submit" disabled={isSubmitting}>
            Publish Event
          </button>
        </div>
        <div className="col-12 col-sm-auto ms-sm-auto">
          <button
            className="btn btn-outline-danger w-100"
            type="button"
            onClick={() => void purgeTopicRoutingQueues()}
            disabled={isSubmitting}
          >
            Purge Queues
          </button>
        </div>
      </form>

      <div className="topic-routing-grid">
        {topicRoutingState.queues.length ? (
          topicRoutingState.queues.map((queue) => <TopicRoutingQueueCard queue={queue} key={queue.key} />)
        ) : (
          <div className="text-muted">No topic routing queues loaded.</div>
        )}
      </div>

      <BackToTop />
    </div>
  );
}

function TopicRoutingGuide({ topicRoutingState }: { topicRoutingState: TopicRoutingState }) {
  const latestMessage = findLatestTopicRoutingMessage(topicRoutingState);
  const matchedQueues = latestMessage
    ? topicRoutingState.queues.filter((queue) => queue.messages.some((message) => message.messageId === latestMessage.messageId))
    : [];
  const totalQueuedCopies = topicRoutingState.queues.reduce((sum, queue) => sum + queue.messageCount, 0);
  const activeQueueCount = topicRoutingState.queues.filter((queue) => queue.messageCount > 0).length;
  const hasQueues = topicRoutingState.queues.length > 0;
  const hasPublishedEvent = Boolean(latestMessage);

  const steps: TopicRoutingStep[] = [
    {
      label: "Choose key",
      detail: "Pick a routing key that describes the event, not a destination queue.",
      status: hasPublishedEvent ? "complete" : "active"
    },
    {
      label: "Publish event",
      detail: latestMessage
        ? `${latestMessage.routingKey} was published to the cm.topic-demo exchange.`
        : "Use Publish Event to send one durable message to the topic exchange.",
      status: hasPublishedEvent ? "complete" : "pending"
    },
    {
      label: "Match bindings",
      detail: hasPublishedEvent
        ? `${matchedQueues.length} binding${matchedQueues.length === 1 ? "" : "s"} matched: ${matchedQueues.map((queue) => queue.key).join(", ") || "none"}.`
        : `${hasQueues ? topicRoutingState.queues.length : 0} binding${topicRoutingState.queues.length === 1 ? "" : "s"} are ready to evaluate the routing key.`,
      status: hasPublishedEvent ? "complete" : hasQueues ? "pending" : "active"
    },
    {
      label: "Inspect copies",
      detail: hasPublishedEvent
        ? `${totalQueuedCopies} queued cop${totalQueuedCopies === 1 ? "y" : "ies"} across ${activeQueueCount} queue${activeQueueCount === 1 ? "" : "s"}. Review the matching queue cards below.`
        : "Matching queues will show their own copy of the published message.",
      status: hasPublishedEvent ? "complete" : "pending"
    }
  ];

  return (
    <section className="worker-run-panel mb-4" aria-label="Topic routing progress">
      <div className="worker-run-summary">
        <div>
          <h2 className="h6 mb-1">Topic routing status</h2>
          <p className="text-muted mb-0">
            Topic exchanges route by pattern. The publisher names the event, and queue bindings decide who receives a copy.
          </p>
        </div>
        <span className={`worker-run-state ${hasPublishedEvent ? "complete" : "active"}`}>
          {hasPublishedEvent ? "Routed" : "Ready"}
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

type TopicRoutingStep = {
  label: string;
  detail: string;
  status: "pending" | "active" | "complete";
};

function findLatestTopicRoutingMessage(state: TopicRoutingState): TopicRoutingDemoMessage | null {
  return state.queues
    .flatMap((queue) => queue.messages)
    .reduce<TopicRoutingDemoMessage | null>(
      (latest, message) => !latest || message.requestedAt > latest.requestedAt ? message : latest,
      null
    );
}

function TopicRoutingQueueCard({ queue }: { queue: TopicRoutingQueueOverview }) {
  return (
    <section className="topic-routing-card">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
        <div>
          <h2 className="h6 mb-1">{queue.key}</h2>
          <div className="text-muted small">{queue.queue}</div>
        </div>
        <span className="badge text-bg-secondary">{queue.messageCount}</span>
      </div>
      <dl className="row small mb-3">
        <dt className="col-sm-4">Binding</dt>
        <dd className="col-sm-8">
          <code>{queue.bindingPattern}</code>
        </dd>
        <dt className="col-sm-4">Purpose</dt>
        <dd className="col-sm-8">{queue.description}</dd>
      </dl>
      <div className="table-responsive">
        <table className="table table-sm mb-0 topic-routing-table">
          <thead>
            <tr>
              <th>Routing Key</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            {queue.messages.length ? (
              queue.messages.map((message) => (
                <tr key={message.messageId}>
                  <td>
                    <code>{message.routingKey}</code>
                  </td>
                  <td>{formatDate(message.requestedAt)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="text-muted">
                  No messages.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
