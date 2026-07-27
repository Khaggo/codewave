import assert from 'node:assert/strict'
import test from 'node:test'

import { getStaffWorkQueueCapacityState } from './staffWorkQueueCapacity.mjs'

test('multi-work capacity remains open while held claims are below the queue limit', () => {
  const state = getStaffWorkQueueCapacityState({
    capacity: 12,
    activeClaimCount: 3,
    activeClaims: [{ id: 'claim-1' }, { id: 'claim-2' }, { id: 'claim-3' }],
  })

  assert.equal(state.hasCapacity, true)
  assert.equal(state.remainingCapacity, 9)
  assert.equal(state.activeClaims.length, 3)
})

test('multi-work capacity closes only when the configured queue limit is reached', () => {
  const state = getStaffWorkQueueCapacityState({
    capacity: 6,
    activeClaimCount: 6,
    activeClaims: Array.from({ length: 6 }, (_, index) => ({ id: `claim-${index}` })),
  })

  assert.equal(state.hasCapacity, false)
  assert.equal(state.remainingCapacity, 0)
})

test('legacy singular claim responses remain compatible during rollout', () => {
  const currentClaim = { id: 'legacy-claim' }
  const state = getStaffWorkQueueCapacityState({ currentClaim })

  assert.deepEqual(state.activeClaims, [currentClaim])
  assert.equal(state.capacity, 1)
  assert.equal(state.activeClaimCount, 1)
})
