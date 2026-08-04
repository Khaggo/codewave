import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildInsuranceRequirementSpecs,
  getInsuranceRequirementKey,
} from './insuranceRequirementsModel.mjs';

test('insurance requirement specs deduplicate matching request and tracked inquiry rules', () => {
  assert.deepEqual(
    buildInsuranceRequirementSpecs({
      draft: {
        purpose: 'renewal',
        inquiryType: 'comprehensive',
      },
      latestInquiry: {
        purpose: 'renewal',
        inquiryType: 'comprehensive',
      },
    }),
    [
      {
        key: 'renewal:comprehensive',
        purpose: 'renewal',
        inquiryType: 'comprehensive',
      },
    ],
  );
});

test('insurance requirement specs retain distinct current and draft rule sets', () => {
  assert.deepEqual(
    buildInsuranceRequirementSpecs({
      draft: {
        purpose: 'claim',
        inquiryType: 'comprehensive',
      },
      latestInquiry: {
        purpose: 'renewal',
        inquiryType: 'ctpl',
      },
    }).map((spec) => spec.key),
    ['claim:comprehensive', 'renewal:ctpl'],
  );
});

test('insurance requirement keys reject blank candidate values', () => {
  assert.equal(
    getInsuranceRequirementKey({
      purpose: ' claim ',
      inquiryType: ' ctpl ',
    }),
    'claim:ctpl',
  );
  assert.deepEqual(
    buildInsuranceRequirementSpecs({
      draft: {
        purpose: '',
        inquiryType: 'ctpl',
      },
      latestInquiry: null,
    }),
    [],
  );
});
