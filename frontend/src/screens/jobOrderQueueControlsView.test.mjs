import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildJobOrderQueueDateSummary,
  buildJobOrderQueueEmptyMessage,
  getHandoffCandidateSelectionState,
} from './jobOrderQueueControlsView.mjs'

test('handoff selection state is keyed by booking id', () => {
  assert.deepEqual(
    getHandoffCandidateSelectionState({ bookingId: 'booking-1' }, 'booking-1'),
    {
      isSelected: true,
      badgeLabel: 'Selected source',
    },
  )
  assert.deepEqual(
    getHandoffCandidateSelectionState({ bookingId: 'booking-2' }, 'booking-1'),
    {
      isSelected: false,
      badgeLabel: 'Confirmed source',
    },
  )
})

test('queue date summaries pluralize records and include active handoffs', () => {
  assert.equal(
    buildJobOrderQueueDateSummary({
      jobOrderCount: 1,
      bookingQueueCount: 2,
    }),
    '1 job order / 2 queue',
  )
  assert.equal(
    buildJobOrderQueueDateSummary({
      jobOrderCount: 3,
      bookingQueueCount: 2,
    }, 'history'),
    '3 job orders',
  )
})

test('queue date empty copy distinguishes active work from history', () => {
  assert.equal(
    buildJobOrderQueueEmptyMessage('history', '2026-07'),
    'No finalized or cancelled job orders are marked for 2026-07 yet.',
  )
  assert.equal(
    buildJobOrderQueueEmptyMessage('active', '2026-07'),
    'No job-order or booking-handoff dates are marked for 2026-07 yet.',
  )
})
