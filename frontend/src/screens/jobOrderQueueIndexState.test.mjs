import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createIdleJobOrderQueueIndexState,
  createLoadingJobOrderQueueIndexState,
  settleJobOrderQueueIndexState,
} from './jobOrderQueueIndexState.mjs'

test('queue-index loading preserves current rows while clearing stale messages', () => {
  const current = createIdleJobOrderQueueIndexState()
  current.summary.items = [{ id: 'jo-1' }]
  current.summary.message = 'old'
  current.calendar.jobOrderDates = [{ date: '2026-07-29', count: 1 }]
  current.calendar.message = 'old'

  const loading = createLoadingJobOrderQueueIndexState(current)

  assert.equal(loading.summary.status, 'loading')
  assert.equal(loading.summary.items.length, 1)
  assert.equal(loading.summary.message, '')
  assert.equal(loading.calendar.jobOrderDates.length, 1)
  assert.equal(loading.calendar.message, '')
})

test('queue-index settlement keeps summary and calendar failures independent', () => {
  const state = settleJobOrderQueueIndexState({
    summariesResult: {
      status: 'fulfilled',
      value: [{ id: 'jo-1' }],
    },
    calendarResult: {
      status: 'rejected',
      reason: new Error('Calendar unavailable'),
    },
  })

  assert.equal(state.summary.status, 'success')
  assert.equal(state.summary.items.length, 1)
  assert.equal(state.calendar.status, 'error')
  assert.equal(state.calendar.message, 'Calendar unavailable')
})

test('queue-index empty responses use bounded empty-state guidance', () => {
  const state = settleJobOrderQueueIndexState({
    summariesResult: { status: 'fulfilled', value: [] },
    calendarResult: {
      status: 'fulfilled',
      value: { jobOrderDates: [], bookingQueueDates: [] },
    },
  })

  assert.match(state.summary.message, /No job orders/)
  assert.match(state.calendar.message, /No job-order or booking-handoff dates/)
})
