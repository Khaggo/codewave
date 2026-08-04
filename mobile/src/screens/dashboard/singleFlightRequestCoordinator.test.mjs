import assert from 'node:assert/strict'
import test from 'node:test'

import { createSingleFlightRequestCoordinator } from './singleFlightRequestCoordinator.mjs'

test('a second operation cannot start while the first operation is active', () => {
  const coordinator = createSingleFlightRequestCoordinator()
  const first = coordinator.begin('customer-a')

  assert.ok(first)
  assert.equal(coordinator.isBusy(), true)
  assert.equal(coordinator.begin('customer-a'), null)
  assert.equal(coordinator.isCurrent(first), true)
})

test('completing the active operation permits the next operation', () => {
  const coordinator = createSingleFlightRequestCoordinator()
  const first = coordinator.begin('customer-a')

  assert.equal(coordinator.complete(first), true)
  assert.equal(coordinator.isBusy(), false)

  const second = coordinator.begin('customer-a')
  assert.ok(second)
  assert.notEqual(second.requestId, first.requestId)
})

test('invalidating a session makes its in-flight operation stale', () => {
  const coordinator = createSingleFlightRequestCoordinator()
  const token = coordinator.begin('customer-a')

  coordinator.invalidate()

  assert.equal(coordinator.isBusy(), false)
  assert.equal(coordinator.isCurrent(token), false)
  assert.equal(coordinator.complete(token), false)
})

test('only the matching active operation can complete the flight', () => {
  const coordinator = createSingleFlightRequestCoordinator()
  const active = coordinator.begin('customer-a')
  const stale = {
    sessionKey: active.sessionKey,
    requestId: active.requestId - 1,
  }

  assert.equal(coordinator.complete(stale), false)
  assert.equal(coordinator.isBusy(), true)
  assert.equal(coordinator.complete(active), true)
  assert.equal(coordinator.isBusy(), false)
})
