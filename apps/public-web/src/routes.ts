import { ArchitecturalDecisions } from "./pages/ArchitecturalDecisions";
import { Account } from "./pages/Account";
import { Cicd } from "./pages/Cicd";
import { CompetingConsumers } from "./pages/CompetingConsumers";
import { Home } from "./pages/Home";
import { Healthcare } from "./pages/Healthcare";
import { HealthcareDocuments } from "./pages/HealthcareDocuments";
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

export type AppRouteGroup = {
  id: string;
  label: string;
  items: Array<{
    path: AppRoute["path"];
    label: string;
  }>;
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
    label: "Account Creation",
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
  },
  {
    path: "/transform-healthcare",
    label: "Healthcare Transform",
    Component: Healthcare
  },
  {
    path: "/healthcare-documents",
    label: "Healthcare Documents",
    Component: HealthcareDocuments
  }
];

export const routeGroups: AppRouteGroup[] = [
  {
    id: "platform",
    label: "Platform",
    items: [
      { path: "/", label: "Overview" },
      { path: "/architectural-decisions", label: "Architectural Decisions" },
      { path: "/infrastructure", label: "Infrastructure Status" },
      { path: "/cicd", label: "CI/CD and Azure" },
      { path: "/security", label: "Security Review" },
      { path: "/secrets", label: "Configuration & Secrets" }
    ]
  },
  {
    id: "data-stores",
    label: "Data Stores",
    items: [{ path: "/mongodb", label: "NoSQL with MongoDB" }]
  },
  {
    id: "identity-access",
    label: "Identity and Access",
    items: [
      { path: "/iam", label: "Account Creation" },
      { path: "/register", label: "Create Account" },
      { path: "/login", label: "Login" }
    ]
  },
  {
    id: "messaging",
    label: "Messaging with RabbitMQ",
    items: [
      { path: "/widgets", label: "Queue Basics, Retry and DLQs" },
      { path: "/competing-consumers", label: "Competing Consumers" },
      { path: "/topic-routing", label: "Topic Routing" },
      { path: "/priority-queue", label: "Priority Queue" }
    ]
  },
  {
    id: "healthcare-transform",
    label: "Healthcare Transform Microservice",
    items: [
      { path: "/transform-healthcare", label: "Healthcare Transform" },
      { path: "/healthcare-documents", label: "Healthcare Documents" }
    ]
  },
  {
    id: "my-account",
    label: "My Account",
    items: [{ path: "/account", label: "Session State" }]
  }
];
