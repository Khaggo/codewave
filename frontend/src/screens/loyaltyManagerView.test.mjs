import test from 'node:test'
import assert from 'node:assert/strict'

import { filterLoyaltyRewards, filterLoyaltyRules } from './loyaltyManagerView.mjs'

test('filterLoyaltyRewards matches reward name, type, and status labels', () => {
  const rewards = [
    { name: 'Wheel Alignment', typeLabel: 'Service Voucher', statusLabel: 'Active' },
    { name: 'Brake Discount', typeLabel: 'Discount Coupon', statusLabel: 'Inactive' },
  ]

  assert.deepEqual(filterLoyaltyRewards(rewards, 'discount'), [rewards[1]])
  assert.deepEqual(filterLoyaltyRewards(rewards, 'active'), rewards)
})

test('filterLoyaltyRules matches service rule name, source label, and formula label', () => {
  const rules = [
    { name: 'Service Points', sourceLabel: 'Service', formulaLabel: 'Amount Ratio' },
  ]

  assert.deepEqual(filterLoyaltyRules(rules, 'service'), rules)
  assert.deepEqual(filterLoyaltyRules(rules, 'ratio'), rules)
  assert.deepEqual(filterLoyaltyRules(rules, 'flat'), [])
})
