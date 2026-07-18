import { Cicd } from "./pages/Cicd";
import { Home } from "./pages/Home";
import { Secrets } from "./pages/Secrets";
import { Security } from "./pages/Security";

export type AppRoute = {
  path: string;
  label: string;
  Component: () => React.ReactElement;
};

export const routes: AppRoute[] = [
  {
    path: "/",
    label: "Overview",
    Component: Home
  },
  {
    path: "/cicd",
    label: "CI/CD and Azure",
    Component: Cicd
  },
  {
    path: "/security",
    label: "Security Review",
    Component: Security
  },
  {
    path: "/secrets",
    label: "Configuration & Secrets",
    Component: Secrets
  }
];
