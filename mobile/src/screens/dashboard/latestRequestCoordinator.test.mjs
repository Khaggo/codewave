import assert from 'node:assert/strict'
import test from 'node:test'

import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'

test('a newer entity session makes the previous response stale', () => {
  const coordinator = createLatestRequestCoordinator()
  const first = coordinator.begin('customer-a')
  const second = coordinator.begin('customer-b')

  assert.equal(first.signal?.aborted, true)
  assert.equal(coordinator.isCurrent(first), false)
  assert.equal(coordinator.isCurrent(second), true)
})

test('refreshing the same entity session invalidates the older request', () => {
  const coordinator = createLatestRequestCoordinator()
  const first = coordinator.begin('customer-a')
  const second = coordinator.begin('customer-a')

  assert.equal(coordinator.isCurrent(first), false)
  assert.equal(coordinator.isCurrent(second), true)
})

test('invalidating request work prevents late state commits', () => {
  const coordinator = createLatestRequestCoordinator()
  const token = coordinator.begin('customer-a')

  coordinator.invalidate()

  assert.equal(token.signal?.aborted, true)
  assert.equal(coordinator.isCurrent(token), false)
})

test('disposing a coordinator aborts its active request', () => {
  const coordinator = createLatestRequestCoordinator()
  const token = coordinator.begin('customer-a')

  coordinator.dispose()

  assert.equal(token.signal?.aborted, true)
  assert.equal(coordinator.isCurrent(token), false)
})
