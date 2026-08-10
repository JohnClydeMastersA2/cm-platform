# Healthcare Document Viewer Plan

## Purpose

Plan a standalone public-web document viewer for processed healthcare documents,
starting with ASC X12 835 output. The viewer should let a user find a processed
835 archive record and choose a human-readable document view, such as EOB or
Remit, while still preserving access to parser JSON for development and
validation.

The EOB view should start from a defined content inventory: sections, ordering,
repeated collections, and displayed fields. That inventory should guide what the
new document viewer needs to show without forcing the visual design, internal
data model, or rendering technology.

## Product Direction

Keep the current Healthcare Transform page focused on the curated processing
workflow:

```text
choose curated 835 -> process -> inspect parser/archive result
```

Add a separate document viewer workflow:

```text
search processed 835s -> select archive record -> choose EOB, Remit, JSON, or technical view
```

This separation keeps the transform page useful as a microservice demo and lets
the document viewer become the user-facing archive/document experience.

## Preferred Responsibility Split

Preferred data flow:

```text
healthcare-transform
  parses and archives raw 835 + structured JSON

svc-core
  exposes a thin, controlled /healthcare/... platform facade

public-web
  searches processed documents
  maps healthcare JSON into document view models
  renders EOB, Remit, JSON, and technical views
```

The Java microservice should not return finished HTML as the primary integration
path. It should return structured healthcare data and archive metadata. The
website should own presentation, navigation, layout, and document-view
interaction.

Future option:

```text
GET /api/documents/{documentId}/eob
```

If added later, this should initially return an EOB JSON view model rather than
HTML. That would move some mapping work into the microservice while still
keeping web rendering in public-web.

## Why Not Return HTML From The Microservice

Returning HTML from healthcare-transform would couple the Java service to the
web presentation layer. That would make visual changes require Java service
changes and would make the output less reusable for tests, alternate UIs, API
consumers, or downloads.

Returning JSON keeps the microservice boundary cleaner:

- healthcare-transform owns parsing, archive state, parser versions, source
  validation, duplicate detection, and healthcare-domain data
- svc-core owns public/platform access controls and route exposure
- public-web owns document layout and interaction

## EOB Content Inventory

Use the following section list as the first EOB field inventory.

Sections in display order:

1. Payer
2. Provider
3. Summary
4. Detail
5. Adjustments To Claim Totals
6. Other Claim Related Identification
7. Health Care Remarks
8. Claim Adjustment Reasons
9. Remittance Remark Advice Codes
10. Technical

Primary repeated collections:

- service payment lines
- service-line adjustment groups
- adjustment trios
- other claim related identifiers
- unique health care remarks
- unique claim adjustment reasons
- remittance advice remarks

The new UI can modernize layout, spacing, headings, and readability while
preserving this content checklist and section order.

## Initial EOB View Model

Create a frontend view model that represents what the EOB page needs, not the
raw X12 segments or parser internals.

Conceptual shape:

```ts
type EobDocument = {
  documentId: string;
  generatedAt: string;
  payer: EobParty;
  provider: EobParty;
  summary: EobSummary;
  serviceLines: EobServiceLine[];
  claimTotalAdjustments: EobClaimTotalAdjustments;
  otherClaimIdentifiers: EobReference[];
  healthCareRemarks: EobCodeDescription[];
  claimAdjustmentReasons: EobCodeDescription[];
  remittanceAdviceRemarks: EobCodeDescription[];
  technical: EobTechnicalInfo;
};
```

The fields should be optional or nullable where parser support is incomplete.
The page should render incomplete documents gracefully so each blank section can
serve as a parser roadmap.

## Initial Viewer UI

Proposed public-web navigation:

```text
Healthcare Transform Microservice
  Healthcare Transform
  Healthcare Documents
```

Proposed Healthcare Documents page:

- Search/filter panel for processed documents
- Results list/table of archive records
- Selected document summary
- View selector using tabs or segmented controls:
  - EOB
  - Remit
  - JSON
  - Technical

The current Healthcare Transform page can later include a small "Open in
Document Viewer" link after processing, but the full EOB/Remit experience
should live on the standalone document viewer page.

## API Needs

Current platform facade already supports:

```text
GET  /healthcare/documents/{documentId}
GET  /healthcare/documents/{documentId}/json
```

Likely next API additions:

```text
GET /healthcare/documents
GET /healthcare/documents?documentType=835&sourceFilename=...&payerName=...&traceNumber=...
```

The Java service should own the internal search behavior and searchable
metadata. `svc-core` should forward supported query parameters without
duplicating healthcare-specific search logic.

## Parser Development Roadmap

The EOB view should become a visible target for 835 parser advancement.

Initial mapping can populate fields that already exist in current parser JSON:

- payer name and ID
- provider/payee name and ID
- payment method
- payment amount
- payment date
- trace number
- source filename
- document ID
- parser/received timestamps

Next parser targets driven by the EOB:

1. claim-level patient/account identifiers
2. claim status and ICN
3. service line dates, procedure codes, billed amounts, allowed amounts, and
   paid amounts
4. service-line adjustment groups and reason codes
5. claim total adjustments
6. other claim related identifiers
7. health care remark codes
8. claim adjustment reason descriptions
9. remittance advice remark descriptions

## First Implementation Slice

Suggested first slice:

1. Add this planning document.
2. Inventory the EOB fields into a concrete `EobDocument` TypeScript type.
3. Add a stub `EobDocument` fixture.
4. Add a standalone Healthcare Documents page with static stub rendering.
5. Add a route under the Healthcare Transform Microservice navigation group.
6. Keep the current Healthcare Transform page unchanged.

This creates the target document surface before requiring deeper parser work.

## Second Implementation Slice

After the static view exists:

1. Add or expose processed-document search/list retrieval.
2. Map current HT JSON into the `EobDocument` view model.
3. Add the JSON and Technical tabs for comparison.
4. Add an "Open in Document Viewer" path from processed curated documents.

## Open Questions

- Should the first document viewer render only a selected known document, or
  should search/list retrieval come first?
- Should Remit be a separate view model or a different presentation of the same
  EOB/835-derived data?
- Should code descriptions be stored in parser JSON, derived in public-web, or
  resolved by a future healthcare-transform reference-code service?
- Should the EOB page support print/PDF styling in the first version, or wait
  until the data model stabilizes?
