import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildHistoryRecordSummary,
  buildHistoryRecordTitle,
  buildInsuranceInquirySubject,
  buildRenewalPrompt,
  formatMissingRequiredDocumentSummary,
  formatWorkflowLabel,
  getInsuranceProcessSteps,
  getPurposeLabel,
  getRequestGuidance,
  inferMimeType,
} from './insuranceInquiryPresentationModel.mjs';

test('insurance guidance and subjects remain purpose-aware and customer-readable', () => {
  assert.match(getRequestGuidance({ purpose: 'renewal' }).sectionHelper, /renewal/i);
  assert.equal(
    buildInsuranceInquirySubject({
      purpose: 'quotation',
      vehicleLabel: '2022 Toyota Vios',
    }),
    'Quotation - 2022 Toyota Vios',
  );
});

test('insurance process steps add only relevant payment and renewal stages', () => {
  const claimSteps = getInsuranceProcessSteps({
    latestInquiry: {
      id: 'inquiry-1',
      purpose: 'claim',
      status: 'under_review',
      paymentStatus: 'not_required',
      renewalStatus: 'not_applicable',
    },
  });
  assert.equal(claimSteps.some((step) => step.key === 'payment'), false);
  assert.equal(claimSteps.some((step) => step.key === 'renewal'), false);

  const renewalSteps = getInsuranceProcessSteps({
    latestInquiry: {
      id: 'inquiry-2',
      purpose: 'renewal',
      status: 'payment_pending',
      paymentStatus: 'awaiting_payment',
      renewalStatus: 'quoted',
    },
  });
  assert.equal(renewalSteps.some((step) => step.key === 'payment'), true);
  assert.equal(renewalSteps.some((step) => step.key === 'renewal'), true);
});

test('insurance document and workflow labels stay deterministic', () => {
  assert.equal(formatWorkflowLabel('awaiting_customer'), 'Awaiting Customer');
  assert.equal(getPurposeLabel('new_application'), 'New');
  assert.equal(getPurposeLabel('unknown'), 'Request');
  assert.equal(inferMimeType('damage-photo.JPEG'), 'image/jpeg');
  assert.equal(
    formatMissingRequiredDocumentSummary([{ label: 'OR/CR' }, { label: 'Policy' }]),
    'OR/CR, Policy',
  );
});

test('insurance renewal and history copy remain customer-safe', () => {
  assert.equal(buildRenewalPrompt({ renewalStatus: 'expired' }).tone, 'danger');
  assert.equal(
    buildHistoryRecordTitle({
      inquiryTypeLabel: 'Comprehensive',
      status: 'under_review',
    }),
    'Comprehensive - Under Review',
  );
  const summary = buildHistoryRecordSummary({
    statusHint: 'Staff review is in progress.',
    updatedAt: '2026-07-29T08:30:00.000Z',
    providerName: 'Example Insurance',
  });
  assert.match(summary, /Staff review is in progress/);
  assert.match(summary, /Provider: Example Insurance/);
});
