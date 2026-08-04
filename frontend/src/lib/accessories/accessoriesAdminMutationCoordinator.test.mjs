import assert from 'node:assert/strict'
import test from 'node:test'

import { createAccessoryAdminMutationCoordinator } from './accessoriesAdminMutationCoordinator.mjs'

test('serializes rapid admin mutations before UI state can update', () => {
  const coordinator = createAccessoryAdminMutationCoordinator()
  const first = coordinator.begin('stock-adjustment')
  assert.ok(first)
  assert.equal(coordinator.begin('stock-adjustment'), null)
  assert.equal(coordinator.begin('publish'), null)

  coordinator.finish(first)
  assert.ok(coordinator.begin('publish'))
})

test('stale completions cannot release a newer mutation', () => {
  const coordinator = createAccessoryAdminMutationCoordinator()
  const first = coordinator.begin('first')
  coordinator.invalidate()
  const second = coordinator.begin('second')

  coordinator.finish(first)
  assert.equal(coordinator.isCurrent(second), true)
})
