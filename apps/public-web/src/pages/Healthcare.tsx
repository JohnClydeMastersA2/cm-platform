import { useEffect, useMemo, useState } from "react";
import { BackToTop } from "../components/BackToTop";
import { StatusMessage } from "../components/StatusMessage";
import { formatDate } from "../lib/date";
import { csrfFetch, readError } from "../lib/http";
import type { FormState } from "../types/forms";

type HealthcareCapabilities = {
  service: string;
  supportedFamilies: string[];
  supportedDocumentTypes: string[];
  capabilities: string[];
};

type SourceDocument = {
  sourceId: string;
  displayName: string;
  title: string;
  filename: string;
  documentType: string;
  sha256: string;
  sourceName: string;
  sourceUrl: string;
  description: string;
  primaryTestValue: string;
  deidentified: boolean;
};

type ArchivedHealthcareDocument = {
  id: string;
  filename: string;
  documentType: string;
  sourceDocumentId: string;
  sourceSha256: string;
  parserVersion: string;
  status: string;
  originalArtifactId: string;
  transformedArtifactId: string;
  createdAt: string;
  updatedAt: string;
  warnings: string[];
  errors: string[];
};

const emptyCapabilities: HealthcareCapabilities = {
  service: "healthcare-transform",
  supportedFamilies: [],
  supportedDocumentTypes: [],
  capabilities: []
};

