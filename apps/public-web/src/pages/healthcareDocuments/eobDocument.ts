export type EobParty = {
  name?: string | null;
  identifier?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  cityStateZip?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
};

export type EobSummary = {
  patientName?: string | null;
  accountNumber?: string | null;
  memberId?: string | null;
  claimStatus?: string | null;
  icn?: string | null;
  moa?: string | null;
  patientResponsibility?: number | null;
  patientResponsibilityNote?: string | null;
};

export type EobServiceLineAdjustment = {
  groupCode?: string | null;
  reasonCode?: string | null;
  amount?: number | null;
  quantity?: number | null;
};

export type EobServiceLine = {
  serviceLineNumber: string;
  healthCareRemarks: string[];
  dateOfService?: string | null;
  procedureOrModifier?: string | null;
  servicesRendered?: number | null;
  amountBilled?: number | null;
  amountAllowed?: number | null;
  deductible?: number | null;
  coinsurance?: number | null;
  paidToProvider?: number | null;
  adjustments: EobServiceLineAdjustment[];
};

export type EobClaimTotals = {
  amountBilled?: number | null;
  amountAllowed?: number | null;
  deductible?: number | null;
  coinsurance?: number | null;
  paidToProvider?: number | null;
  adjustmentAmount?: number | null;
};

export type EobClaimTotalAdjustments = {
  previouslyPaid?: number | null;
  interest?: number | null;
  lateFilingCharge?: number | null;
  netPaidToProvider?: number | null;
};

export type EobReference = {
  identification?: string | null;
  qualifier?: string | null;
  description?: string | null;
};

export type EobCodeDescription = {
  code: string;
  description?: string | null;
};

export type EobTechnicalInfo = {
  sourceFilename?: string | null;
  sourceDocumentId?: string | null;
  sourceSha256?: string | null;
  generatedAt?: string | null;
  documentId?: string | null;
  parserVersion?: string | null;
};

export type EobDocument = {
  documentId: string;
  generatedAt: string;
  payer: EobParty;
  provider: EobParty;
  summary: EobSummary;
  serviceLines: EobServiceLine[];
  claimTotals: EobClaimTotals;
  claimTotalAdjustments: EobClaimTotalAdjustments;
  otherClaimIdentifiers: EobReference[];
  healthCareRemarks: EobCodeDescription[];
  claimAdjustmentReasons: EobCodeDescription[];
  remittanceAdviceRemarks: EobCodeDescription[];
  technical: EobTechnicalInfo;
};

export const stubEobDocument: EobDocument = {
  documentId: "stub-eob-835-001",
  generatedAt: "2026-08-06T12:00:00Z",
  payer: {
    name: "Sample Health Plan",
    identifier: "PAYER-0001",
    addressLine1: "100 Benefits Way",
    addressLine2: "Suite 200",
    cityStateZip: "Columbus, OH 43004",
    contactName: "Provider Services",
    contactPhone: "800-555-0100"
  },
  provider: {
    name: "CM Platform Clinic",
    identifier: "PROVIDER-0001",
    addressLine1: "200 Care Center Drive",
    cityStateZip: "Akron, OH 44308",
    contactName: "Billing Office",
    contactPhone: "800-555-0101"
  },
  summary: {
    patientName: "Sample Patient",
    accountNumber: "ACCT-000123",
    memberId: "MEMBER-00001",
    claimStatus: "Processed as primary",
    icn: "ICN-2026-0001",
    moa: "MA01",
    patientResponsibility: 25,
    patientResponsibilityNote: "Patient responsibility is shown from claim-level adjudication data."
  },
  serviceLines: [
    {
      serviceLineNumber: "1",
      healthCareRemarks: ["M15"],
      dateOfService: "2026-07-15",
      procedureOrModifier: "99213",
      servicesRendered: 1,
      amountBilled: 150,
      amountAllowed: 115,
      deductible: 10,
      coinsurance: 15,
      paidToProvider: 90,
      adjustments: [
        { groupCode: "PR", reasonCode: "1", amount: 10, quantity: 0 },
        { groupCode: "CO", reasonCode: "45", amount: 35, quantity: 0 }
      ]
    },
    {
      serviceLineNumber: "2",
      healthCareRemarks: ["N30"],
      dateOfService: "2026-07-15",
      procedureOrModifier: "80053",
      servicesRendered: 1,
      amountBilled: 80,
      amountAllowed: 64,
      deductible: 0,
      coinsurance: 0,
      paidToProvider: 64,
      adjustments: [{ groupCode: "CO", reasonCode: "45", amount: 16, quantity: 0 }]
    }
  ],
  claimTotals: {
    amountBilled: 230,
    amountAllowed: 179,
    deductible: 10,
    coinsurance: 15,
    paidToProvider: 154,
    adjustmentAmount: 51
  },
  claimTotalAdjustments: {
    previouslyPaid: 0,
    interest: 0,
    lateFilingCharge: 0,
    netPaidToProvider: 154
  },
  otherClaimIdentifiers: [
    {
      identification: "PCN-000123",
      qualifier: "1K",
      description: "Payer claim control number"
    },
    {
      identification: "TRACE-000456",
      qualifier: "TRN",
      description: "Payment trace number"
    }
  ],
  healthCareRemarks: [
    {
      code: "M15",
      description: "A billed service was evaluated with related services for this claim."
    },
    {
      code: "N30",
      description: "Payment reflects plan coverage rules for this service line."
    }
  ],
  claimAdjustmentReasons: [
    { code: "PR-1", description: "Patient deductible amount" },
    { code: "CO-45", description: "Charge exceeds the allowed amount" }
  ],
  remittanceAdviceRemarks: [
    {
      code: "MA01",
      description: "Claim payment information is available for review."
    }
  ],
  technical: {
    sourceFilename: "sample-835.edi",
    sourceDocumentId: "source-835-sample-001",
    sourceSha256: "sha256:0000000000000000000000000000000000000000000000000000000000000000",
    generatedAt: "2026-08-06T12:00:00Z",
    documentId: "stub-eob-835-001",
    parserVersion: "stub"
  }
};
