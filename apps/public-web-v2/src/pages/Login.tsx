import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

type FormStatus = "idle" | "submitting" | "success" | "error";

type FormState = {
  status: FormStatus;
  message?: string;
};

type LoginLocationState = {
  message?: string;
};

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as LoginLocationState | null;
  const [formState, setFormState] = useState<FormState>(
    locationState?.message ? { status: "success", message: locationState.message } : { status: "idle" }
  );
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");

  const isSubmitting = formState.status === "submitting";

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

function StatusMessage({ state }: { state: FormState }) {
  if (state.status === "success") {
    return <div className="alert alert-success">{state.message ?? "Success."}</div>;
  }

  if (state.status === "error") {
    return <div className="alert alert-danger">{state.message ?? "Request failed."}</div>;
  }

  return null;
}

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string; error?: string };
    return body.message ?? body.error ?? fallback;
  } catch {
    return fallback;
  }
}
