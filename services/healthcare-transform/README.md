# Healthcare Transform

Java/Spring Boot healthcare document transformation and archive microservice for CM Platform.

This service is deployed as an internal-only Azure Container App. It is not exposed publicly and is not wired into `svc-core` or `public-web` yet.

## Current Scope

- Spring Boot service skeleton
- Java 21
- HTTP health/readiness endpoints
- Capabilities endpoint
- First-slice ASC X12 835 parse endpoint

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
POST /api/x12/835/parse
```

The 835 endpoint currently parses a small first slice of an ASC X12 835 payload:

```text
ISA / GS / ST envelope values
BPR payment summary
TRN trace values
N1 payer and payee basics
```

Archive storage and search are still planned future work.
