import {
  insuranceCasePurposeEnum,
  insuranceDocumentReviewStatusEnum,
  insuranceInquiryStatusEnum,
  insuranceInquiryTypeEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
} from '../../apps/main-service/src/modules/insurance/schemas/insurance.schema';

export const DEMO_INSURANCE_TAG = 'demo.insurance.seed';
export const DEMO_INSURANCE_PASSWORD = 'DemoInsurance123!';

export type DemoInsuranceScenarioKey =
  | 'review-queue'
  | 'missing-documents'
  | 'payment-follow-up'
  | 'overdue-payment'
  | 'renewal-workflow'
  | 'completed-history';

export type DemoInsuranceInquiryType = (typeof insuranceInquiryTypeEnum.enumValues)[number];
export type DemoInsuranceCasePurpose = (typeof insuranceCasePurposeEnum.enumValues)[number];
export type DemoInsuranceInquiryStatus = (typeof insuranceInquiryStatusEnum.enumValues)[number];
export type DemoInsuranceDocumentReviewStatus =
  (typeof insuranceDocumentReviewStatusEnum.enumValues)[number];
export type DemoInsurancePaymentStatus = (typeof insurancePaymentStatusEnum.enumValues)[number];
export type DemoInsuranceRenewalStatus = (typeof insuranceRenewalStatusEnum.enumValues)[number];

type DemoInsuranceInquiryBase = {
  inquiryType: DemoInsuranceInquiryType;
  subject: string;
  description: string;
  status: DemoInsuranceInquiryStatus;
  documentStatus?: DemoInsuranceDocumentReviewStatus;
  paymentStatus?: DemoInsurancePaymentStatus;
  providerName?: string;
  policyNumber?: string;
  paymentDueLabel?: string;
  policyExpiryLabel?: string;
};

type DemoInsuranceNonRenewalInquiry = DemoInsuranceInquiryBase & {
  purpose?: Exclude<DemoInsuranceCasePurpose, 'renewal'>;
  renewalStatus?: Extract<DemoInsuranceRenewalStatus, 'not_applicable'>;
};

type DemoInsuranceRenewalInquiry = DemoInsuranceInquiryBase & {
  purpose: 'renewal';
  status: 'for_renewal';
  renewalStatus: Exclude<DemoInsuranceRenewalStatus, 'not_applicable'>;
  renewalDueLabel?: string;
};

export type DemoInsuranceInquiry =
  | DemoInsuranceNonRenewalInquiry
  | DemoInsuranceRenewalInquiry;

export type DemoInsuranceScenario = {
  key: DemoInsuranceScenarioKey;
  label: string;
  customerEmail: string;
  customerFirstName: string;
  customerLastName: string;
  vehicle: {
    plateNumber: string;
    make: string;
    model: string;
    year: number;
    color: string;
  };
  notes: string;
  inquiries: DemoInsuranceInquiry[];
};

