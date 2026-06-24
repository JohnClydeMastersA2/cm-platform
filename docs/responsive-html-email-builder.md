# Plan: TypeScript Responsive HTML Email Builder

## Objective

Create a reusable TypeScript email-builder package that allows application code to construct responsive HTML emails programmatically without hand-writing HTML.

The design should be inspired by a prior Java implementation that used a `Page` object with built-in responsive behavior, then allowed callers to add `Section` objects, text blocks, buttons, tables, and table rows. The new implementation should preserve that abstraction while targeting email-safe HTML rather than browser-oriented Bootstrap HTML.

The resulting package should allow code like:

```ts
const page = new EmailPage({
  title: "Daily Import Summary",
  previewText: "5 files processed, 1 with warnings",
});

page.addSection(
  new EmailSection("Import Results")
    .addParagraph("The following files were processed today.")
    .addTable(
      new EmailTable()
        .addHeader(["File", "Records", "Errors", "Status"])
        .addRow(["claims_001.xml", "1250", "0", "Completed"])
        .addRow(["claims_002.xml", "300", "4", "Completed with warnings"])
    )
);

const html = page.renderHtml();
const text = page.renderText();
```

## Important Design Principle

Do not require callers to write HTML.

Responsiveness should be centralized in the `EmailPage`, layout, and renderer logic. Individual sections and blocks should remain simple business-level objects.

Do not depend on Bootstrap directly. Bootstrap is browser-oriented and not reliable for HTML email clients. Instead, preserve the Bootstrap-like concepts:

* page container
* sections
* rows
* columns
* buttons
* tables
* spacing
* responsive behavior

Render those concepts into email-safe HTML using inline styles, conservative table-based layout, and limited media queries.

## Target Location

Create a reusable package in the monorepo:

```text
packages/
  email-builder/
    src/
      index.ts
      model/
      render/
      styles/
      utils/
      __tests__/
```

If the monorepo structure is not ready, create the package in:

```text
src/email-builder/
```

But prefer `packages/email-builder` if workspaces already exist.

## Initial Scope

Implement a first production-minded version supporting:

* `EmailPage`
* `EmailSection`
* `ParagraphBlock`
* `HeadingBlock`
* `ButtonBlock`
* `DividerBlock`
* `EmailTable`
* HTML rendering
* plain-text rendering
* theme support
* responsive mobile behavior
* basic escaping/sanitization
* unit/snapshot tests

Do not attempt to build a full email marketing platform. This is a transactional email builder.

## Core Classes / Types

### EmailPage

Responsible for the outer email document.

Properties:

```ts
type EmailPageOptions = {
  title: string;
  previewText?: string;
  theme?: EmailTheme;
  maxWidth?: number;
};
```

Responsibilities:

* store title
* store preview/preheader text
* hold ordered list of sections
* apply default theme
* render full HTML document
* render plain-text version
* own responsive shell
* own max-width container behavior

Methods:

```ts
class EmailPage {
  constructor(options: EmailPageOptions);

  addSection(section: EmailSection): this;

  renderHtml(): string;

  renderText(): string;
}
```

### EmailSection

Represents a logical content section inside the email.

Properties:

```ts
type EmailSectionOptions = {
  title?: string;
  variant?: "default" | "muted" | "warning" | "success";
};
```

Methods:

```ts
class EmailSection {
  constructor(title?: string, options?: Omit<EmailSectionOptions, "title">);

  addHeading(text: string): this;

  addParagraph(text: string): this;

  addButton(label: string, href: string): this;

  addDivider(): this;

  addTable(table: EmailTable): this;

  renderHtml(theme: EmailTheme): string;

  renderText(): string;
}
```

### EmailBlock

Use a discriminated union internally.

```ts
type EmailBlock =
  | HeadingBlock
  | ParagraphBlock
  | ButtonBlock
  | DividerBlock
  | TableBlock;
```

Example:

```ts
type ParagraphBlock = {
  type: "paragraph";
  text: string;
};

type ButtonBlock = {
  type: "button";
  label: string;
  href: string;
};

type HeadingBlock = {
  type: "heading";
  text: string;
};

type DividerBlock = {
  type: "divider";
};

type TableBlock = {
  type: "table";
  table: EmailTable;
};
```

