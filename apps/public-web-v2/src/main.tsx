import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Navigate, NavLink, Route, Routes } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

type PortfolioPage = {
  path: string;
  label: string;
  eyebrow: string;
  title: string;
  body: string;
};

const pages: PortfolioPage[] = [
  {
    path: "/",
    label: "Home",
    eyebrow: "Public portfolio",
    title: "CM Platform",
    body:
      "This React v2 shell is a learning-focused replacement candidate for the current public website. It keeps the production app untouched while we prove a cleaner front-end structure."
  },
  {
    path: "/cicd",
    label: "CI/CD",
    eyebrow: "Delivery pipeline",
    title: "Deployment and CI/CD",
    body:
      "This page will eventually tell the Azure, GitHub Actions, container image, secret injection, and production approval story from docs/deployment-plan.md."
  },
  {
    path: "/security",
    label: "Security",
    eyebrow: "Hardening",
    title: "Security Checks",
    body:
      "This route will capture the platform hardening work: rate limiting, CSRF protection, security headers, ZAP baseline testing, and Azure Advisor review."
  },
  {
    path: "/secrets",
    label: "Secrets",
    eyebrow: "Configuration",
    title: "Configuration and Secrets",
    body:
      "This page will explain how local development and production both satisfy the same environment contract while keeping secret values out of source control."
  }
];

function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <a className="brand" href="/">
            <span className="brand-mark">CM</span>
            <span>
              <strong>CM Platform</strong>
              <small>React v2</small>
            </span>
          </a>
          <nav aria-label="Primary navigation" className="nav nav-pills flex-column gap-1">
            {pages.map((page) => (
              <NavLink
                key={page.path}
                to={page.path}
                className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                end={page.path === "/"}
              >
                {page.label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="content">
          <Routes>
            {pages.map((page) => (
              <Route key={page.path} path={page.path} element={<PortfolioContent page={page} />} />
            ))}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

function PortfolioContent({ page }: { page: PortfolioPage }) {
  return (
    <article className="content-card">
      <p className="eyebrow">{page.eyebrow}</p>
      <h1>{page.title}</h1>
      <p className="lead">{page.body}</p>

      <section className="learning-card">
        <h2>What React Is Driving Here</h2>
        <p>
          React is rendering the shared shell, choosing the active route, and updating the page without
          manually rebuilding HTML strings. Bootstrap still provides the visual vocabulary.
        </p>
      </section>
    </article>
  );
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
