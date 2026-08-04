import assert from 'node:assert/strict'
import test from 'node:test'

import {
  createEmptyStaffWorkQueueResult,
  normalizeStaffWorkQueueResult,
} from './staffWorkQueueResult.mjs'

test('null queue responses fail closed to an empty bounded result', () => {
  assert.deepEqual(normalizeStaffWorkQueueResult(null), createEmptyStaffWorkQueueResult())
})

test('malformed queue collections are normalized without throwing', () => {
  const result = normalizeStaffWorkQueueResult({
    items: null,
    page: 'invalid',
    summary: null,
    session: { available: true, activeClaims: null },
  })

  assert.deepEqual(result.items, [])
  assert.equal(result.page.hasNext, false)
  assert.equal(result.summary.total, 0)
  assert.equal(result.session.available, true)
  assert.deepEqual(result.session.activeClaims, [])
})

test('oversized queue responses cannot mount more than the client safety limit', () => {
  const result = normalizeStaffWorkQueueResult({
    items: Array.from({ length: 500 }, (_, index) => ({ entityId: `job-${index}` })),
  })

  assert.equal(result.items.length, 25)
  assert.equal(result.items.at(-1).entityId, 'job-24')
})
