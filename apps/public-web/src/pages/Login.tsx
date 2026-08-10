import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "../lib/router";
import { StatusMessage } from "../components/StatusMessage";
import { readError } from "../lib/http";
import type { FormState } from "../types/forms";

type LoginLocationState = {
  message?: string;
  emailDispatch?: {
    messageId: string | null;
    recipientCount: number | null;
    submittedAt: string;
  };
};

type InfrastructureRequirement = {
  key: string;
  disposition: "online" | "degraded" | "offline" | "unknown";
  evidence: string;
};

type PlatformStatus = {
  requirements: InfrastructureRequirement[];
};

type EmailDispatchRun = NonNullable<LoginLocationState["emailDispatch"]> & {
  status: "active" | "complete" | "failed";
};

const emailDispatchWatchMs = 120_000;

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const verified = new URLSearchParams(location.search).get("verified");
  const [formState, setFormState] = useState<FormState>(
    getInitialFormState(locationState?.message, verified)
  );
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [platformStatus, setPlatformStatus] = useState<PlatformStatus | null>(null);
  const [emailDispatchRun, setEmailDispatchRun] = useState<EmailDispatchRun | null>(
    locationState?.emailDispatch
      ? {
          ...locationState.emailDispatch,
          status: "active"
        }
      : null
  );

  useEffect(() => {
    if (!emailDispatchRun || emailDispatchRun.status !== "active") {
      return;
    }

    const emailWebhook = platformStatus?.requirements.find((requirement) => requirement.key === "email-webhook");
    const lastWebhookEventAt = extractLastWebhookEventAt(emailWebhook?.evidence);
    const hasWebhookEventForRun = Boolean(
      lastWebhookEventAt && new Date(lastWebhookEventAt).getTime() >= new Date(emailDispatchRun.submittedAt).getTime()
    );
    const hasWatchedLongEnough = Date.now() - new Date(emailDispatchRun.submittedAt).getTime() > emailDispatchWatchMs;

    if (hasWebhookEventForRun || hasWatchedLongEnough) {
      setEmailDispatchRun((current) => current ? { ...current, status: "complete" } : current);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadPlatformStatus();
    }, 5000);

    return () => window.clearTimeout(timeoutId);
  }, [emailDispatchRun, platformStatus]);

  const isSubmitting = formState.status === "submitting";

  async function loadPlatformStatus() {
    try {
      const response = await fetch(`/platform/status?ts=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        return;
      }

      setPlatformStatus((await response.json()) as PlatformStatus);
    } catch {
      // Keep the login flow focused on the user's next action. The email can still arrive without this live evidence.
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "submitting" });

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress, password })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to log in"));
      }

      await response.json();
      setEmailAddress("");
      setPassword("");
      navigate("/account");
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to log in."
      });
    }
  }

  return (
    <div className="auth-panel">
      <h1 className="h3 mb-2">Login</h1>
      <p className="text-muted">Use your email address and password to access your account.</p>

      <StatusMessage state={formState} />
      <VerificationEmailPanel emailDispatchRun={emailDispatchRun} platformStatus={platformStatus} />

      <form onSubmit={submitLogin}>
        <div className="mb-3">
          <label className="form-label" htmlFor="login-email">
            Email address
          </label>
          <input
            className="form-control"
            id="login-email"
            name="emailAddress"
            type="email"
            autoComplete="email"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="login-password">
            Password
          </label>
          <input
            className="form-control"
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary w-100" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="mt-3 text-center">
        <Link to="/register">Create account</Link>
      </div>
    </div>
  );
}

function VerificationEmailPanel({
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
  const isComplete = emailDispatchRun.status === "complete";
  const recipientText =
    typeof emailDispatchRun.recipientCount === "number"
      ? `${emailDispatchRun.recipientCount} recipient${emailDispatchRun.recipientCount === 1 ? "" : "s"}`
      : "your email address";

  const steps: VerificationEmailStep[] = [
    {
      label: "Queued",
      detail: emailDispatchRun.messageId
        ? `Message ${emailDispatchRun.messageId.slice(0, 8)} accepted for ${recipientText}.`
        : `Verification email accepted for ${recipientText}.`,
      status: "complete"
    },
    {
      label: "Starting dispatcher",
      detail: hasDispatcher
        ? "RabbitMQ shows an attached email dispatcher consumer."
        : "Low-cost mode may need a short moment to start the idle email worker.",
      status: hasDispatcher || hasWebhookEventForRun || isComplete ? "complete" : "active"
    },
    {
      label: "Sending email",
      detail: hasWebhookEventForRun
        ? "A provider webhook event arrived after the verification email was queued."
        : "The email may arrive while this page continues watching for provider evidence.",
      status: hasWebhookEventForRun || isComplete ? "complete" : hasDispatcher ? "active" : "pending"
    },
    {
      label: "Check inbox",
      detail: "Use the verification link in your email to complete the login process. You may close this browser window.",
      status: isComplete ? "complete" : "pending"
    }
  ];

  return (
    <section className="worker-run-panel auth-worker-run mb-3" aria-label="Verification email progress">
      <div className="worker-run-summary">
        <div>
          <h2 className="h6 mb-1">Verification email status</h2>
          <p className="text-muted mb-0">
            Account creation queues a verification email. If the dispatcher is sleeping, Azure starts it on demand.
          </p>
        </div>
        <span className={`worker-run-state ${isComplete ? "complete" : "active"}`}>
          {isComplete ? "Ready" : "In progress"}
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

type VerificationEmailStep = {
  label: string;
  detail: string;
  status: "pending" | "active" | "complete";
};

function extractLastWebhookEventAt(evidence: string | undefined): string | null {
  const match = evidence?.match(/Last event: (\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z)/);

  if (!match?.[1]) {
    return null;
  }

  return Number.isNaN(new Date(match[1]).getTime()) ? null : match[1];
}

function getInitialFormState(message: string | undefined, verified: string | null): FormState {
  if (message) {
    return { status: "success", message };
  }

  if (verified === "1") {
    return { status: "success", message: "Email verified. You can now log in." };
  }

  if (verified === "0") {
    return { status: "error", message: "Email verification failed or the link has expired." };
  }

  return { status: "idle" };
}
