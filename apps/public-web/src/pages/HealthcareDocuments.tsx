import { useMemo, useState, type ReactNode } from "react";
import {
  stubEobDocument,
  type EobCodeDescription,
  type EobDocument,
  type EobParty
} from "./healthcareDocuments/eobDocument";

type ViewerTab = "eob" | "remit" | "json" | "technical";

const viewerTabs: Array<{ id: ViewerTab; label: string }> = [
  { id: "eob", label: "EOB" },
  { id: "remit", label: "Remit" },
  { id: "json", label: "JSON" },
  { id: "technical", label: "Technical" }
];

export function HealthcareDocuments() {
  const [activeTab, setActiveTab] = useState<ViewerTab>("eob");
  const selectedDocument = stubEobDocument;
  const selectedDocumentJson = useMemo(() => JSON.stringify(selectedDocument, null, 2), [selectedDocument]);

  return (
    <div className="platform-overview queue-panel healthcare-documents-page">
      <section className="platform-page-heading mb-4">
        <div className="platform-kicker">Healthcare Transform Microservice</div>
        <h1 className="h3">Healthcare Documents</h1>
      </section>

      <section className="platform-section platform-section-block">
        <div className="healthcare-documents-shell">
          <aside className="healthcare-documents-browser" aria-label="Processed healthcare documents">
            <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
              <h2 className="h5 mb-0">Processed Documents</h2>
              <span className="badge text-bg-secondary">Stub</span>
            </div>
            <label className="form-label" htmlFor="healthcare-document-search">
              Search
            </label>
            <input
              id="healthcare-document-search"
              className="form-control form-control-sm mb-3"
              readOnly
              value="Sample Patient"
            />
            <button className="healthcare-document-result active" type="button" aria-current="true">
              <span>
                <strong>{selectedDocument.summary.patientName}</strong>
                <small>{selectedDocument.summary.accountNumber}</small>
              </span>
              <code>{selectedDocument.documentId}</code>
            </button>
          </aside>

          <div className="healthcare-document-workspace">
            <div className="healthcare-document-toolbar">
              <div>
                <h2 className="h5 mb-1">{selectedDocument.summary.patientName}</h2>
                <div className="text-muted small">
                  {selectedDocument.summary.accountNumber} · {selectedDocument.summary.claimStatus}
                </div>
              </div>
              <div className="btn-group btn-group-sm" role="tablist" aria-label="Document views">
                {viewerTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    className={`btn ${activeTab === tab.id ? "btn-primary" : "btn-outline-primary"}`}
                    aria-selected={activeTab === tab.id}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "eob" ? <EobView document={selectedDocument} /> : null}
            {activeTab === "remit" ? <RemitView document={selectedDocument} /> : null}
            {activeTab === "json" ? <pre className="mongodb-document healthcare-document-json">{selectedDocumentJson}</pre> : null}
            {activeTab === "technical" ? <TechnicalView document={selectedDocument} /> : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function EobView({ document }: { document: EobDocument }) {
  return (
    <div className="eob-document" aria-label="Explanation of Benefits preview">
      <div className="eob-heading">
        <div>
          <div className="platform-kicker">Explanation of Benefits</div>
          <h2 className="h4 mb-0">{display(document.payer.name)}</h2>
        </div>
        <div className="text-end">
          <div className="text-muted small">Generated</div>
          <strong>{formatDateTime(document.generatedAt)}</strong>
        </div>
      </div>

      <div className="eob-section-grid">
        <PartySection title="Payer" party={document.payer} />
        <PartySection title="Provider" party={document.provider} />
      </div>

      <EobSection title="Summary">
        <div className="healthcare-result-grid">
          <Field label="Patient" value={document.summary.patientName} />
          <Field label="Account" value={document.summary.accountNumber} />
          <Field label="Member ID" value={document.summary.memberId} />
          <Field label="Claim Status" value={document.summary.claimStatus} />
          <Field label="ICN" value={document.summary.icn} />
          <Field label="MOA" value={document.summary.moa} />
          <Field label="Patient Responsibility" value={formatMoney(document.summary.patientResponsibility)} />
          <Field label="Note" value={document.summary.patientResponsibilityNote} />
        </div>
      </EobSection>

      <EobSection title="Detail">
        <div className="table-responsive">
          <table className="table table-sm align-middle eob-table">
            <thead>
              <tr>
                <th>Line</th>
                <th>Remarks</th>
                <th>Date</th>
                <th>Procedure</th>
                <th>Units</th>
                <th className="text-end">Billed</th>
                <th className="text-end">Allowed</th>
                <th className="text-end">Deductible</th>
                <th className="text-end">Coinsurance</th>
                <th className="text-end">Paid</th>
                <th>Adjustments</th>
              </tr>
            </thead>
            <tbody>
              {document.serviceLines.map((line) => (
                <tr key={line.serviceLineNumber}>
                  <td>{line.serviceLineNumber}</td>
                  <td>{line.healthCareRemarks.join(", ") || "-"}</td>
                  <td>{display(line.dateOfService)}</td>
                  <td>{display(line.procedureOrModifier)}</td>
                  <td>{display(line.servicesRendered)}</td>
                  <td className="text-end">{formatMoney(line.amountBilled)}</td>
                  <td className="text-end">{formatMoney(line.amountAllowed)}</td>
                  <td className="text-end">{formatMoney(line.deductible)}</td>
                  <td className="text-end">{formatMoney(line.coinsurance)}</td>
                  <td className="text-end">{formatMoney(line.paidToProvider)}</td>
                  <td>
                    {line.adjustments.map((adjustment) => (
                      <span className="eob-adjustment-pill" key={`${adjustment.groupCode}-${adjustment.reasonCode}-${adjustment.amount}`}>
                        {display(adjustment.groupCode)}-{display(adjustment.reasonCode)} {formatMoney(adjustment.amount)}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={5}>Claim Totals</th>
                <th className="text-end">{formatMoney(document.claimTotals.amountBilled)}</th>
                <th className="text-end">{formatMoney(document.claimTotals.amountAllowed)}</th>
                <th className="text-end">{formatMoney(document.claimTotals.deductible)}</th>
                <th className="text-end">{formatMoney(document.claimTotals.coinsurance)}</th>
                <th className="text-end">{formatMoney(document.claimTotals.paidToProvider)}</th>
                <th>{formatMoney(document.claimTotals.adjustmentAmount)}</th>
              </tr>
            </tfoot>
          </table>
        </div>
      </EobSection>

      <EobSection title="Adjustments To Claim Totals">
        <div className="healthcare-result-grid">
          <Field label="Previously Paid" value={formatMoney(document.claimTotalAdjustments.previouslyPaid)} />
          <Field label="Interest" value={formatMoney(document.claimTotalAdjustments.interest)} />
          <Field label="Late Filing Charge" value={formatMoney(document.claimTotalAdjustments.lateFilingCharge)} />
          <Field label="Net Paid To Provider" value={formatMoney(document.claimTotalAdjustments.netPaidToProvider)} />
        </div>
      </EobSection>

      <ReferenceSection title="Other Claim Related Identification" references={document.otherClaimIdentifiers} />
      <CodeSection title="Health Care Remarks" codes={document.healthCareRemarks} />
      <CodeSection title="Claim Adjustment Reasons" codes={document.claimAdjustmentReasons} />
      <CodeSection title="Remittance Remark Advice Codes" codes={document.remittanceAdviceRemarks} />
    </div>
  );
}

function RemitView({ document }: { document: EobDocument }) {
  return (
    <div className="eob-document">
      <EobSection title="Remit">
        <div className="healthcare-result-grid">
          <Field label="Payer" value={document.payer.name} />
          <Field label="Provider" value={document.provider.name} />
          <Field label="Trace Number" value={document.otherClaimIdentifiers.find((item) => item.qualifier === "TRN")?.identification} />
          <Field label="Net Paid To Provider" value={formatMoney(document.claimTotalAdjustments.netPaidToProvider)} />
        </div>
      </EobSection>
    </div>
  );
}

function TechnicalView({ document }: { document: EobDocument }) {
  return (
    <div className="eob-document">
      <EobSection title="Technical">
        <div className="healthcare-result-grid">
          <Field label="Source Filename" value={document.technical.sourceFilename} />
          <Field label="Source Document ID" value={document.technical.sourceDocumentId} />
          <Field label="Source SHA-256" value={document.technical.sourceSha256} />
          <Field label="Generated At" value={formatDateTime(document.technical.generatedAt)} />
          <Field label="Document ID" value={document.technical.documentId} />
          <Field label="Parser Version" value={document.technical.parserVersion} />
        </div>
      </EobSection>
    </div>
  );
}

function PartySection({ title, party }: { title: string; party: EobParty }) {
  return (
    <EobSection title={title}>
      <div className="healthcare-result-grid">
        <Field label="Name" value={party.name} />
        <Field label="Identifier" value={party.identifier} />
        <Field label="Address 1" value={party.addressLine1} />
        <Field label="Address 2" value={party.addressLine2} />
        <Field label="City/State/ZIP" value={party.cityStateZip} />
        <Field label="Contact" value={party.contactName} />
        <Field label="Phone" value={party.contactPhone} />
      </div>
    </EobSection>
  );
}

function ReferenceSection({ title, references }: { title: string; references: EobDocument["otherClaimIdentifiers"] }) {
  return (
    <EobSection title={title}>
      <div className="table-responsive">
        <table className="table table-sm align-middle eob-table">
          <thead>
            <tr>
              <th>Identifier</th>
              <th>Qualifier</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {references.map((reference) => (
              <tr key={`${reference.qualifier}-${reference.identification}`}>
                <td>{display(reference.identification)}</td>
                <td>{display(reference.qualifier)}</td>
                <td>{display(reference.description)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EobSection>
  );
}

function CodeSection({ title, codes }: { title: string; codes: EobCodeDescription[] }) {
  return (
    <EobSection title={title}>
      <div className="table-responsive">
        <table className="table table-sm align-middle eob-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code.code}>
                <td>{code.code}</td>
                <td>{display(code.description)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EobSection>
  );
}

function EobSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="eob-section">
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="healthcare-result-field">
      <span>{label}</span>
      <strong>{display(value)}</strong>
    </div>
  );
}

function display(value?: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  return String(value);
}

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) {
    return "-";
  }

  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD"
  });
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
