import assert from 'node:assert/strict'
import test from 'node:test'

import { getCollectionsWorkflowGuidance } from './CollectionsWorkflowView.mjs'

test('collections workflow guidance keeps the panel locked until a case is selected', () => {
  assert.deepEqual(getCollectionsWorkflowGuidance(), {
    headline: 'Pick a collections case first',
    detail: 'The workflow panel unlocks after you choose a live collections case from the queue.',
    tone: 'neutral',
  })
})

test('collections workflow guidance keeps terminal cases read only', () => {
  const guidance = getCollectionsWorkflowGuidance({
    isTerminalInquiry: true,
    selectedInquiry: { id: 'inq-closed' },
  })

  assert.equal(guidance.headline, 'This case is read only')
  assert.match(guidance.detail, /cannot be edited here/i)
  assert.equal(guidance.tone, 'neutral')
})

test('collections workflow guidance prioritizes overdue follow-up', () => {
  const guidance = getCollectionsWorkflowGuidance({
    selectedActionState: { canSendPaymentReminder: true },
    selectedInquiry: { id: 'inq-overdue' },
    selectedRow: { daysOverdue: 3 },
  })

  assert.equal(guidance.headline, 'This case still needs collections follow-up')
  assert.match(guidance.detail, /3 days overdue/i)
  assert.equal(guidance.tone, 'warning')
})

test('collections workflow guidance highlights proof ready for review', () => {
  const guidance = getCollectionsWorkflowGuidance({
    selectedActionState: { canReviewProofOfPayment: true },
    selectedInquiry: { id: 'inq-proof' },
    selectedRow: { daysOverdue: 0 },
  })

  assert.equal(guidance.headline, 'Proof is ready for review')
  assert.match(guidance.detail, /start verification/i)
  assert.equal(guidance.tone, 'positive')
})
