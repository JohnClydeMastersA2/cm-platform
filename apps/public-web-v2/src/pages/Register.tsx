import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

type FormStatus = "idle" | "submitting" | "success" | "error";

type FormState = {
  status: FormStatus;
  message?: string;
};

export function Register() {
  const navigate = useNavigate();
  const [formState, setFormState] = useState<FormState>({ status: "idle" });
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");

  const isSubmitting = formState.status === "submitting";

  async function submitRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormState({ status: "submitting" });

    try {
      const response = await fetch("/auth/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ emailAddress, password })
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to create account"));
      }

      setEmailAddress("");
      setPassword("");
      navigate("/login", {
        state: {
          message:
            "Complete the verification process by checking your email and clicking on the Verify link. Clicking on the verification link will open a new page in your browser and you may continue to work in that session. You may close this browser window."
        }
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to create account."
      });
    }
  }

  return (
    <div className="auth-panel">
      <h1 className="h3 mb-2">Create Account</h1>
      <p className="text-muted">
        Creating an account is not required to use the CM Platform demos. If you do create one, you can
        participate in the account creation workflow, including email confirmation and session
        inspection. You can delete your account at any time from My Account / Session State.
      </p>

      <StatusMessage state={formState} />

      <form onSubmit={submitRegister}>
        <div className="mb-3">
          <label className="form-label" htmlFor="register-email">
            Email address
          </label>
          <input
            className="form-control"
            id="register-email"
            name="emailAddress"
            type="email"
            autoComplete="email"
            value={emailAddress}
            onChange={(event) => setEmailAddress(event.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label className="form-label" htmlFor="register-password">
            Password
          </label>
          <input
            className="form-control"
            id="register-password"
            name="password"
            type="password"
            minLength={8}
            maxLength={200}
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <button className="btn btn-primary w-100" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating..." : "Create Account"}
        </button>
      </form>

      <div className="mt-3 text-center">
        <Link to="/login">Already have an account?</Link>
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
