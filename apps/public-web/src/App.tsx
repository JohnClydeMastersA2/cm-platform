import { useEffect } from "react";
import { AppShell } from "./layout/AppShell";
import { routes } from "./routes";
import { BrowserRouter, useLocation, useNavigate } from "./lib/router";

export function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <CurrentRoute />
      </AppShell>
    </BrowserRouter>
  );
}

function CurrentRoute() {
  const location = useLocation();
  const navigate = useNavigate();
  const route = routes.find((candidate) => candidate.path === location.pathname);

  useEffect(() => {
    if (!route) {
      navigate("/", { replace: true });
    }
  }, [navigate, route]);

  if (!route) {
    return null;
  }

  return <route.Component />;
}
