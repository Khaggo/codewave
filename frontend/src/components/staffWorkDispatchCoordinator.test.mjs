import assert from 'node:assert/strict'
import test from 'node:test'

import { createStaffWorkDispatchCoordinator } from './staffWorkDispatchCoordinator.mjs'

test('rapid dispatch attempts permit only one in-flight request', () => {
  const coordinator = createStaffWorkDispatchCoordinator()
  const first = coordinator.begin()

  assert.ok(first)
  assert.equal(coordinator.begin(), null)
  assert.equal(coordinator.begin(), null)
  assert.equal(coordinator.isPending(), true)
  assert.equal(coordinator.isCurrent(first), true)
})

test('finishing the current request allows the next dispatch', () => {
  const coordinator = createStaffWorkDispatchCoordinator()
  const first = coordinator.begin()

  assert.equal(coordinator.finish(first), true)
  const second = coordinator.begin()
  assert.ok(second)
  assert.notEqual(second.requestId, first.requestId)
})

test('invalidated and stale requests cannot complete current work', () => {
  const coordinator = createStaffWorkDispatchCoordinator()
  const stale = coordinator.begin()
  coordinator.invalidate()
  const current = coordinator.begin()

  assert.equal(coordinator.isCurrent(stale), false)
  assert.equal(coordinator.finish(stale), false)
  assert.equal(coordinator.isCurrent(current), true)
  assert.equal(coordinator.isPending(), true)
})
