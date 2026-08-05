import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeCustomerLoyaltyEarningPolicy } from './loyaltyEarningPolicy.mjs'

test('normalizes customer-safe earning policy and preserves explicit exclusions', () => {
  assert.deepEqual(
    normalizeCustomerLoyaltyEarningPolicy({
      summary: 'Earn points after eligible paid services are settled.',
      requirements: [
        {
          formula: 'Earn 1 point for every PHP 100.00 paid.',
          eligibility: 'The service invoice must be settled.',
        },
        null,
      ],
      exclusions: ['Accessory purchases are not currently eligible.'],
    }),
    {
      summary: 'Earn points after eligible paid services are settled.',
      requirements: [
        {
          formula: 'Earn 1 point for every PHP 100.00 paid.',
          eligibility: 'The service invoice must be settled.',
        },
      ],
      exclusions: ['Accessory purchases are not currently eligible.'],
    },
  )
})

test('does not invent earning guidance for an empty or malformed response', () => {
  assert.equal(normalizeCustomerLoyaltyEarningPolicy(null), null)
  assert.equal(
    normalizeCustomerLoyaltyEarningPolicy({ requirements: [null], exclusions: [] }),
    null,
  )
})
