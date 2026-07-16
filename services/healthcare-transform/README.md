# Healthcare Transform

Java/Spring Boot healthcare document transformation and archive microservice for CM Platform.

This service is currently a local-only scaffold. It is not wired into production deployment, Azure Container Apps, `svc-core`, or `public-web` yet.

## Current Scope

- Spring Boot service skeleton
- Java 21
- HTTP health/readiness endpoints
- Capabilities endpoint
- Placeholder ASC X12 835 parse endpoint

## Local Development

This service uses Maven through the project-local Maven wrapper.

From this directory:

```powershell
.\mvnw.cmd spring-boot:run
```

Run tests with:

```powershell
.\mvnw.cmd test
```

The service defaults to:

```text
http://localhost:8081
```

## Endpoints

```text
GET  /health
GET  /ready
GET  /api/documents/capabilities
POST /api/x12/835/parse
```

The 835 endpoint is intentionally a stub in the first scaffold. It accepts a payload and returns a placeholder response so the service boundary can be exercised before parser/archive storage is added.
