import assert from 'node:assert/strict'
import test from 'node:test'

import {
  getSuggestedJobOrderWorkspaceStage,
  isQaClearedForFinalization,
} from './jobOrderWorkspaceStage.mjs'

const readyJob = {
  status: 'ready_for_qa',
  assignedTechnicianIds: ['technician-1'],
  progressEntries: [{ id: 'progress-1' }],
  photos: [{ id: 'photo-1' }],
  invoiceRecord: null,
}

test('pending QA work remains in the QA handoff stage', () => {
  assert.equal(
    getSuggestedJobOrderWorkspaceStage(readyJob, 'overview', {
      status: 'pending_review',
      reviewerVerdict: 'pending',
    }),
    'qa',
  )
})

test('passed and overridden QA work opens finalization', () => {
  for (const status of ['passed', 'overridden']) {
    const gate = { status, reviewerVerdict: 'passed' }
    assert.equal(isQaClearedForFinalization(gate), true)
    assert.equal(getSuggestedJobOrderWorkspaceStage(readyJob, 'overview', gate), 'finalize')
  }
})

test('a gate status alone cannot bypass the reviewer verdict', () => {
  const gate = { status: 'passed', reviewerVerdict: 'pending' }
  assert.equal(isQaClearedForFinalization(gate), false)
  assert.equal(getSuggestedJobOrderWorkspaceStage(readyJob, 'overview', gate), 'qa')
})
