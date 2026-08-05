import type { AnchorHTMLAttributes, MouseEvent, PropsWithChildren } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type NavigationOptions = {
  replace?: boolean;
  state?: unknown;
};

type AppLocation = {
  pathname: string;
  search: string;
  hash: string;
  state: unknown;
};

type RouterContextValue = {
  location: AppLocation;
  navigate: (to: string, options?: NavigationOptions) => void;
};

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
};

type NavLinkProps = Omit<LinkProps, "className"> & {
  className?: string | ((state: { isActive: boolean }) => string);
  end?: boolean;
};

const RouterContext = createContext<RouterContextValue | null>(null);

export function BrowserRouter({ children }: PropsWithChildren) {
  const [location, setLocation] = useState<AppLocation>(() => readLocation());

  useEffect(() => {
    function handlePopState() {
      setLocation(readLocation());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const value = useMemo<RouterContextValue>(
    () => ({
      location,
      navigate(to, options) {
        const url = new URL(to, window.location.origin);
        const nextPath = `${url.pathname}${url.search}${url.hash}`;

        if (options?.replace) {
          window.history.replaceState(options.state ?? null, "", nextPath);
        } else {
          window.history.pushState(options?.state ?? null, "", nextPath);
        }

        setLocation(readLocation());
        window.scrollTo({ top: 0 });
      }
    }),
    [location]
  );

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function Link({ to, onClick, children, ...props }: LinkProps) {
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);

    if (event.defaultPrevented || shouldUseBrowserNavigation(event, to)) {
      return;
    }

    event.preventDefault();
    navigate(to);
  }

  return (
    <a href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}

export function NavLink({ className, end = false, to, ...props }: NavLinkProps) {
  const { pathname } = useLocation();
  const isActive = end ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);
  const resolvedClassName = typeof className === "function" ? className({ isActive }) : className;

  return <Link className={resolvedClassName} to={to} {...props} />;
}

export function useLocation(): AppLocation {
  return useRouter().location;
}

export function useNavigate(): RouterContextValue["navigate"] {
  return useRouter().navigate;
}

function useRouter(): RouterContextValue {
  const context = useContext(RouterContext);

  if (!context) {
    throw new Error("Router hooks must be used within BrowserRouter.");
  }

  return context;
}

function readLocation(): AppLocation {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    state: window.history.state
  };
}

function shouldUseBrowserNavigation(event: MouseEvent<HTMLAnchorElement>, to: string): boolean {
  return (
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey ||
    Boolean(event.currentTarget.target) ||
    isExternalUrl(to)
  );
}

function isExternalUrl(to: string): boolean {
  try {
    return new URL(to, window.location.origin).origin !== window.location.origin;
  } catch {
    return true;
  }
}
