apps/svc-core        API/service
apps/public-web      public-facing web app
packages/contracts   shared API contracts
packages/logging     shared logging
tools/*              operational utilities

The project is organized as a TypeScript monorepo with three main buckets:

apps/*: runnable applications, currently svc-core and public-web
packages/*: shared libraries, like @cm/logging and @cm/contracts
tools/*: operational utilities, like the ETL importer

The current approach is to keep runnable apps focused on behavior, and move reusable cross-app concepts into packages.

*Feature Approach*

A feature module should represent an application capability or business area, not necessarily one table.

So offer, publisher, and advertiser are only good module names if they represent meaningful product capabilities. If they stay as thin wrappers around individual tables forever, the codebase will slowly become table-oriented instead of behavior-oriented.

The important thing is that the module boundary is chosen around the behavior: “publisher authentication,” not around each table.

In svc-core, API code is organized feature-first. Each business feature owns its own schema, repository, and routes in one folder:

      apps/svc-core/src/modules/offer/
            offer.schema.ts
            offer.repo.ts
            offer.routes.ts

      The intent is:
            *.schema.ts: feature types and validation exports
            *.repo.ts: database access and row-to-domain mapping
            *.routes.ts: Fastify route handlers for that feature
            surfaces/*: API surface composition

      A practical rule of thumb:

      If the route sounds like a noun list, table-style organization is probably fine:

      GET /internal/offers
      GET /internal/publishers

      If the route sounds like a workflow or action, use a behavior-oriented module:

      POST /publisher/auth/login
      POST /publisher/auth/mfa/challenge
      POST /publisher/auth/mfa/verify
      POST /publisher/offers/:offerId/subscribe

      That would become:

      modules/publisher-auth
      modules/offer-subscriptions

A “surface” is the public shape or entry point for a group of routes. For example:

 apps/svc-core/src/surfaces/internal.surface.ts

This file does not own business logic. It decides which feature routes belong under /internal, applies shared surface concerns like admin auth, and mounts each feature:

internalApp.register(offerRoutes, { prefix: "/offers" });

So the dependency direction is:

app.ts
  -> surfaces/internal.surface.ts
    -> modules/offer/offer.routes.ts
      -> modules/offer/offer.repo.ts
      -> modules/offer/offer.schema.ts

That keeps each feature locally understandable while still letting the app expose different API surfaces later, such as /internal, /public, or /publisher.

*Contracts*

A contract is the shared definition of the data and validation rules exchanged between parts of the system. In this project, contracts live in:

packages/contracts

For example:

packages/contracts/src/offer.ts
packages/contracts/src/publisher.ts
packages/contracts/src/advertiser.ts

These files define Zod schemas and TypeScript types for API-facing data. The important idea is that the API and frontend clients should not separately invent their own idea of what an Offer, Publisher, or request parameter looks like.

Instead, both sides can import from @cm/contracts.

The API uses contracts to validate and type its route inputs. Later, public-web can use the same contracts to type API responses and validate data coming back from the server. This reduces drift: if Offer changes, the compiler can show every affected place.

A contract is not a database model. It is the external agreement between system boundaries. The repo layer can know about database rows like OfferId and CreatedAt; the contract describes the API/domain shape like offerId and createdAt.

*Current Pattern*

The preferred pattern going forward is:

packages/contracts
  Defines shared API data shapes and validation

apps/svc-core/src/modules/{feature}
  Implements feature behavior using those contracts

apps/svc-core/src/surfaces
  Exposes features through named API surfaces

apps/public-web
  Consumes API endpoints using shared contracts