## Table Support

This is a core feature.

The builder must support building tables programmatically, including use cases where rows are added while iterating over a result set.

### EmailTable

Methods:

```ts
class EmailTable {
  addHeader(headers: string[]): this;

  addRow(cells: Array<string | number | null | undefined>): this;

  renderHtml(theme: EmailTheme): string;

  renderText(): string;
}
```

Also support construction from arrays:

```ts
EmailTable.fromRows({
  headers: ["File", "Records", "Errors", "Status"],
  rows: results.map(r => [
    r.fileName,
    r.recordCount,
    r.errorCount,
    r.status,
  ]),
});
```

### Responsive Table Strategy

For version 1, render tables safely for email:

Desktop-oriented HTML:

* standard table
* full width
* collapsed borders
* padded cells
* header row
* inline styles

Mobile behavior:

* use a simple responsive strategy controlled by the page renderer
* prefer readable output over complex CSS
* consider stacked row rendering for narrow screens in a later enhancement

Version 1 can render tables as normal full-width tables, but structure the code so `mobileMode` can be added later:

```ts
type EmailTableOptions = {
  mobileMode?: "standard" | "stacked";
};
```

Default:

```ts
mobileMode: "standard"
```

Future:

```ts
mobileMode: "stacked"
```

## Theme Support

Create an `EmailTheme` type.

```ts
type EmailTheme = {
  fontFamily: string;
  pageBackground: string;
  contentBackground: string;
  textColor: string;
  mutedTextColor: string;
  primaryColor: string;
  borderColor: string;
  buttonTextColor: string;
  maxWidth: number;
};
```

Create a default theme:

```ts
export const defaultEmailTheme: EmailTheme = {
  fontFamily: "Arial, Helvetica, sans-serif",
  pageBackground: "#f4f4f5",
  contentBackground: "#ffffff",
  textColor: "#111827",
  mutedTextColor: "#6b7280",
  primaryColor: "#2563eb",
  borderColor: "#e5e7eb",
  buttonTextColor: "#ffffff",
  maxWidth: 640,
};
```

## Rendering Rules

### HTML Rendering

The HTML renderer should:

* generate a complete HTML document
* include `doctype`
* include `html`, `head`, and `body`
* include title
* include preview/preheader text
* use inline styles wherever practical
* use conservative email-safe markup
* center a max-width content container
* use table-based layout for outer shell if helpful
* avoid JavaScript
* avoid external CSS
* avoid external Bootstrap dependency

The generated HTML should be suitable for transactional email providers such as Resend, SendGrid, Mailgun, SMTP, or Nodemailer.

### Plain Text Rendering

Each page should also render a plain text version.

Example:

```ts
const html = page.renderHtml();
const text = page.renderText();
```

Plain-text rendering should include:

* title
* preview text if present
* section headings
* paragraphs
* button label plus URL
* table rows in readable form

Example table text:

```text
File | Records | Errors | Status
claims_001.xml | 1250 | 0 | Completed
claims_002.xml | 300 | 4 | Completed with warnings
```

## Escaping / Safety

Add a utility function:

```ts
escapeHtml(value: unknown): string
```

It should safely escape:

* `&`
* `<`
* `>`
* `"`
* `'`

Use this for all text content, table cells, headings, button labels, and URLs where applicable.

Do not trust caller-provided content.

## Suggested File Structure

```text
packages/email-builder/
  package.json
  tsconfig.json
  src/
    index.ts

    model/
      EmailPage.ts
      EmailSection.ts
      EmailTable.ts
      EmailBlock.ts

    render/
      renderPageHtml.ts
      renderSectionHtml.ts
      renderBlockHtml.ts
      renderTableHtml.ts
      renderPageText.ts
      renderTableText.ts

    styles/
      EmailTheme.ts
      defaultEmailTheme.ts

    utils/
      escapeHtml.ts

    __tests__/
      EmailPage.test.ts
      EmailTable.test.ts
      escapeHtml.test.ts
```

