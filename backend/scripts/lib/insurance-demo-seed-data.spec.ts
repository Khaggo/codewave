import {
  DEMO_INSURANCE_PASSWORD,
  type DemoInsuranceInquiry,
  DEMO_INSURANCE_SCENARIOS,
  DEMO_INSURANCE_TAG,
  buildInsuranceDemoSummary,
} from './insurance-demo-seed-data';
import {
  insuranceCasePurposeEnum,
  insuranceDocumentReviewStatusEnum,
  insuranceInquiryStatusEnum,
  insuranceInquiryTypeEnum,
  insurancePaymentStatusEnum,
  insuranceRenewalStatusEnum,
} from '../../apps/main-service/src/modules/insurance/schemas/insurance.schema';

const canonicalEnumCoverageSamples: DemoInsuranceInquiry[] = [
  {
    inquiryType: insuranceInquiryTypeEnum.enumValues[0],
    purpose: 'new_application',
    subject: 'DEMO_INS_type_coverage_new_application',
    description: 'Compile-time coverage sample for canonical non-renewal enum values.',
    status: 'approved',
    documentStatus: 'rejected',
    paymentStatus: 'verifying',
    renewalStatus: 'not_applicable',
  },
  {
    inquiryType: insuranceInquiryTypeEnum.enumValues[1],
    purpose: 'renewal',
    subject: 'DEMO_INS_type_coverage_quote_preparing',
    description: 'Compile-time coverage sample for canonical renewal enum values.',
    status: 'for_renewal',
    documentStatus: 'complete',
    paymentStatus: 'not_required',
    renewalStatus: 'quote_preparing',
    renewalDueLabel: '2026-06-01',
  },
];

