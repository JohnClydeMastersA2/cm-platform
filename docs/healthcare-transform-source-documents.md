# Healthcare Transform Source Documents

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
