import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatServiceItemName,
  getServiceItemState,
} from './jobOrderServiceProgressModel.mjs'

test('service item state follows the latest relevant progress entry', () => {
  const item = { id: 'item-1', isCompleted: false }
  const entries = [
    {
      workItemId: 'item-1',
      entryType: 'issue_found',
      createdAt: '2026-07-27T09:00:00.000Z',
    },
    {
      workItemId: 'item-1',
      entryType: 'work_started',
      createdAt: '2026-07-27T10:00:00.000Z',
    },
  ]

  assert.equal(getServiceItemState(item, entries), 'in_progress')
  assert.equal(getServiceItemState({ ...item, isCompleted: true }, entries), 'completed')
})

test('service item labels hide UUIDs and internal prefixes', () => {
  assert.equal(
    formatServiceItemName({
      name: 'ef7587bf-42d3-4f29-aa7f-9a31ff34a212',
      description: 'Brake inspection',
    }),
    'Brake inspection',
  )
  assert.equal(
    formatServiceItemName({ name: 'QA-ROUTE-CHECKLIST Wheel alignment' }),
    'Wheel alignment',
  )
  assert.equal(formatServiceItemName({}), 'Service item')
})
