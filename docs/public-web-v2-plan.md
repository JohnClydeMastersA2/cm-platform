# Public Web v2 Plan

The current public website is a Vite, TypeScript, Bootstrap application with a custom hash router. It has worked well enough to launch the portfolio, but `apps/public-web/src/main.ts` now carries too many responsibilities: route selection, page rendering, API type definitions, Bootstrap setup, interactive page behavior, and navigation state.

Public Web v2 is a side-by-side React implementation intended to improve maintainability while preserving the low-cost hosting model.

## Goals

- Keep the current production site stable while the replacement is explored.
- Learn React through the real CM Platform portfolio instead of a toy app.
- Move from hash URLs like `/#cicd` toward path URLs like `/cicd`.
- Keep Bootstrap as the visual foundation so the site does not need a full redesign.
- Port static portfolio pages before interactive demo pages.
- Switch production only after the v2 app is clearly better.

## Commit 1 Scope

Commit 1 creates `apps/public-web-v2` as an isolated workspace. It proves that React, Vite, TypeScript, React Router, and Bootstrap can run together without changing the current production app.

React is responsible for:

- Rendering the shared application shell.
- Rendering the active page based on the URL.
- Applying active navigation state.
- Breaking page content into small components instead of building large HTML strings.

React is not responsible for:

- Hosting.
- Azure Container Apps.
- GitHub Actions.
- Database behavior.
- RabbitMQ behavior.
- Fastify API behavior.

Those parts of the platform remain unchanged.

## Migration Order

1. Create the React v2 skeleton.
2. Port static pages such as Home, CI/CD, Secrets, Security, IAM, and Architectural Decisions.
3. Review layout and navigation on desktop and mobile.
4. Port one interactive demo page to prove API integration.
5. Decide whether to continue porting the remaining demos.
6. Update Docker and deployment only after local review shows v2 is ready.

## Portfolio Talking Point

This work demonstrates a deliberate front-end modernization path: preserve the production system, introduce a parallel React application, migrate content incrementally, and keep deployment risk low while learning a marketable client-side framework.
