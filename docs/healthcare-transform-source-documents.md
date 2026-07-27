# Healthcare Transform Source Documents

## Purpose

The curated source-document workflow lets CM Platform demonstrate ASC X12 835
parsing, transformation, and archive behavior without accepting arbitrary
healthcare uploads from the public. It gives users a safe set of known sample
835s to process while keeping real PHI, PII, and payment files out of the public
demo intake path.

The healthcare-transform service uses a curated source-document catalog for
public-demo 835 processing. Public users should choose a known sample document
instead of uploading arbitrary 835 files, because real 835s can contain PHI,
PII, and payment data.

## Location

```text
services/healthcare-transform/src/main/resources/source-documents/source-documents.json
services/healthcare-transform/src/main/resources/source-documents/x12/835/
```

The manifest is the whitelist. Each entry includes a source id, document type,
classpath resource path, SHA-256, source attribution, and a short description of
the parser scenario the sample covers.

## Curated Workflow

The service treats curated source documents as the safe entry point for public
835 processing:

1. `GET /api/source-documents` returns the approved sample catalog.
2. The user or UI selects one source document by `sourceId`.
3. `POST /api/source-documents/{sourceId}/process` asks the service to process
   that known document.
4. The service loads the EDI file from classpath resources and verifies its
   SHA-256 against `source-documents.json`.
5. If the hash does not match the manifest, processing fails because the
   checked-in source file no longer matches the approved catalog entry.
6. Before parsing, the service checks for an existing completed submission using
   `sourceDocumentId`, `sourceSha256`, and `parserVersion`.
7. If a matching completed submission already exists, the service returns that
   existing archive record instead of storing duplicate artifacts.
8. If no completed submission exists, the service parses the 835, stores the raw
   original artifact, stores the transformed JSON artifact, and records
   submission status in MongoDB.

This workflow gives the product a natural user action: choose a sample 835 and
process it. Users do not need to download a sample and upload it back to the
same system.

## Current Corpus

The current corpus contains nine small public/sample ASC X12 835 files:

- eMedNY inpatient DRG retro
- eMedNY institutional claims only
- eMedNY outpatient retro
- eMedNY pharmacy
- eMedNY professional no-payment
- eMedNY professional with payment
- Healthcare Data Insight all-fields example
- Healthcare Data Insight denial example
- Nevada Medicaid sample 835 extracted from PDF text

## API Shape

```text
GET  /api/source-documents
GET  /api/source-documents/{sourceId}
POST /api/source-documents/{sourceId}/process
```

The upload endpoint still exists, but it only accepts files whose SHA-256 matches
the curated catalog unless local development explicitly enables unapproved
uploads.

Unknown uploads return `UNAPPROVED_SOURCE_DOCUMENT` with safe diagnostic details
such as received time, filename, content type, size, SHA-256, and detected
document type. Rejected uploaded bytes are not persisted.