export function Healthcare() {
  const [capabilities, setCapabilities] = useState<HealthcareCapabilities>(emptyCapabilities);
  const [sourceDocuments, setSourceDocuments] = useState<SourceDocument[]>([]);
  const [processedDocument, setProcessedDocument] = useState<ArchivedHealthcareDocument | null>(null);
  const [transformedJson, setTransformedJson] = useState<unknown | null>(null);
  const [activeSourceId, setActiveSourceId] = useState<string | null>(null);
  const [activeJsonDocumentId, setActiveJsonDocumentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState<FormState>({ status: "idle" });

  useEffect(() => {
    void loadHealthcareOverview();
  }, []);

  const selectedSource = useMemo(
    () => sourceDocuments.find((document) => document.sourceId === processedDocument?.sourceDocumentId) ?? null,
    [processedDocument, sourceDocuments]
  );

  async function loadHealthcareOverview() {
    setIsLoading(true);
    setFormState({ status: "idle" });

    try {
      const [capabilitiesResponse, sourceDocumentsResponse] = await Promise.all([
        fetch("/healthcare/documents/capabilities"),
        fetch("/healthcare/source-documents")
      ]);

      if (!capabilitiesResponse.ok) {
        throw new Error(await readError(capabilitiesResponse, "Unable to load healthcare capabilities"));
      }

      if (!sourceDocumentsResponse.ok) {
        throw new Error(await readError(sourceDocumentsResponse, "Unable to load curated healthcare source documents"));
      }

      setCapabilities((await capabilitiesResponse.json()) as HealthcareCapabilities);
      setSourceDocuments((await sourceDocumentsResponse.json()) as SourceDocument[]);
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load healthcare transform service."
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function processSourceDocument(sourceId: string) {
    setActiveSourceId(sourceId);
    setFormState({ status: "submitting" });
    setTransformedJson(null);
    setActiveJsonDocumentId(null);

    try {
      const response = await csrfFetch(`/healthcare/source-documents/${encodeURIComponent(sourceId)}/process`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to process curated 835 source document"));
      }

      const body = (await response.json()) as ArchivedHealthcareDocument;
      const sourceDocument = sourceDocuments.find((document) => document.sourceId === sourceId);
      setProcessedDocument(body);
      setFormState({
        status: "success",
        message: `Processed ${sourceDocument?.displayName ?? body.filename} and archived document ${body.id}.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to process curated 835 source document."
      });
    } finally {
      setActiveSourceId(null);
    }
  }

  async function loadTransformedJson(documentId: string) {
    setActiveJsonDocumentId(documentId);
    setFormState({ status: "submitting" });

    try {
      const response = await fetch(`/healthcare/documents/${encodeURIComponent(documentId)}/json`);

      if (!response.ok) {
        throw new Error(await readError(response, "Unable to load transformed JSON"));
      }

      setTransformedJson(await response.json());
      setFormState({
        status: "success",
        message: `Loaded transformed JSON for archive document ${documentId}.`
      });
    } catch (err) {
      setFormState({
        status: "error",
        message: err instanceof Error ? err.message : "Unable to load transformed JSON."
      });
    } finally {
      setActiveJsonDocumentId(null);
    }
  }

  return (
    <div className="platform-overview queue-panel healthcare-panel">
      <section className="platform-hero">
        <div>
          <div className="platform-kicker">Healthcare Transform Microservice</div>
          <h1 className="h3 mb-2">Healthcare Transform</h1>
          <p className="platform-lede">
            This page explores how CM Platform can incorporate technology that does not fit squarely within
            its existing topology. Healthcare Transform introduces a Java and Spring Boot microservice while
            preserving the workspace&apos;s established organization, integration patterns, and overall intent.
          </p>
          <p className="platform-lede">
            The service accepts ASC X12 healthcare documents, transforms their data into JSON, and stores both
            the original document and transformed result in MongoDB. This creates an archive of each
            submission while allowing the transformed data to be searched and used by other platform
            capabilities.
          </p>
          <p className="platform-lede">
            The current implementation focuses on the X12 835 remittance advice, with support for additional
            document types such as the 837, 270, and 271 planned for future work. NEMSIS XML is also under
            consideration, so the service may eventually support healthcare formats beyond X12.
          </p>
          <p className="platform-lede mb-0">
            Because healthcare documents can contain protected health information, public file uploads are
            intentionally rejected. The curated 835 samples available here contain no PHI or PII and can be
            processed safely. Upload support remains part of the service for developers running CM Platform
            in their own controlled environments.
          </p>
        </div>
        <div className="platform-stack">
          <StackRow label="Service" value={capabilities.service} />
          <StackRow label="Families" value={formatList(capabilities.supportedFamilies)} />
          <StackRow label="Document types" value={formatList(capabilities.supportedDocumentTypes)} />
          <StackRow label="Public uploads" value="Disabled" />
        </div>
      </section>

      <StatusMessage state={formState} />

      <section className="card shadow-sm">
        <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
          <strong>Curated 835 Source Documents</strong>
          <button className="btn btn-sm btn-outline-secondary" type="button" onClick={() => void loadHealthcareOverview()} disabled={isLoading}>
            {isLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
        <div className="table-responsive">
          <table className="table table-hover align-middle mb-0 healthcare-source-table mobile-card-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Sample</th>
                <th>Test value</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sourceDocuments.length ? (
                sourceDocuments.map((document) => (
                  <tr key={document.sourceId}>
                    <td data-label="Source">
                      <strong>{document.title}</strong>
                      <div className="text-muted small">{document.sourceName}</div>
                      <div className="text-muted small">{document.deidentified ? "Deidentified sample" : "Review required"}</div>
                    </td>
                    <td data-label="Sample">
                      <strong>{document.displayName}</strong>
                    </td>
                    <td data-label="Test value">{document.primaryTestValue}</td>
                    <td data-label="Action">
                      <button
                        className="btn btn-sm btn-primary"
                        type="button"
                        onClick={() => void processSourceDocument(document.sourceId)}
                        disabled={formState.status === "submitting"}
                      >
                        {activeSourceId === document.sourceId ? "Processing..." : "Process"}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-muted p-4">
                    No curated healthcare source documents are available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {processedDocument ? (
        <section className="card shadow-sm">
          <div className="card-header d-flex flex-wrap align-items-center justify-content-between gap-2">
            <strong>Latest Archived Result</strong>
            <button
              className="btn btn-sm btn-outline-primary"
              type="button"
              onClick={() => {
                if (transformedJson) {
                  setTransformedJson(null);
                } else {
                  void loadTransformedJson(processedDocument.id);
                }
              }}
              disabled={formState.status === "submitting"}
            >
              {activeJsonDocumentId === processedDocument.id
                ? "Loading JSON..."
                : transformedJson
                  ? "Hide JSON"
                  : "View JSON"}
            </button>
          </div>
          <div className="card-body">
            <div className="healthcare-result-grid">
              <ResultField label="Document ID" value={processedDocument.id} code />
              <ResultField label="Status" value={processedDocument.status} />
              <ResultField label="Filename" value={processedDocument.filename} code />
              <ResultField label="Sample" value={selectedSource?.displayName ?? processedDocument.sourceDocumentId} />
              <ResultField label="Source SHA-256" value={processedDocument.sourceSha256} code />
              <ResultField label="Parser" value={processedDocument.parserVersion} />
              <ResultField label="Created" value={formatDate(processedDocument.createdAt)} />
              <ResultField label="Updated" value={formatDate(processedDocument.updatedAt)} />
            </div>

            <div className="row g-3 mt-1">
              <div className="col-12 col-lg-6">
                <h2 className="h6">Warnings</h2>
                <MessageList items={processedDocument.warnings} emptyText="No parser warnings." />
              </div>
              <div className="col-12 col-lg-6">
                <h2 className="h6">Errors</h2>
                <MessageList items={processedDocument.errors} emptyText="No parser errors." />
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {transformedJson ? (
        <section className="card shadow-sm">
          <div className="card-header">
            <strong>Transformed JSON</strong>
          </div>
          <div className="card-body">
            <pre className="mongodb-document healthcare-json mb-0">{JSON.stringify(transformedJson, null, 2)}</pre>
          </div>
        </section>
      ) : null}

      <BackToTop />
    </div>
  );
}

function StackRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="platform-stack-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultField({ label, value, code = false }: { label: string; value: string; code?: boolean }) {
  return (
    <div className="healthcare-result-field">
      <span>{label}</span>
      {code ? <code>{value}</code> : <strong>{value}</strong>}
    </div>
  );
}

function MessageList({ items, emptyText }: { items: string[]; emptyText: string }) {
  if (!items.length) {
    return <p className="text-muted mb-0">{emptyText}</p>;
  }

  return (
    <ul className="mb-0 text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function formatList(items: string[]): string {
  return items.length ? items.join(", ") : "None reported";
}
