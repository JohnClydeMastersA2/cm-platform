# Healthcare Transform Microservice Plan

## Purpose

Capture the current plan for adding a Java/Spring Boot healthcare document transformation and archive microservice to CM Platform.

The goal is to build a real microservice: a separately deployable, independently owned runtime with a clear healthcare document transformation and archive boundary. It should start small, but be named and shaped broadly enough to support more than one healthcare document format over time.

Initial focus:

- ASC X12 835 remittance advice parsing, archive, JSON transformation, and search

Future candidates:

- ASC X12 271 eligibility response parsing and archive
- Optional 270/271 request-response pairing
- NEMSIS XML-to-JSON transformation and archive

## Working Name

Preferred service name:

```text
services/healthcare-transform
```

Alternative names considered:

```text
services/edi-archive
services/x12-archive
```

`healthcare-transform` leaves room for NEMSIS because NEMSIS is XML, not X12.

## Microservice Goal

This effort is intentionally about adding a microservice, not just another library or parser utility.

The service should have:

- Its own Spring Boot runtime
- Its own build and test lifecycle
- Its own Docker image
- Its own Azure Container App deployment
- Its own health and readiness endpoints
- A narrow domain boundary around healthcare document transformation, archive, search, and retrieval

It should integrate with CM Platform through service boundaries such as HTTP, RabbitMQ, MongoDB, Postgres, Docker images, and environment variables.

## Why It Belongs In CM Platform

This fits the existing project because CM Platform already has:

- Docker-based local development
- Azure Container Apps deployment
- GHCR image publishing
- MongoDB for document-oriented storage
- RabbitMQ for asynchronous workflows
- Postgres for relational application data
- A public web app that can host an archive/search interface
- A core API service that can act as the platform front door

The healthcare transform service should be added as a separate deployable service, not folded into `apps/svc-core`.

## Service Boundary

The Java service owns:

- Receiving healthcare document payloads
- Parsing supported document types
- Storing the original/raw document
- Producing normalized JSON
- Extracting searchable metadata
- Exposing archive retrieval and search APIs
- Tracking parse status, validation errors, and retention/archive metadata

The Java service should not own:

- User-facing authentication
- The main platform UI shell
- General CM Platform business workflows
- Publisher/advertiser/account domain logic

Preferred integration shape:

```text
apps/public-web
  Archive/search interface

apps/svc-core
  Authenticated platform/front-door API

services/healthcare-transform
  Java/Spring Boot healthcare document transformation and archive domain
```

For early development, direct calls from `public-web` or local tools may be acceptable. Longer term, `svc-core` should remain the front door for authenticated platform access.

## API Ownership And Proxy Boundary

The healthcare-transform service owns the healthcare domain API. It should be
the only service that understands healthcare document parsing, curated source
document approval, artifact storage, archive status, parser versions, and
healthcare-specific retrieval behavior.

`apps/svc-core` may expose a platform-facing facade for selected
healthcare-transform capabilities, but it must stay thin. Its job is to provide
the public/platform entry point, apply platform concerns such as authentication,
rate limiting, CSRF policy, and operational error mapping, and forward allowed
requests to the Java service.

This means:

- `healthcare-transform` owns the domain behavior and internal API.
- `svc-core` owns controlled platform access to selected internal API calls.
- `svc-core` should not parse X12, duplicate healthcare archive rules, store
  healthcare artifacts, or become the owner of healthcare document state.
- Raw EDI retrieval can remain internal-only while the platform exposes safer
  curated catalog, processing, metadata, and JSON retrieval routes.

Current controlled platform facade:

```text
apps/public-web or other platform client
  -> apps/svc-core /healthcare/...
    -> services/healthcare-transform /api/...
```

Current proxied routes:

```text
GET  /healthcare/source-documents
GET  /healthcare/source-documents/{sourceId}
POST /healthcare/source-documents/{sourceId}/process
GET  /healthcare/documents/{documentId}
GET  /healthcare/documents/{documentId}/json
```

The proxy does not change the microservice boundary. It is closer to an API
gateway or backend-for-frontend pattern: the Java service still owns the
healthcare domain, while `svc-core` controls which internal capabilities are
made available to the broader platform.

## Container Platform Fit

The current container platform can support this service.

Expected additions:

- `services/healthcare-transform`
- `docker/Dockerfile.healthcare-transform`
- local Compose service entry, if containerized local testing is useful
- GHCR build/publish steps in `.github/workflows/build.yml`
- Azure Container App resource in `infra/bicep/container-apps.bicep`
- runtime environment variables for MongoDB, RabbitMQ, Postgres, and service configuration as needed

The service should be deployed as its own Azure Container App because it has a different runtime, dependency profile, and scaling pattern from the TypeScript services.

