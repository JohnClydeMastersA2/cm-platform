import type { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { routes } from "../routes";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/">
          <span className="brand-mark">
            <img src="/cmplatform-icon.svg" alt="" aria-hidden="true" />
          </span>
          <span>
            <strong>CM Platform</strong>
            <small>Technical Portfolio</small>
          </span>
        </Link>
        <nav aria-label="Primary navigation" className="nav nav-pills flex-column gap-1">
          {routes.map((route) => (
            <NavLink
              key={route.path}
              to={route.path}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
              end={route.path === "/"}
            >
              {route.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}
