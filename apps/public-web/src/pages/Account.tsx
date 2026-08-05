import { useEffect, useState } from "react";
import { Link, useNavigate } from "../lib/router";
import { StatusMessage } from "../components/StatusMessage";
import { formatDate } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";
import type { FormState } from "../types/forms";

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

export function Account() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<AuthAccount | null>(null);
  const [authSession, setAuthSession] = useState<AuthSession | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    void loadCurrentAccount();
  }, []);

  async function loadCurrentAccount() {
    try {
      const response = await fetch("/auth/me");

      if (!response.ok) {
        setAccount(null);
        setAuthSession(null);
        return;
      }

      const body = (await response.json()) as { account: AuthAccount; session?: AuthSession | null };
      setAccount(body.account);
      setAuthSession(body.session ?? null);
    } catch {
      setAccount(null);
      setAuthSession(null);
    } finally {
      setIsLoaded(true);
    }
  }

  async function logout() {
    await csrfFetch("/auth/logout", { method: "POST" });
    setAccount(null);
    setAuthSession(null);
    setFormState({ status: "idle" });
    navigate("/login");
  }

  async function deleteAccount() {
    const confirmed = window.confirm("Delete this account? This frees the email address so you can repeat the flow.");

    if (!confirmed) {
      return;
    }

    setFormState({ status: "submitting" });

    try {
      const response = await csrfFetch("/auth/me", { method: "DELETE" });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to delete account"));
      }

      setAccount(null);
      setAuthSession(null);
      navigate("/register");
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to delete account."
      });
    }
  }

  if (!isLoaded) {
    return (
      <div className="auth-panel">
        <h1 className="h3 mb-2">Account</h1>
        <p className="text-muted">Loading account session...</p>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="auth-panel">
        <h1 className="h3 mb-2">Account</h1>
        <p className="text-muted">You are not logged in.</p>
        <Link className="btn btn-primary w-100" to="/login">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="auth-panel auth-panel-wide">
      <h1 className="h3 mb-2">My Account</h1>
      <p className="text-muted">This page shows the authenticated session state.</p>

      <StatusMessage state={formState} />
      <EmailVerificationNotice account={account} />

      <dl className="row mb-4">
        <dt className="col-sm-4">Account ID</dt>
        <dd className="col-sm-8">{account.accountId}</dd>

        <dt className="col-sm-4">Email address</dt>
        <dd className="col-sm-8">{account.emailAddress}</dd>

        <dt className="col-sm-4">Status</dt>
        <dd className="col-sm-8">{account.status}</dd>

        <dt className="col-sm-4">Email verified</dt>
        <dd className="col-sm-8">{account.emailVerifiedAt ? "Yes" : "No"}</dd>

        <dt className="col-sm-4">Created</dt>
        <dd className="col-sm-8">{formatDate(account.createdAt)}</dd>

        <dt className="col-sm-4">Last login</dt>
        <dd className="col-sm-8">{account.lastLoginAt ? formatDate(account.lastLoginAt) : "Never"}</dd>
      </dl>

      <h2 className="h5 mb-3">Current Session</h2>
      <dl className="row mb-4">
        <dt className="col-sm-4">Session ID</dt>
        <dd className="col-sm-8">{authSession ? authSession.authSessionId : "Unknown"}</dd>

        <dt className="col-sm-4">Cookie name</dt>
        <dd className="col-sm-8">cm_session</dd>

        <dt className="col-sm-4">Created</dt>
        <dd className="col-sm-8">{authSession ? formatDate(authSession.createdAt) : "Unknown"}</dd>

        <dt className="col-sm-4">Expires</dt>
        <dd className="col-sm-8">{authSession ? formatDate(authSession.expiresAt) : "Unknown"}</dd>

        <dt className="col-sm-4">Revoked</dt>
        <dd className="col-sm-8">{authSession?.revokedAt ? formatDate(authSession.revokedAt) : "No"}</dd>

        <dt className="col-sm-4">Time remaining</dt>
        <dd className="col-sm-8">{authSession ? formatRelativeExpiration(authSession.expiresAt) : "Unknown"}</dd>
      </dl>

      <div className="d-flex gap-2">
        <button className="btn btn-outline-secondary" type="button" onClick={() => void logout()}>
          Logout
        </button>
        <button
          className="btn btn-outline-danger ms-auto"
          type="button"
          onClick={() => void deleteAccount()}
          disabled={formState.status === "submitting"}
        >
          Delete Account
        </button>
      </div>
    </div>
  );
}

function EmailVerificationNotice({ account }: { account: AuthAccount }) {
  if (account.emailVerifiedAt) {
    return null;
  }

  return <div className="alert alert-warning">Your email address has not been verified yet. Check your email for the verification link.</div>;
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