## Archive Model

The archive capability is a core part of the service, not an afterthought.

The service should store:

- Original raw payload
- Parsed JSON representation
- Common envelope/control metadata
- Transaction-specific searchable fields
- Parse status and validation messages
- Source metadata such as filename, trading partner, and received timestamp
- Retention metadata, including optional retention date or legal hold status

Conceptual document shape:

```json
{
  "documentId": "doc_123",
  "family": "ASC_X12",
  "documentType": "835",
  "rawPayload": "ISA*00*...",
  "parsedJson": {},
  "envelope": {
    "interchangeControlNumber": "...",
    "groupControlNumber": "...",
    "transactionControlNumber": "..."
  },
  "commonSearch": {
    "receivedAt": "2026-07-13T12:00:00Z",
    "sourceFilename": "sample-835.edi",
    "tradingPartner": "example-partner"
  },
  "transactionSearch": {
    "payerName": "...",
    "payeeNpi": "...",
    "traceNumber": "...",
    "paymentAmount": 123.45,
    "paymentDate": "2026-07-13"
  },
  "parseStatus": "parsed",
  "warnings": [],
  "errors": [],
  "retentionUntil": "2033-07-13"
}
```

MongoDB is the natural first storage target because the archive stores raw documents, parsed JSON, and flexible transaction-specific metadata. Postgres can be introduced later if relational reporting, audit workflow, or stronger operational querying becomes important.

## Initial API Sketch

Generic document endpoints:

```text
POST /documents
GET  /documents/{documentId}
GET  /documents/{documentId}/raw
GET  /documents/{documentId}/json
GET  /documents/search
GET  /health
GET  /ready
```

Possible transaction-specific search endpoints:

```text
GET /x12/835/documents
GET /x12/271/documents
```

Transaction-specific endpoints may be useful once search fields diverge enough that a single generic search route becomes awkward.

## First Slice

Minimum useful milestone:

- Spring Boot service skeleton
- Health and readiness endpoints
- 835 parse endpoint
- Store raw 835
- Store parsed JSON
- Extract basic searchable 835 metadata
- Search archived 835 documents by a few high-value fields
- Retrieve raw and parsed document by ID

High-value 835 search fields:

- ISA/GS/ST control numbers
- payer name or payer ID
- payee name, NPI, or tax ID
- TRN trace/check/EFT number
- BPR payment amount
- BPR payment method
- payment effective date
- claim identifiers
- patient control number
- received date
- source filename
- trading partner
- parse status

## Future 271 Support

271 support fits well as the next X12 transaction set.

Useful 271 search fields:

- payer name or payer ID
- provider NPI or tax ID
- subscriber/member ID
- patient name
- patient date of birth
- eligibility status
- service type codes
- benefit date range
- trace/control numbers
- received date
- source system or trading partner

If 270 support is added later, the service can optionally pair 270 inquiries with 271 responses using a correlation key or related document ID.

## Future NEMSIS Support

NEMSIS would broaden the service from X12 archive to healthcare document transformation.

The same service boundary can still work if the common abstraction remains:

```text
healthcare structured document in
raw archive
normalized JSON out
searchable metadata extracted
retrieval and retention APIs exposed
```

NEMSIS-specific parsing, validation, and search fields should live in a separate module from X12 support.

## Phased Roadmap

Phase 1:

- Add Spring Boot service under `services/healthcare-transform`
- Build 835 parser
- Provide synchronous 835 parse/archive/search endpoints
- Store raw and parsed documents in MongoDB

Phase 2:

- Add UI in `apps/public-web` for upload, search, raw view, and JSON view
- Route authenticated access through `apps/svc-core`

Phase 3:

- Add asynchronous processing with RabbitMQ for larger documents or batch workflows
- Add reparse/reindex operation for archived documents

Phase 4:

- Add X12 271 support
- Consider 270/271 pairing if request-response workflows become useful

Phase 5:

- Add NEMSIS XML-to-JSON support if the service still has a coherent healthcare document transformation boundary

## Open Questions

- Should the first service API be called directly by `public-web`, or only through `svc-core`?
- Should raw payloads be stored directly in MongoDB, or should large files eventually move to blob/object storage with MongoDB metadata?
- What retention period should be modeled for archived 835 documents?
- Should parsed JSON be versioned by parser version?
- How much PHI/PII should be allowed in local sample data?
- Which Java build tool should be used: Maven or Gradle?
- Should sample X12/NEMSIS payloads live in the repo, or only synthetic/de-identified fixtures?

## Design Principle

Build it inside CM Platform, but keep it clean enough to extract later.

The Java service should avoid direct dependencies on TypeScript packages. Integration should happen through HTTP, RabbitMQ, MongoDB, Postgres, Docker images, and environment variables.