export const DEMO_INSURANCE_SCENARIOS: DemoInsuranceScenario[] = [
  {
    key: 'review-queue',
    label: 'Review queue',
    customerEmail: 'demo.insurance.review@example.com',
    customerFirstName: 'Rafael',
    customerLastName: 'Reyes',
    vehicle: {
      plateNumber: 'DEMOREV001',
      make: 'Toyota',
      model: 'Vios',
      year: 2024,
      color: 'Silver',
    },
    notes: 'Use for submitted and under-review queue checks.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'DEMO_INS_review_submitted',
        description: 'Fresh quotation request waiting for adviser triage.',
        status: 'submitted',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
      {
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'DEMO_INS_review_under_review',
        description: 'Customer already submitted basics and staff is reviewing coverage details.',
        status: 'under_review',
        documentStatus: 'under_verification',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
        providerName: 'Malayan Insurance',
      },
    ],
  },
  {
    key: 'missing-documents',
    label: 'Missing documents',
    customerEmail: 'demo.insurance.documents@example.com',
    customerFirstName: 'Mika',
    customerLastName: 'Dizon',
    vehicle: {
      plateNumber: 'DEMODOC002',
      make: 'Honda',
      model: 'City',
      year: 2023,
      color: 'White',
    },
    notes: 'Use for missing-document reminders and checklist validation.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'DEMO_INS_documents_missing',
        description: 'Quotation cannot move forward until OR/CR and valid ID are uploaded.',
        status: 'needs_documents',
        documentStatus: 'incomplete',
        paymentStatus: 'not_required',
        renewalStatus: 'not_applicable',
      },
    ],
  },
  {
    key: 'payment-follow-up',
    label: 'Payment follow-up',
    customerEmail: 'demo.insurance.payment@example.com',
    customerFirstName: 'Paolo',
    customerLastName: 'Navarro',
    vehicle: {
      plateNumber: 'DEMOPAY003',
      make: 'Mitsubishi',
      model: 'Montero Sport',
      year: 2022,
      color: 'Black',
    },
    notes: 'Use for collections review, proof submission, and reminder actions.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'DEMO_INS_payment_unpaid',
        description: 'Quoted premium sent to customer and awaiting first payment.',
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'unpaid',
        renewalStatus: 'not_applicable',
        providerName: 'Standard Insurance',
        policyNumber: 'STD-DEMO-1003',
        paymentDueLabel: '2026-05-18',
      },
      {
        inquiryType: 'ctpl',
        purpose: 'quotation',
        subject: 'DEMO_INS_payment_proof_submitted',
        description: 'Customer uploaded proof of payment and staff needs to verify it.',
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'proof_submitted',
        renewalStatus: 'not_applicable',
        providerName: 'Standard Insurance',
        policyNumber: 'STD-DEMO-1004',
        paymentDueLabel: '2026-05-16',
      },
    ],
  },
  {
    key: 'overdue-payment',
    label: 'Overdue payment',
    customerEmail: 'demo.insurance.overdue@example.com',
    customerFirstName: 'Olivia',
    customerLastName: 'Santos',
    vehicle: {
      plateNumber: 'DEMOOVD004',
      make: 'Ford',
      model: 'Ranger',
      year: 2021,
      color: 'Blue',
    },
    notes: 'Use for overdue badges, collections urgency, and payment reminder testing.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        purpose: 'quotation',
        subject: 'DEMO_INS_payment_overdue',
        description: 'Approved policy is still unpaid past the promised due date.',
        status: 'payment_pending',
        documentStatus: 'complete',
        paymentStatus: 'overdue',
        renewalStatus: 'not_applicable',
        providerName: 'Pioneer Insurance',
        policyNumber: 'PIO-DEMO-2001',
        paymentDueLabel: '2026-05-10',
      },
    ],
  },
  {
    key: 'renewal-workflow',
    label: 'Renewal workflow',
    customerEmail: 'demo.insurance.renewal@example.com',
    customerFirstName: 'Rina',
    customerLastName: 'Villanueva',
    vehicle: {
      plateNumber: 'DEMOREN005',
      make: 'Hyundai',
      model: 'Tucson',
      year: 2020,
      color: 'Gray',
    },
    notes: 'Use for renewal queue, timing, and awaiting-customer follow-up flows.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        purpose: 'renewal',
        subject: 'DEMO_INS_renewal_due',
        description: 'Policy is entering the renewal window and needs a fresh quotation.',
        status: 'for_renewal',
        documentStatus: 'complete',
        paymentStatus: 'not_required',
        renewalStatus: 'upcoming',
        providerName: 'Prudential Guarantee',
        policyNumber: 'PG-DEMO-3001',
        policyExpiryLabel: '2026-06-15',
        renewalDueLabel: '2026-05-25',
      },
      {
        inquiryType: 'comprehensive',
        purpose: 'renewal',
        subject: 'DEMO_INS_renewal_awaiting_customer',
        description: 'Renewal quote is ready and staff is waiting for customer approval.',
        status: 'for_renewal',
        documentStatus: 'complete',
        paymentStatus: 'not_required',
        renewalStatus: 'awaiting_customer',
        providerName: 'Prudential Guarantee',
        policyNumber: 'PG-DEMO-3002',
        policyExpiryLabel: '2026-05-30',
        renewalDueLabel: '2026-05-20',
      },
    ],
  },
  {
    key: 'completed-history',
    label: 'Completed history',
    customerEmail: 'demo.insurance.history@example.com',
    customerFirstName: 'Carla',
    customerLastName: 'Mendoza',
    vehicle: {
      plateNumber: 'DEMOHIS006',
      make: 'Nissan',
      model: 'Navara',
      year: 2022,
      color: 'Red',
    },
    notes: 'Use for customer insurance history and staff review of completed cases.',
    inquiries: [
      {
        inquiryType: 'comprehensive',
        purpose: 'claim',
        subject: 'DEMO_INS_history_closed',
        description: 'Completed insurance case that should appear in history views.',
        status: 'closed',
        documentStatus: 'complete',
        paymentStatus: 'paid',
        renewalStatus: 'not_applicable',
        providerName: 'Mercantile Insurance',
        policyNumber: 'MER-DEMO-4001',
        policyExpiryLabel: '2027-04-30',
      },
    ],
  },
];

export type InsuranceDemoSummaryRow = {
  email: string;
  password: string;
  vehicleLabel: string;
  scenarioLabel: string;
  notes: string;
  inquiryStatuses: string[];
};

export function buildInsuranceDemoSummary(rows: InsuranceDemoSummaryRow[]) {
  return rows
    .map((row) =>
      [
        `Customer: ${row.email}`,
        `Password: ${row.password}`,
        `Vehicle: ${row.vehicleLabel}`,
        `Scenario: ${row.scenarioLabel}`,
        `Statuses: ${row.inquiryStatuses.join(', ')}`,
        `Notes: ${row.notes}`,
      ].join('\n'),
    )
    .join('\n\n');
}
