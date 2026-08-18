import { useEffect, useState } from "react";
import { BackToTop } from "../components/BackToTop";
import { formatDateWithSeconds } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";

type InfrastructureDisposition = "online" | "degraded" | "offline" | "unknown";

type InfrastructureRequirement = {
  key: string;
  name: string;
  disposition: InfrastructureDisposition;
  detail: string;
  evidence: string;
  checkedAt: string;
};

type PlatformStatus = {
  checkedAt: string;
  requirements: InfrastructureRequirement[];
  notes: string[];
};

type LoadState = "idle" | "submitting" | "success" | "error";

type EmailDispatchRun = {
  messageId: string | null;
  recipientCount: number | null;
  submittedAt: string;
  status: "queued" | "active" | "complete" | "failed";
};

export function Infrastructure() {
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState<string | undefined>();
  const [emailTestState, setEmailTestState] = useState<LoadState>("idle");
  const [emailTestMessage, setEmailTestMessage] = useState<string | undefined>();
  const [emailDispatchRun, setEmailDispatchRun] = useState<EmailDispatchRun | null>(null);

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (!emailDispatchRun || emailDispatchRun.status === "complete" || emailDispatchRun.status === "failed") {
      return;
    }

    const emailWebhook = platformStatus?.requirements.find((requirement) => requirement.key === "email-webhook");

    const lastWebhookEventAt = extractLastWebhookEventAt(emailWebhook?.evidence);
    const hasWebhookEventForRun = Boolean(
      lastWebhookEventAt && new Date(lastWebhookEventAt).getTime() >= new Date(emailDispatchRun.submittedAt).getTime()
    );

    if (hasWebhookEventForRun) {
      setEmailDispatchRun((current) => current ? { ...current, status: "complete" } : current);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadStatus({ silent: true });
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [emailDispatchRun, platformStatus]);

  const isRefreshing = loadState === "submitting";
  const checkedAt = platformStatus?.checkedAt ? formatDateWithSeconds(platformStatus.checkedAt) : "Not checked yet";

  async function loadStatus(options?: { silent?: boolean }) {
    const isSilent = options?.silent ?? false;

    if (!isSilent && isRefreshing) {
      return;
    }

    if (!isSilent) {
      setLoadState("submitting");
      setMessage(undefined);
    }

    try {
      const response = await fetch(`/platform/status?ts=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load platform infrastructure status"));
      }

      const nextStatus = (await response.json()) as PlatformStatus;

      setPlatformStatus(nextStatus);

      if (!isSilent) {
        setLoadState("success");
      }

      if (
        emailTestState === "success"
        && nextStatus.requirements.some(
          (requirement) => requirement.key === "email-webhook" && requirement.disposition === "online"
        )
      ) {
        setEmailTestState("idle");
        setEmailTestMessage(undefined);
      }
    } catch (err) {
      if (!isSilent) {
        setPlatformStatus(buildUnavailablePlatformStatus(err));
        setLoadState("error");
        setMessage(
          `Live platform status is unavailable; showing expected requirements instead. ${
            err instanceof Error ? err.message : "Unable to load platform infrastructure status."
          }`
        );
      }
    }
  }

  async function sendWebhookTestEmail() {
    if (emailTestState === "submitting") {
      return;
    }

    setEmailTestState("submitting");
    setEmailTestMessage(undefined);
    setEmailDispatchRun({
      messageId: null,
      recipientCount: null,
      submittedAt: new Date().toISOString(),
      status: "queued"
    });

    try {
      const response = await csrfFetch("/platform/status/email-webhook-test", {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to queue the test email"));
      }

      const result = (await response.json()) as { messageId?: string; recipientCount?: number };
      const recipientText =
        typeof result.recipientCount === "number"
          ? ` for ${result.recipientCount} monitor recipient${result.recipientCount === 1 ? "" : "s"}`
          : "";

      setEmailDispatchRun((current) => ({
        messageId: result.messageId ?? current?.messageId ?? null,
        recipientCount: result.recipientCount ?? current?.recipientCount ?? null,
        submittedAt: current?.submittedAt ?? new Date().toISOString(),
        status: "active"
      }));
      setEmailTestState("success");
      setEmailTestMessage(`Test email queued${recipientText}. The dispatch status below will refresh while the email worker starts.`);
    } catch (err) {
      setEmailTestState("error");
      setEmailTestMessage(err instanceof Error ? err.message : "Unable to queue the test email.");
      setEmailDispatchRun((current) => current ? { ...current, status: "failed" } : current);
    }
  }

  return (
    <section className="platform-overview">
      <div className="platform-hero">
        <div>
          <p className="platform-kicker">Platform operations</p>
          <h1>Infrastructure Status</h1>
          <p className="platform-lede">
            CM Platform combines a public web application and Fastify API with relational and document
            persistence, RabbitMQ messaging, background consumers, and email webhook processing. This
            page brings those dependencies together into a live operational view of the services that
            support the platform.
          </p>
          <p className="platform-lede mt-3">
            Status is assembled by the API using readiness queries, broker queue metadata, attached
            consumer counts, and stored webhook history. The results provide practical evidence that the
            platform components are connected and available, while distinguishing direct health checks
            from signals that only indicate recent activity.
          </p>
          <div className="platform-hero-actions">
            <button className="btn btn-primary" type="button" onClick={() => void loadStatus()} disabled={isRefreshing}>
              {isRefreshing ? "Checking..." : "Refresh Status"}
            </button>
            <span>Last checked: {checkedAt}</span>
          </div>
        </div>
        <div className="platform-stack" aria-label="Infrastructure status summary">
          <StackRow
            label="Status Source"
            value="Fastify API readiness, Postgres and MongoDB queries, RabbitMQ queue metadata, webhook event history"
          />
          <StackRow label="Purpose" value="Make required local services visible before running demos" />
          <StackRow label="Limit" value="RabbitMQ confirms attached consumers, not individual process names" />
        </div>
      </div>

      {loadState === "error" && message ? (
        <div className="alert alert-danger" role="alert">
          {message}
        </div>
      ) : null}

      {isRefreshing ? (
        <div className="alert alert-info" role="status">
          Refreshing live infrastructure status. Existing rows remain visible until the new check completes.
        </div>
      ) : null}

      <section className="platform-section platform-section-block">
        <div>
          <h2>Required Infrastructure</h2>
          <p>
            Each row reports what the API can verify right now. Online means the requirement is reachable
            or active. Degraded means the platform can inspect the resource, but an expected runtime is
            missing. Unknown means the endpoint exists, but no activity has been recorded yet.
          </p>
        </div>
        <div className="infrastructure-table-wrap">
          <table className="table table-sm infrastructure-table">
            <thead>
              <tr>
                <th>Requirement</th>
                <th>Disposition</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {platformStatus?.requirements.length ? (
                platformStatus.requirements.map((requirement) => (
                  <tr key={requirement.key}>
                    <td>
                      <div className="fw-semibold">{requirement.name}</div>
                      <div className="text-muted small">{requirement.detail}</div>
                    </td>
                    <td>
                      <InfrastructureBadge disposition={requirement.disposition} />
                    </td>
                    <td>
                      <div>{requirement.evidence}</div>
                      <div className="text-muted small">Checked {formatDateWithSeconds(requirement.checkedAt)}</div>
                      {requirement.key === "email-webhook" ? (
                        <>
                          <button
                            className="btn btn-outline-primary infrastructure-action-button mt-2"
                            type="button"
                            onClick={() => void sendWebhookTestEmail()}
                            disabled={emailTestState === "submitting"}
                          >
                            {emailTestState === "submitting" ? "Sending..." : "Send Email Now"}
                          </button>
                          {emailTestMessage ? (
                            <div
                              className={`small mt-1 ${
                                emailTestState === "error" ? "text-danger" : "text-success"
                              }`}
                              role={emailTestState === "error" ? "alert" : "status"}
                            >
                              {emailTestMessage}
                            </div>
                          ) : null}
                          <EmailDispatchPanel
                            emailDispatchRun={emailDispatchRun}
                            platformStatus={platformStatus}
                          />
                        </>
                      ) : null}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="text-muted">
                    No infrastructure status loaded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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

function InfrastructureBadge({ disposition }: { disposition: InfrastructureDisposition }) {
  const badgeClass =
    disposition === "online"
      ? "text-bg-success"
      : disposition === "degraded"
        ? "text-bg-warning"
        : disposition === "offline"
          ? "text-bg-danger"
          : "text-bg-secondary";

  return <span className={`badge ${badgeClass}`}>{disposition}</span>;
}

function EmailDispatchPanel({
  emailDispatchRun,
  platformStatus
}: {
  emailDispatchRun: EmailDispatchRun | null;
  platformStatus: PlatformStatus | null;
}) {
  if (!emailDispatchRun) {
    return null;
  }

  const emailDispatcher = platformStatus?.requirements.find((requirement) => requirement.key === "rabbitmq-email-dispatcher");
  const emailWebhook = platformStatus?.requirements.find((requirement) => requirement.key === "email-webhook");
  const hasDispatcher = emailDispatcher?.disposition === "online";
  const lastWebhookEventAt = extractLastWebhookEventAt(emailWebhook?.evidence);
  const hasWebhookEventForRun = Boolean(
    lastWebhookEventAt && new Date(lastWebhookEventAt).getTime() >= new Date(emailDispatchRun.submittedAt).getTime()
  );
  const isComplete = emailDispatchRun.status === "complete" || hasWebhookEventForRun;
  const isFailed = emailDispatchRun.status === "failed";
  const recipientText =
    typeof emailDispatchRun.recipientCount === "number"
      ? `${emailDispatchRun.recipientCount} recipient${emailDispatchRun.recipientCount === 1 ? "" : "s"}`
      : "monitor recipients";

  const steps: EmailDispatchStep[] = [
    {
      label: "Queued",
      detail: emailDispatchRun.messageId
        ? `Message ${emailDispatchRun.messageId.slice(0, 8)} accepted for ${recipientText}.`
        : `Email request accepted for ${recipientText}.`,
      status: emailDispatchRun.messageId ? "complete" : "active"
    },
    {
      label: "Starting dispatcher",
      detail: hasDispatcher
        ? "RabbitMQ shows an attached email dispatcher consumer."
        : "Low-cost mode may need a short moment to start the idle email worker.",
      status: hasDispatcher || hasWebhookEventForRun ? "complete" : "active"
    },
    {
      label: "Sending email",
      detail: hasWebhookEventForRun
        ? "A provider webhook event arrived after this test email was queued."
        : emailDispatcher?.evidence ?? "Waiting for the dispatcher to drain the email queue.",
      status: hasWebhookEventForRun ? "complete" : hasDispatcher ? "active" : "pending"
    },
    {
      label: "Webhook observed",
      detail: hasWebhookEventForRun
        ? emailWebhook?.evidence ?? "Provider webhook event observed."
        : "Waiting for a new provider webhook event from this test email.",
      status: isFailed ? "failed" : isComplete ? "complete" : "pending"
    }
  ];

  return (
    <section className="worker-run-panel infrastructure-worker-run mt-3" aria-label="Email dispatcher progress">
      <div className="worker-run-summary">
        <div>
          <h3 className="h6 mb-1">Email dispatcher status</h3>
          <p className="text-muted mb-0">
            This path uses a scaled-to-zero worker. The email is safely queued while Azure starts the dispatcher.
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

type EmailDispatchStep = {
  label: string;
  detail: string;
  status: "pending" | "active" | "complete" | "failed";
};

function extractLastWebhookEventAt(evidence: string | undefined): string | null {
  const match = evidence?.match(/Last event: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);

  if (!match?.[1]) {
    return null;
  }

  return Number.isNaN(new Date(match[1]).getTime()) ? null : match[1];
}

function buildUnavailablePlatformStatus(err: unknown): PlatformStatus {
  const checkedAt = new Date().toISOString();
  const evidence = err instanceof Error ? err.message : "Unable to reach /platform/status.";
  const unavailableRequirements: Array<{
    key: string;
    name: string;
    disposition: InfrastructureDisposition;
    detail: string;
  }> = [
    {
      key: "api-service",
      name: "API Service",
      disposition: "offline",
      detail: "The public web app could not reach the platform status API."
    },
    {
      key: "database",
      name: "Postgres Database",
      disposition: "unknown",
      detail: "Database status cannot be checked until the API service is running."
    },
    {
      key: "document-database",
      name: "MongoDB",
      disposition: "unknown",
      detail: "Document database status cannot be checked until the API service is running."
    },
    {
      key: "healthcare-transform",
      name: "Healthcare Transform",
      disposition: "unknown",
      detail: "Healthcare-transform status cannot be checked until the API service is running."
    },
    {
      key: "rabbitmq-email-dispatcher",
      name: "RabbitMQ - Email Dispatcher",
      disposition: "unknown",
      detail: "Email dispatcher status cannot be checked until the API service is running."
    },
    {
      key: "rabbitmq-slow-consumer",
      name: "RabbitMQ - slow-consumer",
      disposition: "unknown",
      detail: "Worker status cannot be checked until the API service is running."
    },
    {
      key: "rabbitmq-fast-consumer",
      name: "RabbitMQ - fast-consumer",
      disposition: "unknown",
      detail: "Worker status cannot be checked until the API service is running."
    },
    {
      key: "email-webhook",
      name: "Email Webhook",
      disposition: "unknown",
      detail: "Webhook event history cannot be checked until the API service is running."
    }
  ];

  return {
    checkedAt,
    requirements: unavailableRequirements.map((requirement) => ({
      ...requirement,
      evidence,
      checkedAt
    })),
    notes: [
      "These rows are a local fallback because /platform/status did not return a live status payload.",
      "Start the API and supporting infrastructure to replace these fallback dispositions with live checks. Use npm run infra:workers:up to start the Docker-managed background workers."
    ]
  };
}
