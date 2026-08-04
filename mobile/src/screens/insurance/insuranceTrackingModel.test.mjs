import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInsuranceTrackingStorageKey,
  getRememberedInsuranceInquiryId,
  parseRememberedInsuranceInquiryMappings,
  selectRecoveredInsuranceInquiry,
  serializeRememberedInsuranceInquiryMappings,
  shouldDiscardRememberedInsuranceInquiry,
  updateRememberedInsuranceInquiryMappings,
} from './insuranceTrackingModel.mjs';

test('insurance resume storage is scoped to the authenticated customer', () => {
  assert.equal(
    buildInsuranceTrackingStorageKey(' customer-1 '),
    'codewave:insurance:remembered-inquiries:customer-1',
  );
  assert.notEqual(
    buildInsuranceTrackingStorageKey('customer-1'),
    buildInsuranceTrackingStorageKey('customer-2'),
  );
});

test('remembered inquiry mappings reject malformed and partial values', () => {
  assert.deepEqual(parseRememberedInsuranceInquiryMappings('{broken'), {});
  assert.deepEqual(
    parseRememberedInsuranceInquiryMappings({
      '': 'inquiry-0',
      'vehicle-1': '',
      'vehicle-2': ' inquiry-2 ',
    }),
    {
      'vehicle-2': 'inquiry-2',
    },
  );
});

test('remembered inquiry mappings round-trip and remove terminal work', () => {
  const activeMappings = updateRememberedInsuranceInquiryMappings({
    mappings: {},
    vehicleId: 'vehicle-1',
    inquiry: {
      id: 'inquiry-1',
      status: 'under_review',
    },
  });

  assert.equal(getRememberedInsuranceInquiryId(activeMappings, 'vehicle-1'), 'inquiry-1');
  assert.deepEqual(
    parseRememberedInsuranceInquiryMappings(
      serializeRememberedInsuranceInquiryMappings(activeMappings),
    ),
    activeMappings,
  );
  assert.deepEqual(
    updateRememberedInsuranceInquiryMappings({
      mappings: activeMappings,
      vehicleId: 'vehicle-1',
      inquiry: {
        id: 'inquiry-1',
        status: 'closed',
      },
    }),
    {},
  );
});

test('tracking recovery prefers the known inquiry, then active work, then history', () => {
  const inquiries = [
    { id: 'closed-1', status: 'closed' },
    { id: 'active-1', status: 'needs_documents' },
    { id: 'cancelled-1', status: 'cancelled' },
  ];

  assert.equal(
    selectRecoveredInsuranceInquiry({
      inquiries,
      knownInquiryId: 'cancelled-1',
    })?.id,
    'cancelled-1',
  );
  assert.equal(
    selectRecoveredInsuranceInquiry({
      inquiries,
      knownInquiryId: 'missing',
    })?.id,
    'active-1',
  );
  assert.equal(
    selectRecoveredInsuranceInquiry({
      inquiries: [{ id: 'closed-1', status: 'closed' }],
    })?.id,
    'closed-1',
  );
});

test('invalid or missing remembered inquiry ids fall back to server recovery', () => {
  assert.equal(shouldDiscardRememberedInsuranceInquiry(400), true);
  assert.equal(shouldDiscardRememberedInsuranceInquiry(404), true);
  assert.equal(shouldDiscardRememberedInsuranceInquiry(401), false);
  assert.equal(shouldDiscardRememberedInsuranceInquiry(500), false);
});
