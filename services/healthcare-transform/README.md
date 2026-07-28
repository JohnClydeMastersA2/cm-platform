# Healthcare Transform

Java/Spring Boot healthcare document transformation and archive microservice for CM Platform.

This service is deployed as an internal-only Azure Container App. It is not exposed
directly to the public internet or wired into `public-web` yet.

`svc-core` now provides the controlled platform-facing path for curated source
documents and archive JSON retrieval. The Java service remains internal-only.

## Current Scope

- Spring Boot service skeleton
- Java 21
- HTTP health/readiness endpoints
- Capabilities endpoint
- First-slice ASC X12 835 parse endpoint
- Multipart ASC X12 835 upload validation with public-mode rejection of unapproved source documents
- Curated 835 source document catalog
- Process-by-source-document endpoint with duplicate detection
- Read-only archive retrieval for original EDI and transformed JSON artifacts
- Dedicated MongoDB persistence for submission status and binary artifacts

## Local Development

Start the shared local infrastructure first:

```powershell
npm run infra:up
```

Then start the service from the repository root:

```powershell
npm run healthcare-transform:dev
```

The startup script loads the dedicated authenticated
`HEALTHCARE_TRANSFORM_MONGODB_URI` setting from the ignored
`packages/secrets/cm-platform.env` file. The healthcare-transform identity has
access only to the `healthcare_transform` database and is separate from the
MongoDB identity used by other CM Platform services. The script does not print
the connection string or credentials.

Run tests from the service directory with:

```powershell
Set-Location services/healthcare-transform
.\mvnw.cmd test
```

The service defaults to:

```text
http://localhost:8081
```

The standard local startup command expects MongoDB at `localhost:27017` and uses
the dedicated authenticated application connection configured for
`healthcare_transform`. Direct Maven startup can override either value with:

```text
HEALTHCARE_TRANSFORM_MONGODB_URI
HEALTHCARE_TRANSFORM_MONGODB_DATABASE
```

Do not commit an Atlas connection string or password to the repository.

Production uses a separate GitHub environment secret named
`HEALTHCARE_TRANSFORM_MONGODB_URI`. The corresponding Atlas database user must
have access only to `healthcare_transform`; it must not reuse the
`MONGODB_URI` identity used by `svc-core`.

## Maven Commands

Run these commands from:

```powershell
cd C:\cm-platform\services\healthcare-transform
```

Use the Maven wrapper instead of a globally installed Maven command. On Windows, the wrapper is:

```powershell
.\mvnw.cmd
```

Common commands:

```powershell
.\mvnw.cmd test
```

Compiles the service and runs the test suite.

```powershell
.\mvnw.cmd spring-boot:run
```

Starts the Spring Boot service locally and keeps it running until stopped with `Ctrl+C`.

```powershell
.\mvnw.cmd package
```

Compiles, runs tests, and builds the runnable Spring Boot jar under `target/`.

```powershell
.\mvnw.cmd -DskipTests package
```

Builds the runnable jar without running tests. Use this only when you intentionally want a faster packaging pass.

```powershell
.\mvnw.cmd clean
```

Deletes Maven build output under `target/`.

```powershell
.\mvnw.cmd clean test
```

Deletes previous build output, recompiles, and runs tests from a clean state.

```powershell
.\mvnw.cmd clean package
```

Deletes previous build output, recompiles, runs tests, and builds a fresh jar.

Useful Maven terms:

```text
goal       A specific Maven action, such as test, package, or clean.
phase      A lifecycle step. package includes earlier steps such as compile and test.
wrapper    The checked-in mvnw/mvnw.cmd scripts that download/use a consistent Maven version.
target/    Maven's build output directory.
```

## Endpoints

```text
GET  /health
GET  /ready
GET  /api/documents/capabilities
POST /api/documents
GET  /api/documents
GET  /api/documents/{id}
GET  /api/documents/{id}/raw
GET  /api/documents/{id}/json
GET  /api/source-documents
GET  /api/source-documents/{sourceId}
POST /api/source-documents/{sourceId}/process
POST /api/x12/835/parse
```

`GET /api/source-documents` lists the curated sample 835 files that are safe for
the public demo. `POST /api/source-documents/{sourceId}/process` processes one
of those known files without requiring the user to download and re-upload it.
Repeated processing of the same source document returns the existing completed
submission for the same source hash and parser version.

`GET /api/documents/{id}/raw` returns the archived original EDI artifact.
`GET /api/documents/{id}/json` returns the archived transformed JSON artifact.
Both endpoints are read-only and return `ARTIFACT_NOT_FOUND` if the requested
artifact does not exist for the submission.

`POST /api/documents` accepts a multipart field named `file`, rejects empty,
unsupported, malformed, larger-than-10-MiB, or unapproved source files. In the
default public-safe mode, valid 835 uploads are accepted only when the uploaded
file SHA-256 matches the curated source-document catalog. Rejected unapproved
uploads are not stored.

Unapproved upload responses include safe diagnostic metadata such as received
time, filename, content type, size, SHA-256, and detected document type:

```json
{
  "code": "UNAPPROVED_SOURCE_DOCUMENT",
  "message": "Uploaded healthcare documents are not accepted in this public demo. Choose one of the curated source 835 files instead.",
  "timestamp": "2026-07-27T20:30:00Z",
  "details": {
    "receivedAt": "2026-07-27T20:30:00Z",
    "filename": "example.edi",
    "contentType": "text/plain",
    "size": 2048,
    "sha256": "...",
    "documentType": "X12_835"
  }
}
```

When accepted, files are stored in MongoDB. The `submissions` collection
contains workflow metadata; the `artifacts` collection stores original and
transformed file bytes separately.

Example:

```powershell
curl.exe -F "file=@src/test/resources/x12/835/minimal-835.edi" http://localhost:8081/api/documents
curl.exe http://localhost:8081/api/documents
curl.exe http://localhost:8081/api/source-documents
curl.exe -X POST http://localhost:8081/api/source-documents/emedny-835-professional-with-payment/process
```

For local parser/archive development before the curated source catalog exists,
set:

```text
HEALTHCARE_TRANSFORM_ALLOW_UNAPPROVED_UPLOADS=true
```

The 835 parser currently extracts:

```text
ISA / GS / ST envelope values
BPR payment summary
TRN trace values
N1 payer and payee basics
```

Search beyond the recent-submissions list is still planned future work.

## Platform Proxy

`apps/svc-core` proxies the curated workflow through:

```text
GET  /healthcare/source-documents
GET  /healthcare/source-documents/{sourceId}
POST /healthcare/source-documents/{sourceId}/process
GET  /healthcare/documents/{documentId}
GET  /healthcare/documents/{documentId}/json
```

Raw EDI retrieval intentionally remains available only on the internal Java
service for now.
