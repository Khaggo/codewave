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

test('filterLoyaltyRules matches rule name, source label, and formula label', () => {
  const rules = [
    { name: 'Service Points', sourceLabel: 'Service', formulaLabel: 'Amount Ratio' },
    { name: 'Shop Bonus', sourceLabel: 'E-commerce', formulaLabel: 'Flat Points' },
  ]

  assert.deepEqual(filterLoyaltyRules(rules, 'flat'), [rules[1]])
})
