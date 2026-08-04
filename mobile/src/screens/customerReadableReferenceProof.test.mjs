import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatLoyaltyTransactionMeta,
  getReadableLoyaltySourceReference,
} from '../lib/loyaltyPresentation.mjs'

test('loyalty activity prefers customer-readable references over internal source ids', () => {
  assert.equal(
    getReadableLoyaltySourceReference({
      sourceType: 'service_invoice',
      sourceReference: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
      metadata: {
        pointsInput: {
          invoiceReference: ' INV-2026-0008 ',
        },
      },
    }),
    'INV-2026-0008',
  )
  assert.equal(
    getReadableLoyaltySourceReference({
      sourceType: 'reward_redemption',
      sourceReference: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
      metadata: {
        rewardNameSnapshot: 'Free oil change',
      },
    }),
    'Free oil change',
  )
  assert.equal(
    getReadableLoyaltySourceReference({
      sourceType: 'service_invoice',
      sourceReference: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
    }),
    null,
  )
  assert.equal(
    getReadableLoyaltySourceReference({
      sourceType: 'manual_adjustment',
      sourceReference: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
    }),
    'Manual adjustment',
  )
})

test('loyalty activity metadata never falls back to raw source references', () => {
  assert.equal(
    formatLoyaltyTransactionMeta({
      dateLabel: 'Jul 29, 2026',
      sourceReferenceLabel: 'INV-2026-0008',
    }),
    'Jul 29, 2026 - INV-2026-0008',
  )
  assert.equal(
    formatLoyaltyTransactionMeta({
      dateLabel: 'Jul 29, 2026',
      sourceReference: '18e50ca4-cf27-4f31-a9b7-635dca0aba02',
    }),
    'Jul 29, 2026',
  )
})
