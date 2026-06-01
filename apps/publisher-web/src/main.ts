import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";

type Page = "iam" | "login" | "register" | "account" | "widgets" | "competing-consumers" | "topic-routing" | "priority-queue";
type FormStatus = "idle" | "submitting" | "success" | "error";
type SidebarSection = "identity" | "account" | "messaging";

type AuthAccount = {
  accountId: number;
  emailAddress: string;
  emailVerifiedAt: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type AuthSession = {
  authSessionId: number;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
};

type FormState = {
  status: FormStatus;
  message?: string;
};

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

type WidgetQueueState = {
  widgets: Widget[];
  rabbitMqMessageCount: number;
  rabbitMqRetryMessageCount: number;
  rabbitMqDeadLetterMessageCount: number;
  deadLetterMessages: WidgetDeadLetterMessage[];
};

type WidgetDeadLetterMessage = {
  messageId: string;
  requestedAt: string;
  source: string;
  widgetId: number;
  widgetName: string;
  repairAttempt: boolean;
};

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

let account: AuthAccount | null = null;
let authSession: AuthSession | null = null;
let currentPage: Page | null = null;
let sidebarSectionsOpen: Record<SidebarSection, boolean> = {
  identity: true,
  account: true,
  messaging: true,
};
let widgetQueueState: WidgetQueueState = {
  widgets: [],
  rabbitMqMessageCount: 0,
  rabbitMqRetryMessageCount: 0,
  rabbitMqDeadLetterMessageCount: 0,
  deadLetterMessages: [],
};
let widgetConsumerQueueState: WidgetConsumerQueueState = {
  widgets: [],
  rabbitMqMessageCount: 0,
  processedBy: {},
};
let topicRoutingState: TopicRoutingState = {
  sampleRoutingKeys: [],
  queues: [],
};
let priorityQueueState: PriorityQueueState = {
  levels: [],
  queue: {
    messageCount: 0,
  },
  publishedMessages: [],
  processedMessages: [],
};

const loginState: FormState = { status: "idle" };
const registerState: FormState = { status: "idle" };
const accountState: FormState = { status: "idle" };
const widgetState: FormState = { status: "idle" };
const widgetConsumerState: FormState = { status: "idle" };
const topicRoutingFormState: FormState = { status: "idle" };
const priorityQueueFormState: FormState = { status: "idle" };

function getCurrentPage(): Page {
  const hash = window.location.hash.replace("#", "");

  if (hash === "iam") return "iam";
  if (hash === "register") return "register";
  if (hash === "account") return "account";
  if (hash === "widgets") return "widgets";
  if (hash === "competing-consumers") return "competing-consumers";
  if (hash === "topic-routing") return "topic-routing";
  if (hash === "priority-queue") return "priority-queue";

  return "login";
}

function layout(content: string): string {
  const identityOpen = sidebarSectionsOpen.identity;
  const accountOpen = sidebarSectionsOpen.account;
  const messagingOpen = sidebarSectionsOpen.messaging;

  return `
    <div class="publisher-shell">
      <aside class="publisher-sidebar">
        <div class="publisher-sidebar-header">
          <a class="publisher-brand" href="#iam">Publisher Portal</a>
          <button
            class="btn btn-sm btn-outline-light d-lg-none"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#publisherSidebarNav"
            aria-controls="publisherSidebarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            Menu
          </button>
        </div>

        <div class="collapse d-lg-block" id="publisherSidebarNav">
          <nav class="publisher-nav">
            <button
              class="publisher-nav-toggle ${identityOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#identityAccessNav"
              aria-expanded="${identityOpen ? "true" : "false"}"
              aria-controls="identityAccessNav"
            >
              Identity and Access
            </button>
            <div class="collapse ${identityOpen ? "show" : ""}" id="identityAccessNav">
              <div class="publisher-nav-group">
                <a class="publisher-nav-link" href="#iam">Overview</a>
                <a class="publisher-nav-link" href="#register">Create Account</a>
                <a class="publisher-nav-link" href="#login">Login</a>
              </div>
            </div>

            <button
              class="publisher-nav-toggle ${accountOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#myAccountNav"
              aria-expanded="${accountOpen ? "true" : "false"}"
              aria-controls="myAccountNav"
            >
              My Account
            </button>
            <div class="collapse ${accountOpen ? "show" : ""}" id="myAccountNav">
              <div class="publisher-nav-group">
                <a class="publisher-nav-link" href="#account">Session State</a>
              </div>
            </div>

            <button
              class="publisher-nav-toggle ${messagingOpen ? "" : "collapsed"}"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#queueDemosNav"
              aria-expanded="${messagingOpen ? "true" : "false"}"
              aria-controls="queueDemosNav"
            >
              Messaging with RabbitMQ
            </button>
            <div class="collapse ${messagingOpen ? "show" : ""}" id="queueDemosNav">
              <div class="publisher-nav-group">
                <a class="publisher-nav-link" href="#widgets">Queue Basics, Retry and DLQs</a>
                <a class="publisher-nav-link" href="#competing-consumers">Competing Consumers</a>
                <a class="publisher-nav-link" href="#topic-routing">Topic Routing</a>
                <a class="publisher-nav-link" href="#priority-queue">Priority Queue</a>
              </div>
            </div>
          </nav>
        </div>
      </aside>

      <main class="publisher-main">
        ${content}
      </main>
    </div>
  `;
}

function iamPage(): string {
  return `
    <div class="auth-panel auth-panel-wide">
      <h1 class="h3 mb-2">Identity and Access</h1>
      <p class="text-muted">
        This area collects the account, authentication, verification, and future authorization capabilities for Publisher Portal.
      </p>

      <div class="list-group mb-4">
        <a class="list-group-item list-group-item-action" href="#register">
          <div class="fw-semibold">Create Account</div>
          <div class="text-muted">Create an account using an email address and password.</div>
        </a>
        <a class="list-group-item list-group-item-action" href="#login">
          <div class="fw-semibold">Login</div>
          <div class="text-muted">Authenticate with a password and establish an HTTP-only session cookie.</div>
        </a>
        <a class="list-group-item list-group-item-action" href="#account">
          <div class="fw-semibold">My Account</div>
          <div class="text-muted">Inspect the current authenticated session and account verification state.</div>
        </a>
      </div>

      <p class="mb-0 text-muted">
        Planned additions include password recovery, email-based verification challenges, authenticator app support, OAuth login, and RBAC.
      </p>
    </div>
  `;
}

function widgetsPage(): string {
  const isSubmitting = widgetState.status === "submitting";
  const queuedCount = widgetQueueState.widgets.filter((widget) => widget.status === "queued").length;
  const retryingCount = widgetQueueState.widgets.filter((widget) => widget.status === "retrying").length;
  const processedCount = widgetQueueState.widgets.filter((widget) => widget.status === "processed").length;
  const failedCount = widgetQueueState.widgets.filter((widget) => widget.status === "failed").length;

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-2">Messaging with RabbitMQ + Retries & Dead Letter Queue</h1>
          <p class="text-muted mb-0">
            This demonstration uses RabbitMQ as the work queue and SQL Server as the visible state store. Creating widgets inserts rows into dbo.WidgetQueueDemo with a status of queued, then publishes durable widget.processing_requested.v1 messages to the cm.widget exchange, which routes them into the cm.widget.processing queue. The process buttons pull messages from that queue, validate the payload, update the matching SQL row, and ack successful messages so RabbitMQ removes them. Failed messages move first to a delayed retry queue, where RabbitMQ holds them briefly before routing them back to the main processing queue. If a retried message fails again, it is rejected without requeueing and sent to cm.widget.processing.dlq, where it can be replayed or repaired.
          </p>
        </div>
        <button class="btn btn-outline-secondary" type="button" data-action="refresh-widgets" ${isSubmitting ? "disabled" : ""}>
          Refresh
        </button>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ol class="mb-0 text-muted">
          <li>Start with an empty queue. Use the Delete All Widgets button if necessary.</li>
          <li>Note the five metrics displayed; they all begin at zero.</li>
          <li>Use the Create 5 button to publish five messages to the queue.</li>
          <li>Use the Process All button, and then immediately begin clicking the Refresh button about once every second for about 10 seconds. As you click Refresh, note the values of the five metrics. This will help you see and understand the retry capabilities of the queue.</li>
          <li>Note there are no rows in the DLQ at this time.</li>
          <li>Use the Process All button to retry any failures. Because this demo supports a single retry, this time the failures will land in the DLQ.</li>
          <li>Looking at the DLQ, you can choose Replay followed by the Process All button, which will publish the same broken message. This action does not qualify the message for another retry.</li>
          <li>Returning to the DLQ, you can also choose Repair followed by the Process All button. This allows the message to be processed successfully.</li>
        </ol>
      </div>

      ${statusMessage(widgetState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">RabbitMQ messages</div>
            <div class="fs-3 fw-semibold">${widgetQueueState.rabbitMqMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Retry messages</div>
            <div class="fs-3 fw-semibold">${widgetQueueState.rabbitMqRetryMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">DLQ messages</div>
            <div class="fs-3 fw-semibold">${widgetQueueState.rabbitMqDeadLetterMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Queued / Retrying</div>
            <div class="fs-3 fw-semibold">${queuedCount} / ${retryingCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Processed / Failed</div>
            <div class="fs-3 fw-semibold">${processedCount} / ${failedCount}</div>
          </div>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary" type="button" data-action="create-widget" data-count="1" ${isSubmitting ? "disabled" : ""}>Create 1</button>
          <button class="btn btn-primary" type="button" data-action="create-widget" data-count="5" ${isSubmitting ? "disabled" : ""}>Create 5</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-widgets" data-count="1" ${isSubmitting ? "disabled" : ""}>Process 1</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-widgets" data-count="5" ${isSubmitting ? "disabled" : ""}>Process 5</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-all-widgets" ${isSubmitting ? "disabled" : ""}>Process All</button>
        </div>
        <button class="btn btn-outline-danger ms-sm-auto" type="button" data-action="delete-widgets" ${isSubmitting ? "disabled" : ""}>Delete All Widgets</button>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped widget-table">
          <thead>
            <tr>
              <th class="widget-col-id">ID</th>
              <th>Name</th>
              <th class="widget-col-status">Status</th>
              <th class="widget-col-count">Count</th>
              <th class="widget-col-date">Created</th>
              <th class="widget-col-date">Processed</th>
            </tr>
          </thead>
          <tbody>
            ${widgetQueueState.widgets.length ? widgetRows() : `<tr><td colspan="6" class="text-muted">No widgets yet.</td></tr>`}
          </tbody>
        </table>
      </div>

      <h2 class="h5 mt-4 mb-2">Dead Letter Queue</h2>
      <p class="text-muted">
        Widgets with IDs divisible by 3 fail once into delayed retry. If they fail again, they land here. Replay republishes the same work; repair republishes it with a repair flag so it can succeed.
      </p>
      <div class="table-responsive">
        <table class="table table-sm table-striped widget-table">
          <thead>
            <tr>
              <th class="widget-col-id">Widget ID</th>
              <th>Name</th>
              <th class="widget-col-status">Status</th>
              <th class="widget-col-count" aria-label="Count spacer"></th>
              <th class="widget-col-date">Requested</th>
              <th class="widget-col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${widgetQueueState.deadLetterMessages.length ? deadLetterRows(isSubmitting) : `<tr><td colspan="6" class="text-muted">No dead-letter messages.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function competingConsumersPage(): string {
  const isSubmitting = widgetConsumerState.status === "submitting";
  const queuedCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "queued").length;
  const processingCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "processing").length;
  const processedCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "processed").length;
  const failedCount = widgetConsumerQueueState.widgets.filter((widget) => widget.status === "failed").length;

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-2">Competing Consumers with RabbitMQ</h1>
          <p class="text-muted mb-0">
            This demonstration uses one RabbitMQ queue and multiple worker instances to show competing consumers. Creating widgets writes rows into dbo.WidgetConsumerDemo with a status of queued, then publishes durable widget.consumer_demo.processing_requested.v1 messages to the cm.widget.consumer-demo exchange. Each worker consumes from the same cm.widget.consumer-demo.processing queue with prefetch set to 1, so RabbitMQ gives each message to only one available worker. A faster worker finishes and acknowledges messages sooner, making it available for more work while slower workers are still processing.
          </p>
        </div>
        <button class="btn btn-outline-secondary" type="button" data-action="refresh-consumer-widgets" ${isSubmitting ? "disabled" : ""}>
          Refresh
        </button>
      </div>

      ${statusMessage(widgetConsumerState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">RabbitMQ messages</div>
            <div class="fs-3 fw-semibold">${widgetConsumerQueueState.rabbitMqMessageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Queued / Processing</div>
            <div class="fs-3 fw-semibold">${queuedCount} / ${processingCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Processed / Failed</div>
            <div class="fs-3 fw-semibold">${processedCount} / ${failedCount}</div>
          </div>
        </div>
        ${consumerProcessedCards()}
      </div>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-primary" type="button" data-action="create-consumer-widget" data-count="10" ${isSubmitting ? "disabled" : ""}>Create 10</button>
          <button class="btn btn-primary" type="button" data-action="create-consumer-widget" data-count="25" ${isSubmitting ? "disabled" : ""}>Create 25</button>
        </div>
        <button class="btn btn-outline-danger ms-sm-auto" type="button" data-action="delete-consumer-widgets" ${isSubmitting ? "disabled" : ""}>Delete All Widgets</button>
      </div>

      <div class="table-responsive">
        <table class="table table-sm table-striped widget-table consumer-widget-table">
          <thead>
            <tr>
              <th class="widget-col-id">ID</th>
              <th>Name</th>
              <th class="widget-col-status">Status</th>
              <th class="consumer-col-worker">Processed By</th>
              <th class="consumer-col-seconds">Seconds</th>
              <th class="widget-col-date">Created</th>
              <th class="widget-col-date">Processed</th>
            </tr>
          </thead>
          <tbody>
            ${widgetConsumerQueueState.widgets.length ? consumerWidgetRows() : `<tr><td colspan="7" class="text-muted">No consumer widgets yet.</td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function topicRoutingPage(): string {
  const isSubmitting = topicRoutingFormState.status === "submitting";
  const totalMessages = topicRoutingState.queues.reduce((sum, queue) => sum + queue.messageCount, 0);
  const activeQueues = topicRoutingState.queues.filter((queue) => queue.messageCount > 0).length;

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-2">Topic Routing with RabbitMQ</h1>
          <p class="text-muted mb-0">
            This demonstration publishes one durable event to the cm.topic-demo topic exchange with a routing key such as widget.important.v1. RabbitMQ compares that routing key to each queue binding pattern, then copies the message into every matching queue. The producer only describes the event; the queue bindings decide which consumers would receive it.
          </p>
        </div>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ul class="mb-0 text-muted">
          <li>An exchange receives published messages and decides which queues should receive them.</li>
          <li>Producers publish to an exchange with a routing key; they do not need to know every queue.</li>
          <li>Queue bindings connect queues to an exchange and define the matching rules.</li>
          <li>A topic exchange uses binding patterns with * and # to match routing keys.</li>
          <li>One published message can be copied into multiple queues when multiple bindings match.</li>
        </ul>
      </div>

      ${statusMessage(topicRoutingFormState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Total queued copies</div>
            <div class="fs-3 fw-semibold">${totalMessages}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Queues with messages</div>
            <div class="fs-3 fw-semibold">${activeQueues}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Bindings</div>
            <div class="fs-3 fw-semibold">${topicRoutingState.queues.length}</div>
          </div>
        </div>
      </div>

      <form class="row g-2 align-items-end mb-4" data-form="topic-routing">
        <div class="col-12 col-lg">
          <label class="form-label">Routing key</label>
          <select class="form-select" name="routingKey">
            ${topicRoutingOptions()}
          </select>
        </div>
        <div class="col-12 col-sm-auto">
          <button class="btn btn-primary w-100" type="submit" ${isSubmitting ? "disabled" : ""}>Publish Event</button>
        </div>
        <div class="col-12 col-sm-auto ms-sm-auto">
          <button class="btn btn-outline-danger w-100" type="button" data-action="purge-topic-routing" ${isSubmitting ? "disabled" : ""}>Purge Queues</button>
        </div>
      </form>

      <div class="topic-routing-grid">
        ${topicRoutingState.queues.length ? topicRoutingQueueCards() : `<div class="text-muted">No topic routing queues loaded.</div>`}
      </div>
    </div>
  `;
}

function priorityQueuePage(): string {
  const isSubmitting = priorityQueueFormState.status === "submitting";

  return `
    <div class="auth-panel auth-panel-wide queue-panel">
      <div class="mb-4">
        <h1 class="h3 mb-2">Priority Queue with RabbitMQ</h1>
        <p class="text-muted mb-0">
          This demonstration uses one RabbitMQ queue declared with x-max-priority. Publishing assigns each job a priority number, and RabbitMQ prefers higher-priority waiting messages when the process buttons pull work from the queue. Priority only affects messages still waiting in the queue; work already delivered to a consumer is not taken back.
        </p>
        <p class="text-muted mb-0 mt-2">
          x-max-priority is a queue argument that enables priority handling for that queue and defines the highest supported priority value. In this demo, the queue supports priorities from 0 through 10; each published message sets its own priority, and RabbitMQ uses those values when choosing the next waiting message to deliver.
        </p>
      </div>

      <div class="messaging-notes mb-4">
        <h2 class="h6 mb-2">Important Notes</h2>
        <ul class="mb-0 text-muted">
          <li>x-max-priority is set on the queue, not the exchange.</li>
          <li>It must be declared when the queue is created.</li>
          <li>RabbitMQ rejects conflicting declarations if the queue already exists without that argument.</li>
          <li>Higher number means higher priority.</li>
          <li>Priority only affects messages still waiting in the queue; delivered messages are not taken back from consumers.</li>
        </ul>
      </div>

      ${statusMessage(priorityQueueFormState)}

      <div class="row g-3 mb-4">
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Waiting messages</div>
            <div class="fs-3 fw-semibold">${priorityQueueState.queue.messageCount}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Published history</div>
            <div class="fs-3 fw-semibold">${priorityQueueState.publishedMessages.length}</div>
          </div>
        </div>
        <div class="col-sm-6 col-lg">
          <div class="border rounded p-3 h-100">
            <div class="text-muted small">Processed history</div>
            <div class="fs-3 fw-semibold">${priorityQueueState.processedMessages.length}</div>
          </div>
        </div>
      </div>

      <div class="d-flex flex-wrap gap-2 mb-4">
        <div class="d-flex flex-wrap gap-2">
          ${priorityQueuePublishButtons(isSubmitting)}
          <button class="btn btn-outline-primary" type="button" data-action="process-priority-queue" data-count="1" ${isSubmitting ? "disabled" : ""}>Process 1</button>
          <button class="btn btn-outline-primary" type="button" data-action="process-priority-queue" data-count="5" ${isSubmitting ? "disabled" : ""}>Process 5</button>
        </div>
        <button class="btn btn-outline-danger ms-sm-auto" type="button" data-action="purge-priority-queue" ${isSubmitting ? "disabled" : ""}>Purge Queue</button>
      </div>

      <div class="row g-4">
        <div class="col-12 col-xl-6">
          <h2 class="h5 mb-2">Published Order</h2>
          <div class="table-responsive">
            <table class="table table-sm table-striped priority-queue-table">
              <thead>
                <tr>
                  <th>Published #</th>
                  <th>Priority</th>
                  <th>Job</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                ${priorityQueueState.publishedMessages.length ? priorityQueuePublishedRows(priorityQueueState.publishedMessages) : `<tr><td colspan="4" class="text-muted">No published messages.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="col-12 col-xl-6">
          <h2 class="h5 mb-2">Processed Order</h2>
          <div class="table-responsive">
            <table class="table table-sm table-striped priority-queue-table">
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
                ${priorityQueueState.processedMessages.length ? priorityQueueProcessedRows(priorityQueueState.processedMessages) : `<tr><td colspan="5" class="text-muted">No processed messages.</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
}

function loginPage(): string {
  const isSubmitting = loginState.status === "submitting";

  return `
    <div class="auth-panel">
      <h1 class="h3 mb-2">Login</h1>
      <p class="text-muted">Use your email address and password to access your account.</p>

      ${statusMessage(loginState)}

      <form data-form="login">
        <div class="mb-3">
          <label class="form-label">Email address</label>
          <input class="form-control" name="emailAddress" type="email" autocomplete="email" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" name="password" type="password" autocomplete="current-password" required />
        </div>

        <button class="btn btn-primary w-100" type="submit" ${isSubmitting ? "disabled" : ""}>
          ${isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <div class="mt-3 text-center">
        <a href="#register">Create account</a>
      </div>
    </div>
  `;
}

function registerPage(): string {
  const isSubmitting = registerState.status === "submitting";

  return `
    <div class="auth-panel">
      <h1 class="h3 mb-2">Create Account</h1>
      <p class="text-muted">Create an account using email address and password.</p>

      ${statusMessage(registerState)}

      <form data-form="register">
        <div class="mb-3">
          <label class="form-label">Email address</label>
          <input class="form-control" name="emailAddress" type="email" autocomplete="email" required />
        </div>

        <div class="mb-3">
          <label class="form-label">Password</label>
          <input class="form-control" name="password" type="password" minlength="8" maxlength="200" autocomplete="new-password" required />
        </div>

        <button class="btn btn-primary w-100" type="submit" ${isSubmitting ? "disabled" : ""}>
          ${isSubmitting ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div class="mt-3 text-center">
        <a href="#login">Already have an account?</a>
      </div>
    </div>
  `;
}

function accountPage(): string {
  if (!account) {
    return `
      <div class="auth-panel">
        <h1 class="h3 mb-2">Account</h1>
        <p class="text-muted">You are not logged in.</p>
        <a class="btn btn-primary w-100" href="#login">Login</a>
      </div>
    `;
  }

  return `
    <div class="auth-panel auth-panel-wide">
      <h1 class="h3 mb-2">My Account</h1>
      <p class="text-muted">This page shows the authenticated session state.</p>

      ${statusMessage(accountState)}
      ${emailVerificationNotice(account)}

      <dl class="row mb-4">
        <dt class="col-sm-4">Account ID</dt>
        <dd class="col-sm-8">${account.accountId}</dd>

        <dt class="col-sm-4">Email address</dt>
        <dd class="col-sm-8">${escapeHtml(account.emailAddress)}</dd>

        <dt class="col-sm-4">Status</dt>
        <dd class="col-sm-8">${escapeHtml(account.status)}</dd>

        <dt class="col-sm-4">Email verified</dt>
        <dd class="col-sm-8">${account.emailVerifiedAt ? "Yes" : "No"}</dd>

        <dt class="col-sm-4">Created</dt>
        <dd class="col-sm-8">${formatDate(account.createdAt)}</dd>

        <dt class="col-sm-4">Last login</dt>
        <dd class="col-sm-8">${account.lastLoginAt ? formatDate(account.lastLoginAt) : "Never"}</dd>
      </dl>

      <h2 class="h5 mb-3">Current Session</h2>
      <dl class="row mb-4">
        <dt class="col-sm-4">Session ID</dt>
        <dd class="col-sm-8">${authSession ? authSession.authSessionId : "Unknown"}</dd>

        <dt class="col-sm-4">Cookie name</dt>
        <dd class="col-sm-8">cm_session</dd>

        <dt class="col-sm-4">Created</dt>
        <dd class="col-sm-8">${authSession ? formatDate(authSession.createdAt) : "Unknown"}</dd>

        <dt class="col-sm-4">Expires</dt>
        <dd class="col-sm-8">${authSession ? formatDate(authSession.expiresAt) : "Unknown"}</dd>

        <dt class="col-sm-4">Revoked</dt>
        <dd class="col-sm-8">${authSession?.revokedAt ? formatDate(authSession.revokedAt) : "No"}</dd>

        <dt class="col-sm-4">Time remaining</dt>
        <dd class="col-sm-8">${authSession ? formatRelativeExpiration(authSession.expiresAt) : "Unknown"}</dd>
      </dl>

      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary" type="button" data-action="logout">Logout</button>
        <button class="btn btn-outline-danger ms-auto" type="button" data-action="delete-account">
          Delete Account
        </button>
      </div>
    </div>
  `;
}

function statusMessage(state: FormState): string {
  if (state.status === "success") {
    return `<div class="alert alert-success">${escapeHtml(state.message ?? "Success.")}</div>`;
  }

  if (state.status === "error") {
    return `<div class="alert alert-danger">${escapeHtml(state.message ?? "Request failed.")}</div>`;
  }

  return "";
}

function emailVerificationNotice(authAccount: AuthAccount): string {
  if (authAccount.emailVerifiedAt) {
    return "";
  }

  return `
    <div class="alert alert-warning">
      Your email address has not been verified yet. Check your email for the verification link.
    </div>
  `;
}

function resetFormState(state: FormState): void {
  state.status = "idle";
  state.message = undefined;
}

function resetStateForPageChange(nextPage: Page): void {
  if (currentPage === nextPage) {
    return;
  }

  if (nextPage !== "login") {
    resetFormState(loginState);
  }

  if (nextPage !== "register") {
    resetFormState(registerState);
  }

  if (nextPage !== "account") {
    resetFormState(accountState);
  }

  if (nextPage !== "widgets") {
    resetFormState(widgetState);
  }

  if (nextPage !== "competing-consumers") {
    resetFormState(widgetConsumerState);
  }

  if (nextPage !== "topic-routing") {
    resetFormState(topicRoutingFormState);
  }

  if (nextPage !== "priority-queue") {
    resetFormState(priorityQueueFormState);
  }
}

function getCredentials(form: HTMLFormElement): { emailAddress: string; password: string } {
  const formData = new FormData(form);

  return {
    emailAddress: String(formData.get("emailAddress") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
}

async function submitRegister(form: HTMLFormElement): Promise<void> {
  registerState.status = "submitting";
  registerState.message = undefined;
  render();

  try {
    const response = await fetch("/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(getCredentials(form)),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to create account"));
    }

    form.reset();
    resetFormState(registerState);
    loginState.status = "success";
    loginState.message = "Complete the verification process by checking your email and clicking on the Verify link. Clicking on the verification link will open a new page in your browser and you may continue to work in that session. You may close this browser window.";
    window.location.hash = "login";
  } catch (err) {
    registerState.status = "error";
    registerState.message = err instanceof Error ? err.message : "Unable to create account.";
  }

  render();
}

async function submitLogin(form: HTMLFormElement): Promise<void> {
  loginState.status = "submitting";
  loginState.message = undefined;
  render();

  try {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(getCredentials(form)),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to log in"));
    }

    const body = (await response.json()) as { account: AuthAccount; session?: AuthSession | null };
    account = body.account;
    authSession = body.session ?? null;
    loginState.status = "idle";
    form.reset();
    window.location.hash = "account";
  } catch (err) {
    loginState.status = "error";
    loginState.message = err instanceof Error ? err.message : "Unable to log in.";
    render();
  }
}

async function loadCurrentAccount(): Promise<void> {
  try {
    const response = await fetch("/auth/me");

    if (!response.ok) {
      account = null;
      authSession = null;
      return;
    }

    const body = (await response.json()) as { account: AuthAccount; session?: AuthSession | null };
    account = body.account;
    authSession = body.session ?? null;
  } catch {
    account = null;
    authSession = null;
  }
}

async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST" });
  account = null;
  authSession = null;
  accountState.status = "idle";
  window.location.hash = "login";
  render();
}

async function deleteAccount(): Promise<void> {
  const confirmed = window.confirm(
    "Delete this account? This frees the email address so you can repeat the flow.",
  );

  if (!confirmed) {
    return;
  }

  accountState.status = "submitting";
  accountState.message = undefined;
  render();

  try {
    const response = await fetch("/auth/me", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to delete account"));
    }

    account = null;
    authSession = null;
    resetFormState(accountState);
    resetFormState(registerState);
    window.location.hash = "register";
    render();
  } catch (err) {
    accountState.status = "error";
    accountState.message = err instanceof Error ? err.message : "Unable to delete account.";
    render();
  }
}

async function loadWidgets(): Promise<void> {
  try {
    const response = await fetch("/widgets");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load widgets"));
    }

    widgetQueueState = await response.json() as WidgetQueueState;
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to load widgets.";
  }
}

async function createWidgets(count: number): Promise<void> {
  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await fetch("/widgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to create widgets"));
    }

    await loadWidgets();
    widgetState.status = "success";
    widgetState.message = `Created ${count} widget${count === 1 ? "" : "s"}.`;
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to create widgets.";
  }

  render();
}

async function processWidgets(count?: number): Promise<void> {
  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await fetch("/widgets/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(count ? { count } : {}),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to process widgets"));
    }

    const body = await response.json() as {
      processedCount: number;
      retryCount: number;
      failedCount: number;
      invalidCount: number;
    };
    await loadWidgets();
    widgetState.status = "success";
    widgetState.message = `Processed ${body.processedCount} widget message${body.processedCount === 1 ? "" : "s"}.`;

    if (body.retryCount > 0) {
      widgetState.message += ` Scheduled ${body.retryCount} delayed retry${body.retryCount === 1 ? "" : "ies"}. After the retry delay (10 seconds), click Refresh, then Process again.`;
    }

    if (body.failedCount > 0) {
      widgetState.message += ` Dead-lettered ${body.failedCount} demo failure${body.failedCount === 1 ? "" : "s"}.`;
    }

    if (body.invalidCount > 0) {
      widgetState.message += ` Rejected ${body.invalidCount} invalid message${body.invalidCount === 1 ? "" : "s"}.`;
    }
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to process widgets.";
  }

  render();
}

async function deleteWidgets(): Promise<void> {
  const confirmed = window.confirm(
    "Delete all widget rows and purge the widget RabbitMQ queues?",
  );

  if (!confirmed) {
    return;
  }

  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await fetch("/widgets", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to delete widgets"));
    }

    widgetQueueState = await response.json() as WidgetQueueState;
    widgetState.status = "success";
    widgetState.message = "Deleted all widget rows and purged widget queues.";
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : "Unable to delete widgets.";
  }

  render();
}

async function replayDeadLetter(messageId: string): Promise<void> {
  await handleDeadLetterAction(messageId, "replay");
}

async function repairDeadLetter(messageId: string): Promise<void> {
  await handleDeadLetterAction(messageId, "repair");
}

async function handleDeadLetterAction(
  messageId: string,
  action: "repair" | "replay",
): Promise<void> {
  widgetState.status = "submitting";
  widgetState.message = undefined;
  render();

  try {
    const response = await fetch(`/widgets/dead-letter/${encodeURIComponent(messageId)}/${action}`, {
      method: "POST",
    });

    if (!response.ok) {
      throw new Error(await readError(response, `Unable to ${action} dead-letter message`));
    }

    await loadWidgets();
    widgetState.status = "success";
    widgetState.message = action === "repair"
      ? "Repaired and replayed dead-letter message."
      : "Replayed dead-letter message.";
  } catch (err) {
    widgetState.status = "error";
    widgetState.message = err instanceof Error ? err.message : `Unable to ${action} dead-letter message.`;
  }

  render();
}

async function loadConsumerWidgets(): Promise<void> {
  try {
    const response = await fetch("/consumer-widgets");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load competing consumer widgets"));
    }

    widgetConsumerQueueState = await response.json() as WidgetConsumerQueueState;
  } catch (err) {
    widgetConsumerState.status = "error";
    widgetConsumerState.message = err instanceof Error ? err.message : "Unable to load competing consumer widgets.";
  }
}

async function createConsumerWidgets(count: number): Promise<void> {
  widgetConsumerState.status = "submitting";
  widgetConsumerState.message = undefined;
  render();

  try {
    const response = await fetch("/consumer-widgets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to create competing consumer widgets"));
    }

    widgetConsumerQueueState = await response.json() as WidgetConsumerQueueState;
    widgetConsumerState.status = "success";
    widgetConsumerState.message = `Created ${count} competing consumer widget${count === 1 ? "" : "s"}. Refresh after the workers have time to process them.`;
  } catch (err) {
    widgetConsumerState.status = "error";
    widgetConsumerState.message = err instanceof Error ? err.message : "Unable to create competing consumer widgets.";
  }

  render();
}

async function deleteConsumerWidgets(): Promise<void> {
  const confirmed = window.confirm(
    "Delete all competing consumer widget rows and purge the RabbitMQ queue?",
  );

  if (!confirmed) {
    return;
  }

  widgetConsumerState.status = "submitting";
  widgetConsumerState.message = undefined;
  render();

  try {
    const response = await fetch("/consumer-widgets", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to delete competing consumer widgets"));
    }

    widgetConsumerQueueState = await response.json() as WidgetConsumerQueueState;
    widgetConsumerState.status = "success";
    widgetConsumerState.message = "Deleted all competing consumer widgets and purged the queue.";
  } catch (err) {
    widgetConsumerState.status = "error";
    widgetConsumerState.message = err instanceof Error ? err.message : "Unable to delete competing consumer widgets.";
  }

  render();
}

async function loadTopicRouting(): Promise<void> {
  try {
    const response = await fetch("/topic-routing");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load topic routing demo"));
    }

    topicRoutingState = await response.json() as TopicRoutingState;
  } catch (err) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = err instanceof Error ? err.message : "Unable to load topic routing demo.";
  }
}

async function publishTopicRoutingEvent(routingKey: string): Promise<void> {
  topicRoutingFormState.status = "submitting";
  topicRoutingFormState.message = undefined;
  render();

  try {
    const response = await fetch("/topic-routing", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ routingKey }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to publish topic routing event"));
    }

    topicRoutingState = await response.json() as TopicRoutingState;
    topicRoutingFormState.status = "success";
    topicRoutingFormState.message = `Published ${routingKey}. RabbitMQ copied it into each queue with a matching binding pattern.`;
  } catch (err) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = err instanceof Error ? err.message : "Unable to publish topic routing event.";
  }

  render();
}

async function purgeTopicRoutingQueues(): Promise<void> {
  const confirmed = window.confirm("Purge all topic routing demo queues?");

  if (!confirmed) {
    return;
  }

  topicRoutingFormState.status = "submitting";
  topicRoutingFormState.message = undefined;
  render();

  try {
    const response = await fetch("/topic-routing", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to purge topic routing queues"));
    }

    topicRoutingState = await response.json() as TopicRoutingState;
    topicRoutingFormState.status = "success";
    topicRoutingFormState.message = "Purged all topic routing demo queues.";
  } catch (err) {
    topicRoutingFormState.status = "error";
    topicRoutingFormState.message = err instanceof Error ? err.message : "Unable to purge topic routing queues.";
  }

  render();
}

async function loadPriorityQueue(): Promise<void> {
  try {
    const response = await fetch("/priority-queue");

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to load priority queue demo"));
    }

    priorityQueueState = await response.json() as PriorityQueueState;
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to load priority queue demo.";
  }
}

async function publishPriorityQueueJob(priority: number): Promise<void> {
  priorityQueueFormState.status = "submitting";
  priorityQueueFormState.message = undefined;
  render();

  try {
    const response = await fetch("/priority-queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ priority }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to publish priority queue job"));
    }

    priorityQueueState = await response.json() as PriorityQueueState;
    priorityQueueFormState.status = "success";
    priorityQueueFormState.message = `Published priority ${priority} job.`;
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to publish priority queue job.";
  }

  render();
}

async function processPriorityQueue(count: number): Promise<void> {
  priorityQueueFormState.status = "submitting";
  priorityQueueFormState.message = undefined;
  render();

  try {
    const response = await fetch("/priority-queue/process", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to process priority queue jobs"));
    }

    const body = await response.json() as PriorityQueueState & { processedCount: number };
    priorityQueueState = body;
    priorityQueueFormState.status = "success";
    priorityQueueFormState.message = `Processed ${body.processedCount} priority queue job${body.processedCount === 1 ? "" : "s"}.`;
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to process priority queue jobs.";
  }

  render();
}

async function purgePriorityQueue(): Promise<void> {
  const confirmed = window.confirm("Purge the priority queue and clear processed history?");

  if (!confirmed) {
    return;
  }

  priorityQueueFormState.status = "submitting";
  priorityQueueFormState.message = undefined;
  render();

  try {
    const response = await fetch("/priority-queue", { method: "DELETE" });

    if (!response.ok) {
      throw new Error(await readError(response, "Unable to purge priority queue"));
    }

    priorityQueueState = await response.json() as PriorityQueueState;
    priorityQueueFormState.status = "success";
    priorityQueueFormState.message = "Purged priority queue and cleared processed history.";
  } catch (err) {
    priorityQueueFormState.status = "error";
    priorityQueueFormState.message = err instanceof Error ? err.message : "Unable to purge priority queue.";
  }

  render();
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${response.status})`;
}

function bindEvents(): void {
  const registerForm = document.querySelector<HTMLFormElement>('[data-form="register"]');
  const loginForm = document.querySelector<HTMLFormElement>('[data-form="login"]');
  const topicRoutingForm = document.querySelector<HTMLFormElement>('[data-form="topic-routing"]');

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitRegister(registerForm);
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitLogin(loginForm);
  });

  topicRoutingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(topicRoutingForm);
    void publishTopicRoutingEvent(String(formData.get("routingKey") ?? ""));
  });

  document.querySelector<HTMLButtonElement>('[data-action="logout"]')?.addEventListener("click", () => {
    void logout();
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-account"]')?.addEventListener("click", () => {
    void deleteAccount();
  });

  document.querySelector<HTMLButtonElement>('[data-action="refresh-widgets"]')?.addEventListener("click", () => {
    void loadWidgets().then(render);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="create-widget"]').forEach((button) => {
    button.addEventListener("click", () => {
      void createWidgets(Number(button.dataset.count ?? "1"));
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="process-widgets"]').forEach((button) => {
    button.addEventListener("click", () => {
      void processWidgets(Number(button.dataset.count ?? "1"));
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="process-all-widgets"]')?.addEventListener("click", () => {
    void processWidgets();
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-widgets"]')?.addEventListener("click", () => {
    void deleteWidgets();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="replay-dead-letter"]').forEach((button) => {
    button.addEventListener("click", () => {
      const messageId = button.dataset.messageId;

      if (messageId) {
        void replayDeadLetter(messageId);
      }
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="repair-dead-letter"]').forEach((button) => {
    button.addEventListener("click", () => {
      const messageId = button.dataset.messageId;

      if (messageId) {
        void repairDeadLetter(messageId);
      }
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="refresh-consumer-widgets"]')?.addEventListener("click", () => {
    void loadConsumerWidgets().then(render);
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="create-consumer-widget"]').forEach((button) => {
    button.addEventListener("click", () => {
      void createConsumerWidgets(Number(button.dataset.count ?? "10"));
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-consumer-widgets"]')?.addEventListener("click", () => {
    void deleteConsumerWidgets();
  });

  document.querySelector<HTMLButtonElement>('[data-action="purge-topic-routing"]')?.addEventListener("click", () => {
    void purgeTopicRoutingQueues();
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="publish-priority-job"]').forEach((button) => {
    button.addEventListener("click", () => {
      void publishPriorityQueueJob(Number(button.dataset.priority ?? "1"));
    });
  });

  document.querySelectorAll<HTMLButtonElement>('[data-action="process-priority-queue"]').forEach((button) => {
    button.addEventListener("click", () => {
      void processPriorityQueue(Number(button.dataset.count ?? "1"));
    });
  });

  document.querySelector<HTMLButtonElement>('[data-action="purge-priority-queue"]')?.addEventListener("click", () => {
    void purgePriorityQueue();
  });
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    throw new Error("Missing #app element");
  }

  syncSidebarSectionsFromDom();

  const page = getCurrentPage();
  resetStateForPageChange(page);
  currentPage = page;
  applyRouteMessage();

  const content =
    page === "iam"
      ? iamPage()
      : page === "register"
        ? registerPage()
        : page === "account"
          ? accountPage()
        : page === "widgets"
          ? widgetsPage()
          : page === "competing-consumers"
            ? competingConsumersPage()
            : page === "topic-routing"
              ? topicRoutingPage()
              : page === "priority-queue"
                ? priorityQueuePage()
                : loginPage();

  app.innerHTML = layout(content);
  bindEvents();
}

function syncSidebarSectionsFromDom(): void {
  const identityPanel = document.querySelector<HTMLElement>("#identityAccessNav");
  const accountPanel = document.querySelector<HTMLElement>("#myAccountNav");
  const messagingPanel = document.querySelector<HTMLElement>("#queueDemosNav");

  sidebarSectionsOpen = {
    identity: identityPanel ? identityPanel.classList.contains("show") : sidebarSectionsOpen.identity,
    account: accountPanel ? accountPanel.classList.contains("show") : sidebarSectionsOpen.account,
    messaging: messagingPanel ? messagingPanel.classList.contains("show") : sidebarSectionsOpen.messaging,
  };
}

function applyRouteMessage(): void {
  if (window.location.hash === "#login-email-verified") {
    loginState.status = "success";
    loginState.message = "Email address verified. Log in below to continue.";
    window.history.replaceState(null, "", "#login");
    return;
  }

  if (window.location.hash === "#login-email-verification-failed") {
    loginState.status = "error";
    loginState.message = "Email verification failed or the link has expired.";
    window.history.replaceState(null, "", "#login");
  }
}

function escapeHtml(value: string): string {
  const element = document.createElement("span");
  element.textContent = value;
  return element.innerHTML;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatRelativeExpiration(value: string): string {
  const diffMs = new Date(value).getTime() - Date.now();

  if (!Number.isFinite(diffMs)) {
    return "Unknown";
  }

  if (diffMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.ceil(diffMs / 60_000);
  const days = Math.floor(totalMinutes / 1_440);
  const hours = Math.floor((totalMinutes % 1_440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function widgetRows(): string {
  return widgetQueueState.widgets.map((widget) => `
    <tr>
      <td>${widget.widgetId}</td>
      <td>${escapeHtml(widget.widgetName)}</td>
      <td>${statusBadge(widget.status)}</td>
      <td>${widget.processCount}</td>
      <td>${formatDate(widget.createdAt)}</td>
      <td>${widget.processedAt ? formatDate(widget.processedAt) : ""}</td>
    </tr>
  `).join("");
}

function deadLetterRows(isSubmitting: boolean): string {
  return widgetQueueState.deadLetterMessages.map((message) => `
    <tr>
      <td>${message.widgetId}</td>
      <td>${escapeHtml(message.widgetName)}</td>
      <td><span class="badge text-bg-danger">dead-letter</span></td>
      <td></td>
      <td>${formatDate(message.requestedAt)}</td>
      <td>
        <div class="d-flex flex-wrap gap-2">
          <button class="btn btn-sm btn-outline-secondary" type="button" data-action="replay-dead-letter" data-message-id="${escapeHtml(message.messageId)}" ${isSubmitting ? "disabled" : ""}>Replay</button>
          <button class="btn btn-sm btn-outline-primary" type="button" data-action="repair-dead-letter" data-message-id="${escapeHtml(message.messageId)}" ${isSubmitting ? "disabled" : ""}>Repair</button>
        </div>
      </td>
    </tr>
  `).join("");
}

function consumerProcessedCards(): string {
  const entries = Object.entries(widgetConsumerQueueState.processedBy)
    .sort(([left], [right]) => left.localeCompare(right));

  if (!entries.length) {
    return `
      <div class="col-sm-6 col-lg">
        <div class="border rounded p-3 h-100">
          <div class="text-muted small">Workers</div>
          <div class="fs-3 fw-semibold">0</div>
        </div>
      </div>
    `;
  }

  return entries.map(([consumerName, count]) => `
    <div class="col-sm-6 col-lg">
      <div class="border rounded p-3 h-100">
        <div class="text-muted small">${escapeHtml(consumerName)}</div>
        <div class="fs-3 fw-semibold">${count}</div>
      </div>
    </div>
  `).join("");
}

function consumerWidgetRows(): string {
  return widgetConsumerQueueState.widgets.map((widget) => `
    <tr>
      <td>${widget.widgetId}</td>
      <td>${escapeHtml(widget.widgetName)}</td>
      <td>${statusBadge(widget.status)}</td>
      <td>${widget.processedBy ? escapeHtml(widget.processedBy) : ""}</td>
      <td>${widget.processingSeconds ?? ""}</td>
      <td>${formatDate(widget.createdAt)}</td>
      <td>${widget.processedAt ? formatDate(widget.processedAt) : ""}</td>
    </tr>
  `).join("");
}

function topicRoutingOptions(): string {
  return topicRoutingState.sampleRoutingKeys.map((routingKey) => `
    <option value="${escapeHtml(routingKey)}">${escapeHtml(routingKey)}</option>
  `).join("");
}

function topicRoutingQueueCards(): string {
  return topicRoutingState.queues.map((queue) => `
    <section class="topic-routing-card">
      <div class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-2">
        <div>
          <h2 class="h6 mb-1">${escapeHtml(queue.key)}</h2>
          <div class="text-muted small">${escapeHtml(queue.queue)}</div>
        </div>
        <span class="badge text-bg-secondary">${queue.messageCount}</span>
      </div>
      <dl class="row small mb-3">
        <dt class="col-sm-4">Binding</dt>
        <dd class="col-sm-8"><code>${escapeHtml(queue.bindingPattern)}</code></dd>
        <dt class="col-sm-4">Purpose</dt>
        <dd class="col-sm-8">${escapeHtml(queue.description)}</dd>
      </dl>
      <div class="table-responsive">
        <table class="table table-sm mb-0 topic-routing-table">
          <thead>
            <tr>
              <th>Routing Key</th>
              <th>Published</th>
            </tr>
          </thead>
          <tbody>
            ${queue.messages.length ? topicRoutingMessageRows(queue.messages) : `<tr><td colspan="2" class="text-muted">No messages.</td></tr>`}
          </tbody>
        </table>
      </div>
    </section>
  `).join("");
}

function topicRoutingMessageRows(messages: TopicRoutingDemoMessage[]): string {
  return messages.map((message) => `
    <tr>
      <td><code>${escapeHtml(message.routingKey)}</code></td>
      <td>${formatDate(message.requestedAt)}</td>
    </tr>
  `).join("");
}

function priorityQueuePublishButtons(isSubmitting: boolean): string {
  return priorityQueueState.levels.map((level) => `
    <button
      class="btn ${level.priority >= 9 ? "btn-danger" : level.priority >= 5 ? "btn-warning" : "btn-primary"}"
      type="button"
      data-action="publish-priority-job"
      data-priority="${level.priority}"
      ${isSubmitting ? "disabled" : ""}
    >
      Publish ${escapeHtml(level.label)}
    </button>
  `).join("");
}

function priorityQueuePublishedRows(messages: PriorityQueueMessage[]): string {
  return messages.map((message) => `
    <tr>
      <td>${message.publishSequence}</td>
      <td>${priorityBadge(message.priority)}</td>
      <td>${escapeHtml(message.jobName)}</td>
      <td>${formatDate(message.requestedAt)}</td>
    </tr>
  `).join("");
}

function priorityQueueProcessedRows(messages: ProcessedPriorityQueueMessage[]): string {
  return messages.map((message) => `
    <tr>
      <td>${message.processedSequence}</td>
      <td>${message.publishSequence}</td>
      <td>${priorityBadge(message.priority)}</td>
      <td>${escapeHtml(message.jobName)}</td>
      <td>${formatDate(message.processedAt)}</td>
    </tr>
  `).join("");
}

function priorityBadge(priority: number): string {
  const badgeClass =
    priority >= 9
      ? "text-bg-danger"
      : priority >= 5
        ? "text-bg-warning"
        : "text-bg-secondary";

  return `<span class="badge ${badgeClass}">${priority}</span>`;
}

function statusBadge(status: WidgetStatus | WidgetConsumerStatus): string {
  const badgeClass =
    status === "processed"
      ? "text-bg-success"
      : status === "failed"
        ? "text-bg-danger"
        : status === "processing"
          ? "text-bg-warning"
          : status === "retrying"
            ? "text-bg-info"
            : "text-bg-secondary";

  return `<span class="badge ${badgeClass}">${escapeHtml(status)}</span>`;
}


window.addEventListener("hashchange", render);

await loadCurrentAccount();
await loadWidgets();
await loadConsumerWidgets();
await loadTopicRouting();
await loadPriorityQueue();
render();