## Public Exports

From `src/index.ts`, export:

```ts
export { EmailPage } from "./model/EmailPage";
export { EmailSection } from "./model/EmailSection";
export { EmailTable } from "./model/EmailTable";

export type { EmailTheme } from "./styles/EmailTheme";
export { defaultEmailTheme } from "./styles/defaultEmailTheme";
```

## Example Usage File

Create an example file:

```text
packages/email-builder/examples/import-summary.ts
```

Example:

```ts
import { EmailPage, EmailSection, EmailTable } from "../src";

const results = [
  {
    fileName: "claims_001.xml",
    recordCount: 1250,
    errorCount: 0,
    status: "Completed",
  },
  {
    fileName: "claims_002.xml",
    recordCount: 300,
    errorCount: 4,
    status: "Completed with warnings",
  },
];

const table = new EmailTable()
  .addHeader(["File", "Records", "Errors", "Status"]);

for (const result of results) {
  table.addRow([
    result.fileName,
    result.recordCount,
    result.errorCount,
    result.status,
  ]);
}

const page = new EmailPage({
  title: "Daily Import Summary",
  previewText: "2 files processed, 1 with warnings",
});

page.addSection(
  new EmailSection("Import Results")
    .addParagraph("The following files were processed today.")
    .addTable(table)
    .addButton("View Dashboard", "https://cmplatform.dev")
);

console.log(page.renderHtml());
console.log(page.renderText());
```

## Tests

Add tests for:

### EmailPage

* renders valid full HTML document
* includes title
* includes preview text
* includes sections in order
* renders plain text

### EmailSection

* renders heading
* renders paragraph
* renders button
* renders divider
* renders table

### EmailTable

* supports headers
* supports multiple rows
* supports numbers and strings
* handles null/undefined cells safely
* renders text version

### escapeHtml

Verify escaping for:

```text
&
<
>
"
'
```

Example:

```ts
expect(escapeHtml("<script>alert('x')</script>"))
  .toBe("&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;");
```

## Implementation Sequence

### Step 1: Create package shell

Create the package folder, TypeScript config, and exports.

### Step 2: Add theme model

Create `EmailTheme` and `defaultEmailTheme`.

### Step 3: Add escaping utility

Create `escapeHtml` and tests.

### Step 4: Implement EmailTable

Implement:

* constructor
* `addHeader`
* `addRow`
* `renderHtml`
* `renderText`

Keep table rendering simple but email-safe.

### Step 5: Implement EmailSection

Implement fluent methods:

* `addHeading`
* `addParagraph`
* `addButton`
* `addDivider`
* `addTable`

### Step 6: Implement EmailPage

Implement:

* page shell
* preheader text
* max-width centered container
* section rendering
* HTML rendering
* plain-text rendering

### Step 7: Add example

Create an import-summary example that demonstrates iterating over a result set and adding table rows.

### Step 8: Add tests

Add meaningful tests around HTML and text output.

### Step 9: Integrate with application later

Do not send email in this package.

This package should only build/render email content.

A separate service can later use the generated `html` and `text` values with Resend, Nodemailer, SendGrid, Mailgun, or SMTP.

## Acceptance Criteria

The work is complete when:

1. Application code can create an email using `EmailPage`, `EmailSection`, and `EmailTable`.
2. No caller needs to write raw HTML.
3. The page renders a complete responsive HTML email document.
4. The page renders a plain-text alternative.
5. Tables can be created by adding headers and rows programmatically.
6. Result-set iteration is demonstrated in an example.
7. Text content is HTML-escaped.
8. Unit tests cover core rendering behavior.
9. The package has a clean public API.
10. The implementation avoids Bootstrap as a runtime dependency.

## Notes

The prior Java implementation used Bootstrap to avoid solving responsiveness in every bit of HTML. Preserve that design goal, but implement responsiveness inside the email renderer instead of relying on Bootstrap.

The main abstraction to preserve is:

```text
Page owns responsive layout.
Sections organize content.
Blocks represent business-level email content.
Renderer handles email-safe HTML.
```
