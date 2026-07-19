import type { FormState } from "../types/forms";

export function StatusMessage({ state }: { state: FormState }) {
  if (state.status === "success") {
    return <div className="alert alert-success">{state.message ?? "Success."}</div>;
  }

  if (state.status === "error") {
    return <div className="alert alert-danger">{state.message ?? "Request failed."}</div>;
  }

  return null;
}
