import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { filterLoyaltyRewards, filterLoyaltyRules } from './loyaltyManagerView.mjs'

const loyaltyManagerSource = readFileSync(new URL('./LoyaltyManager.js', import.meta.url), 'utf8')

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

test('Reward Config stays contained while using the full table width with stable columns', () => {
  assert.match(loyaltyManagerSource, /<div className="min-w-0 space-y-4">/)
  assert.match(loyaltyManagerSource, /className="table-surface min-w-0 w-full max-w-full"/)
  assert.match(
    loyaltyManagerSource,
    /className="table-scroll min-w-0 w-full max-w-full overscroll-x-contain"/,
  )
  assert.match(loyaltyManagerSource, /className="data-table w-full min-w-\[680px\] table-fixed md:min-w-full"/)
  assert.doesNotMatch(loyaltyManagerSource, /className="data-table w-full min-w-\[760px\] table-fixed"/)
  assert.match(
    loyaltyManagerSource,
    /<colgroup>[\s\S]*<col className="w-\[23%\]" \/>[\s\S]*<col className="w-\[18%\]" \/>[\s\S]*<\/colgroup>/,
  )
  assert.match(loyaltyManagerSource, /<th scope="col" className="text-right">Actions<\/th>/)
  assert.match(loyaltyManagerSource, /<div className="flex items-center justify-end gap-1 whitespace-nowrap">/)
  assert.match(loyaltyManagerSource, /aria-label=\{`Edit reward \$\{reward\.name\}`\}/)
})

test('Reward Config keeps loading, disabled, selected, focus, and long content states bounded', () => {
  assert.match(loyaltyManagerSource, /aria-busy=\{state\.status === 'loading' \|\| actionState\.status === 'saving'\}/)
  assert.match(loyaltyManagerSource, /state\.status === 'loading' \? 'Loading reward catalog\.\.\.'/)
  assert.match(loyaltyManagerSource, /aria-selected=\{selected\?\.id === reward\.id\}/)
  assert.match(loyaltyManagerSource, /hover:bg-surface-hover focus-within:bg-surface-hover/)
  assert.match(loyaltyManagerSource, /title=\{reward\.name\}[\s\S]*min-w-0 truncate/)
  assert.match(loyaltyManagerSource, /disabled=\{!isSuperAdmin \|\| actionState\.status === 'saving'\}/)
  assert.match(loyaltyManagerSource, /className="h-16 text-center text-sm text-ink-muted"/)
})
