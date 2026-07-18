import { useEffect, useState } from "react";
import type { FormEvent } from "react";

type FormStatus = "idle" | "submitting" | "success" | "error";

type FormState = {
  status: FormStatus;
  message?: string;
};

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

let csrfToken: string | null = null;

export function TopicRouting() {
  const [topicRoutingState, setTopicRoutingState] = useState<TopicRoutingState>(emptyTopicRoutingState);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    void loadTopicRouting();
  }, []);

  const isSubmitting = formState.status === "submitting";
  const totalMessages = topicRoutingState.queues.reduce((sum, queue) => sum + queue.messageCount, 0);
  const activeQueues = topicRoutingState.queues.filter((queue) => queue.messageCount > 0).length;
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
          <h1 className="h3 mb-2">Topic Routing with RabbitMQ</h1>
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

      <div className="row g-3 mb-4">
        <MetricCard label="Total queued copies" value={totalMessages} />
        <MetricCard label="Queues with messages" value={activeQueues} />
        <MetricCard label="Bindings" value={topicRoutingState.queues.length} />
      </div>

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

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="col-sm-6 col-lg">
      <div className="border rounded p-3 h-100">
        <div className="text-muted small">{label}</div>
        <div className="fs-3 fw-semibold">{value}</div>
      </div>
    </div>
  );
}

function StatusMessage({ state }: { state: FormState }) {
  if (state.status === "success") {
    return <div className="alert alert-success">{state.message ?? "Success."}</div>;
  }

  if (state.status === "error") {
    return <div className="alert alert-danger">{state.message ?? "Request failed."}</div>;
  }

  return null;
}

function BackToTop() {
  return (
    <div className="mobile-back-to-top">
      <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
        Back to top
      </button>
    </div>
  );
}

async function csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers);
  headers.set("x-csrf-token", token);

  return fetch(input, {
    ...init,
    headers
  });
}

async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  const response = await fetch("/auth/csrf");

  if (!response.ok) {
    throw new Error(await readError(response, "Unable to initialize request protection"));
  }

  const body = (await response.json()) as { csrfToken?: string };

  if (!body.csrfToken) {
    throw new Error("Unable to initialize request protection.");
  }

  csrfToken = body.csrfToken;
  return csrfToken;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
