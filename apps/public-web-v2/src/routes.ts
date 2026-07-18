import { ArchitecturalDecisions } from "./pages/ArchitecturalDecisions";
import { Account } from "./pages/Account";
import { Cicd } from "./pages/Cicd";
import { CompetingConsumers } from "./pages/CompetingConsumers";
import { Home } from "./pages/Home";
import { Iam } from "./pages/Iam";
import { Infrastructure } from "./pages/Infrastructure";
import { Login } from "./pages/Login";
import { Mongodb } from "./pages/Mongodb";
import { PriorityQueue } from "./pages/PriorityQueue";
import { Register } from "./pages/Register";
import { Secrets } from "./pages/Secrets";
import { Security } from "./pages/Security";
import { Widgets } from "./pages/Widgets";
import { TopicRouting } from "./pages/TopicRouting";

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
    path: "/architectural-decisions",
    label: "Architectural Decisions",
    Component: ArchitecturalDecisions
  },
  {
    path: "/infrastructure",
    label: "Infrastructure Status",
    Component: Infrastructure
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
  },
  {
    path: "/iam",
    label: "IAM Overview",
    Component: Iam
  },
  {
    path: "/register",
    label: "Create Account",
    Component: Register
  },
  {
    path: "/login",
    label: "Login",
    Component: Login
  },
  {
    path: "/account",
    label: "Session State",
    Component: Account
  },
  {
    path: "/mongodb",
    label: "NoSQL with MongoDB",
    Component: Mongodb
  },
  {
    path: "/widgets",
    label: "Queue Basics, Retry and DLQs",
    Component: Widgets
  },
  {
    path: "/competing-consumers",
    label: "Competing Consumers",
    Component: CompetingConsumers
  },
  {
    path: "/topic-routing",
    label: "Topic Routing",
    Component: TopicRouting
  },
  {
    path: "/priority-queue",
    label: "Priority Queue",
    Component: PriorityQueue
  }
];
