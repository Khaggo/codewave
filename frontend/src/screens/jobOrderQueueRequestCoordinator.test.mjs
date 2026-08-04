import test from 'node:test'
import assert from 'node:assert/strict'

import { createJobOrderQueueRequestCoordinator } from './jobOrderQueueRequestCoordinator.mjs'

test('starting a new queue-index request aborts the previous request', () => {
  const coordinator = createJobOrderQueueRequestCoordinator()
  const first = coordinator.begin()
  const second = coordinator.begin()

  assert.equal(first.signal.aborted, true)
  assert.equal(coordinator.isCurrent(first), false)
  assert.equal(coordinator.isCurrent(second), true)
})

test('disposing queue-index coordination invalidates active work', () => {
  const coordinator = createJobOrderQueueRequestCoordinator()
  const token = coordinator.begin()

  coordinator.dispose()

  assert.equal(token.signal.aborted, true)
  assert.equal(coordinator.isCurrent(token), false)
})
