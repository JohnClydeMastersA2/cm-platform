import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "./style.css";

type Page = "iam" | "login" | "register" | "account";
type FormStatus = "idle" | "submitting" | "success" | "error";

type AuthAccount = {
  accountId: number;
  emailAddress: string;
  emailVerifiedAt: string | null;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type FormState = {
  status: FormStatus;
  message?: string;
};

let account: AuthAccount | null = null;
let currentPage: Page | null = null;

const loginState: FormState = { status: "idle" };
const registerState: FormState = { status: "idle" };
const accountState: FormState = { status: "idle" };

function getCurrentPage(): Page {
  const hash = window.location.hash.replace("#", "");

  if (hash === "iam") return "iam";
  if (hash === "register") return "register";
  if (hash === "account") return "account";

  return "login";
}

function layout(content: string): string {
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
              class="publisher-nav-toggle"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#identityAccessNav"
              aria-expanded="true"
              aria-controls="identityAccessNav"
            >
              Identity and Access
            </button>
            <div class="collapse show" id="identityAccessNav">
              <div class="publisher-nav-group">
                <a class="publisher-nav-link" href="#iam">Overview</a>
                <a class="publisher-nav-link" href="#register">Create Account</a>
                <a class="publisher-nav-link" href="#login">Login</a>
              </div>
            </div>

            <button
              class="publisher-nav-toggle"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#myAccountNav"
              aria-expanded="true"
              aria-controls="myAccountNav"
            >
              My Account
            </button>
            <div class="collapse show" id="myAccountNav">
              <div class="publisher-nav-group">
                <a class="publisher-nav-link" href="#account">Session State</a>
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

    const body = (await response.json()) as { account: AuthAccount };
    account = body.account;
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
      return;
    }

    const body = (await response.json()) as { account: AuthAccount };
    account = body.account;
  } catch {
    account = null;
  }
}

async function logout(): Promise<void> {
  await fetch("/auth/logout", { method: "POST" });
  account = null;
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

async function readError(response: Response, fallback: string): Promise<string> {
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return body?.error ?? `${fallback} (${response.status})`;
}

function bindEvents(): void {
  const registerForm = document.querySelector<HTMLFormElement>('[data-form="register"]');
  const loginForm = document.querySelector<HTMLFormElement>('[data-form="login"]');

  registerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitRegister(registerForm);
  });

  loginForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitLogin(loginForm);
  });

  document.querySelector<HTMLButtonElement>('[data-action="logout"]')?.addEventListener("click", () => {
    void logout();
  });

  document.querySelector<HTMLButtonElement>('[data-action="delete-account"]')?.addEventListener("click", () => {
    void deleteAccount();
  });
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app");

  if (!app) {
    throw new Error("Missing #app element");
  }

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
          : loginPage();

  app.innerHTML = layout(content);
  bindEvents();
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

window.addEventListener("hashchange", render);

await loadCurrentAccount();
render();