describe('insurance demo seed definitions', () => {
  it('stays aligned with the canonical insurance schema enums', () => {
    expect(canonicalEnumCoverageSamples).toHaveLength(2);

    const scenarioValues = DEMO_INSURANCE_SCENARIOS.flatMap((scenario) => scenario.inquiries);

    for (const inquiry of scenarioValues) {
      expect(insuranceInquiryTypeEnum.enumValues).toContain(inquiry.inquiryType);
      expect(insuranceInquiryStatusEnum.enumValues).toContain(inquiry.status);
      expect(insuranceDocumentReviewStatusEnum.enumValues).toContain(
        inquiry.documentStatus ?? 'incomplete',
      );
      expect(insurancePaymentStatusEnum.enumValues).toContain(inquiry.paymentStatus ?? 'not_required');
      expect(insuranceRenewalStatusEnum.enumValues).toContain(
        inquiry.renewalStatus ?? 'not_applicable',
      );
      expect(insuranceCasePurposeEnum.enumValues).toContain(inquiry.purpose ?? 'quotation');
    }

    expect(insuranceCasePurposeEnum.enumValues).toEqual(
      expect.arrayContaining(['new_application', 'renewal', 'claim', 'quotation']),
    );
    expect(insuranceRenewalStatusEnum.enumValues).toEqual(
      expect.arrayContaining(['not_applicable', 'quote_preparing', 'quoted', 'awaiting_customer']),
    );
  });

  it('defines multiple tagged demo scenarios that cover the implemented insurance phases', () => {
    expect(DEMO_INSURANCE_TAG).toBe('demo.insurance.seed');
    expect(DEMO_INSURANCE_PASSWORD).toBe('DemoInsurance123!');
    expect(DEMO_INSURANCE_SCENARIOS).toHaveLength(6);
    expect(DEMO_INSURANCE_SCENARIOS.map((scenario) => scenario.key)).toEqual([
      'review-queue',
      'missing-documents',
      'payment-follow-up',
      'overdue-payment',
      'renewal-workflow',
      'completed-history',
    ]);
  });

  it('includes realistic inquiry metadata for later seeding', () => {
    expect(DEMO_INSURANCE_SCENARIOS).toEqual([
      expect.objectContaining({
        key: 'review-queue',
        inquiries: expect.arrayContaining([
          expect.objectContaining({ status: 'submitted', inquiryType: 'comprehensive' }),
          expect.objectContaining({
            status: 'under_review',
            documentStatus: 'under_verification',
          }),
        ]),
      }),
      expect.objectContaining({
        key: 'missing-documents',
        inquiries: [
          expect.objectContaining({
            status: 'needs_documents',
            documentStatus: 'incomplete',
          }),
        ],
      }),
      expect.objectContaining({
        key: 'payment-follow-up',
        inquiries: expect.arrayContaining([
          expect.objectContaining({
            status: 'payment_pending',
            paymentStatus: 'unpaid',
          }),
          expect.objectContaining({
            status: 'payment_pending',
            paymentStatus: 'proof_submitted',
          }),
        ]),
      }),
      expect.objectContaining({
        key: 'overdue-payment',
        inquiries: [
          expect.objectContaining({
            status: 'payment_pending',
            paymentStatus: 'overdue',
          }),
        ],
      }),
      expect.objectContaining({
        key: 'renewal-workflow',
        inquiries: expect.arrayContaining([
          expect.objectContaining({
            status: 'for_renewal',
            renewalStatus: 'upcoming',
            purpose: 'renewal',
          }),
          expect.objectContaining({
            renewalStatus: 'awaiting_customer',
            purpose: 'renewal',
          }),
        ]),
      }),
      expect.objectContaining({
        key: 'completed-history',
        inquiries: [
          expect.objectContaining({
            status: 'closed',
            paymentStatus: 'paid',
            purpose: 'claim',
            renewalStatus: 'not_applicable',
          }),
        ],
      }),
    ]);
  });

  it('keeps renewal metadata phase-coherent across seeded scenarios', () => {
    const renewalScenario = DEMO_INSURANCE_SCENARIOS.find(
      (scenario) => scenario.key === 'renewal-workflow',
    );
    const completedHistoryScenario = DEMO_INSURANCE_SCENARIOS.find(
      (scenario) => scenario.key === 'completed-history',
    );

    expect(renewalScenario).toBeDefined();
    expect(completedHistoryScenario).toBeDefined();

    expect(renewalScenario?.inquiries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          purpose: 'renewal',
          status: 'for_renewal',
          renewalStatus: 'upcoming',
        }),
        expect.objectContaining({
          purpose: 'renewal',
          status: 'for_renewal',
          renewalStatus: 'awaiting_customer',
        }),
      ]),
    );

    expect(completedHistoryScenario?.inquiries).toEqual([
      expect.objectContaining({
        purpose: 'claim',
        status: 'closed',
        paymentStatus: 'paid',
        renewalStatus: 'not_applicable',
      }),
    ]);

    for (const scenario of DEMO_INSURANCE_SCENARIOS) {
      for (const inquiry of scenario.inquiries) {
        if (inquiry.purpose === 'renewal') {
          expect(inquiry.renewalStatus).not.toBe('not_applicable');
        } else {
          expect(inquiry.renewalStatus ?? 'not_applicable').toBe('not_applicable');
        }
      }
    }
  });

  it('builds a printable summary for seeded customers and inquiries', () => {
    const summary = buildInsuranceDemoSummary([
      {
        email: 'demo.insurance.review@example.com',
        password: 'DemoInsurance123!',
        vehicleLabel: '2024 Toyota Vios - DEMO REV 001',
        scenarioLabel: 'Review queue',
        notes: 'Use for submitted and under-review queue checks.',
        inquiryStatuses: ['submitted', 'under_review'],
      },
    ]);

    expect(summary).toContain('Customer: demo.insurance.review@example.com');
    expect(summary).toContain('Password: DemoInsurance123!');
    expect(summary).toContain('Scenario: Review queue');
    expect(summary).toContain('Statuses: submitted, under_review');
    expect(summary).toContain('Notes: Use for submitted and under-review queue checks.');
  });
});
