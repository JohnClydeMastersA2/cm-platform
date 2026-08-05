import type { PropsWithChildren } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, useLocation } from "../lib/router";
import { routeGroups } from "../routes";

type OpenGroups = Record<string, boolean>;

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const activeGroupId = useMemo(() => findActiveGroupId(location.pathname), [location.pathname]);
  const activeRouteLabel = useMemo(() => findActiveRouteLabel(location.pathname), [location.pathname]);
  const [openGroups, setOpenGroups] = useState<OpenGroups>(() => buildInitialOpenGroups(activeGroupId));
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!activeGroupId) {
      return;
    }

    setOpenGroups((current) => ({
      ...current,
      [activeGroupId]: true
    }));
  }, [activeGroupId]);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) => ({
      ...current,
      [groupId]: !current[groupId]
    }));
  }

  function closeMobileMenu() {
    setIsMobileMenuOpen(false);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Link className="brand" to="/" onClick={closeMobileMenu}>
            <span className="brand-mark">
              <img src="/cmplatform-icon.svg" alt="" aria-hidden="true" />
            </span>
            <span>
              <strong>CM Platform</strong>
              <small>Technical Portfolio</small>
            </span>
          </Link>
          <button
            className="btn btn-sm btn-outline-light sidebar-menu-toggle"
            type="button"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
            aria-controls="sidebarNav"
            aria-expanded={isMobileMenuOpen}
          >
            Menu
          </button>
        </div>
        <div className="sidebar-current-page" aria-live="polite">
          {activeRouteLabel}
        </div>
        <nav aria-label="Primary navigation" className={`sidebar-nav${isMobileMenuOpen ? " mobile-open" : ""}`} id="sidebarNav">
          {routeGroups.map((group) => {
            const isOpen = openGroups[group.id] ?? false;
            const isActiveGroup = group.id === activeGroupId;

            return (
              <section className="sidebar-nav-section" key={group.id}>
                <button
                  className={`sidebar-nav-toggle${isOpen ? "" : " collapsed"}${isActiveGroup ? " active-group" : ""}`}
                  type="button"
                  onClick={() => toggleGroup(group.id)}
                  aria-expanded={isOpen}
                  aria-controls={`${group.id}-nav`}
                >
                  {group.label}
                </button>
                <div className={`sidebar-nav-group${isOpen ? " show" : ""}`} id={`${group.id}-nav`}>
                  {group.items.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
                      end={item.path === "/"}
                      onClick={closeMobileMenu}
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </section>
            );
          })}
        </nav>
      </aside>

      <main className="content">{children}</main>
    </div>
  );
}

function buildInitialOpenGroups(activeGroupId: string | null): OpenGroups {
  return Object.fromEntries(routeGroups.map((group) => [group.id, group.id === activeGroupId]));
}

function findActiveGroupId(pathname: string): string | null {
  return (
    routeGroups.find((group) =>
      group.items.some((item) => (item.path === "/" ? pathname === "/" : pathname === item.path))
    )?.id ?? null
  );
}

function findActiveRouteLabel(pathname: string): string {
  return (
    routeGroups.flatMap((group) => group.items).find((item) => (item.path === "/" ? pathname === "/" : pathname === item.path))
      ?.label ?? "Overview"
  );
}
